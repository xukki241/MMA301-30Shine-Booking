const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ROLES } = require("./models/user");
const { installCustomerGuestRoutes } = require("./customer-guest");
const { installCustomerAccountRoutes } = require("./customer-account");
const { installStaffAdminRoutes, createCoreHealthProbe, createCoreAuditProbe } = require("./staff-admin");

function credentials(body, register) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const allowed = register ? ["email", "password", "role"] : ["email", "password"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) return null;
  if (typeof body.email !== "string" || typeof body.password !== "string") return null;
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  // bcrypt consumes at most 72 UTF-8 bytes; never silently truncate.
  if (body.password.length < (register ? 8 : 1) || Buffer.byteLength(body.password, "utf8") > 72) return null;
  if (register && !ROLES.includes(body.role)) return null;
  return { email, password: body.password, role: body.role };
}

function publicUser(user) {
  return { id: String(user._id), email: user.email, role: user.role };
}

function createApp({ users, guests, customers, secret, expiresIn, otpEnabled, otpLogger, staffChangeGuard, coreHealthProbe, coreAuditProbe, coreApiUrl, audit }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "300kb" }));
  app.get("/health", (_req, res) => res.json({ ok: true, service: "auth-service" }));
  installCustomerGuestRoutes(app, { guests, secret, expiresIn, otpEnabled, otpLogger, allowNewGuests: !customers });
  installCustomerAccountRoutes(app, { customers, secret, expiresIn, otpEnabled, otpLogger });
  installStaffAdminRoutes(app, { users, secret, staffChangeGuard, audit,
    coreHealthProbe: coreHealthProbe || (coreApiUrl ? createCoreHealthProbe(coreApiUrl) : null),
    coreAuditProbe: coreAuditProbe || (coreApiUrl ? createCoreAuditProbe(coreApiUrl, secret) : null) });
  app.get("/internal/staff/:id/active-stylist", async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    if (!match) return res.status(401).json({ error: "Internal authentication required" });
    try {
      const claims = jwt.verify(match[1], secret, { algorithms: ["HS256"], issuer: "core-api" });
      if (claims.scope !== "stylist-verify") return res.status(403).json({ error: "Invalid scope" });
      if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
      const user = await users.findById(req.params.id);
      return res.json({ active: Boolean(user && user.role === "stylist" && user.status !== "locked") });
    } catch (error) {
      if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) {
        return res.status(401).json({ error: "Invalid internal token" });
      }
      return next(error);
    }
  });

  app.post("/auth/register", (_req, res) => res.status(410).json({
    error: "Public account registration is closed; customers use /auth/customer/start",
  }));

  app.post("/auth/login", async (req, res, next) => {
    const data = credentials(req.body, false);
    if (!data) return res.status(400).json({ error: "Invalid email or password" });
    try {
      const user = await users.findByEmail(data.email);
      if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
        try { if (audit) await audit.write({ actorId: null, action: "auth.login", targetType: "staff", targetId: null, result: "failed" }); }
        catch { console.error("Auth audit write failed"); }
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!ROLES.includes(user.role) || user.status === "locked") {
        try { if (audit) await audit.write({ actorId: null, action: "auth.login", targetType: "staff", targetId: null, result: "failed" }); }
        catch { console.error("Auth audit write failed"); }
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const accessToken = jwt.sign({ role: user.role, authVersion: user.authVersion || 0 }, secret, {
        algorithm: "HS256", subject: String(user._id), expiresIn,
      });
      res.set("Cache-Control", "no-store");
      return res.json({ accessToken, tokenType: "Bearer", expiresIn, user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: "Invalid request" });
    return res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
module.exports = { createApp };
