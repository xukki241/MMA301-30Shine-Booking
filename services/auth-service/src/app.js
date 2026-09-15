const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ROLES } = require("./models/user");

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

function createApp({ users, secret, expiresIn }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_req, res) => res.json({ ok: true, service: "auth-service" }));

  app.post("/auth/register", async (req, res, next) => {
    const data = credentials(req.body, true);
    if (!data) return res.status(400).json({ error: "Invalid email, password or role" });
    try {
      if (await users.findByEmail(data.email)) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await users.create({ email: data.email, passwordHash, role: data.role });
      return res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      // Unique index handles concurrent requests that both pass the pre-check.
      if (error.code === 11000) return res.status(409).json({ error: "Email already registered" });
      return next(error);
    }
  });

  app.post("/auth/login", async (req, res, next) => {
    const data = credentials(req.body, false);
    if (!data) return res.status(400).json({ error: "Invalid email or password" });
    try {
      const user = await users.findByEmail(data.email);
      if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!ROLES.includes(user.role)) return res.status(401).json({ error: "Invalid email or password" });
      const accessToken = jwt.sign({ role: user.role }, secret, {
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
