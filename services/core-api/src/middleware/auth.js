const jwt = require("jsonwebtoken");
const ROLES = Object.freeze(["customer", "stylist", "system_admin", "general_manager"]);

function readJwtSecret(env = process.env) {
  if (typeof env.JWT_SECRET !== "string" || Buffer.byteLength(env.JWT_SECRET.trim()) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes; use the same secret as auth-service");
  }
  return env.JWT_SECRET;
}

function createStaffVerifier(authServiceUrl) {
  if (!authServiceUrl) return null;
  const base = authServiceUrl.replace(/\/$/, "");
  return async (token) => {
    const response = await fetch(`${base}/auth/introspect`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  };
}

function createCustomerVerifier(authServiceUrl) {
  if (!authServiceUrl) return null;
  const base = authServiceUrl.replace(/\/$/, "");
  return async (token) => {
    const response = await fetch(`${base}/auth/customer/introspect`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000),
    });
    return response.ok ? (await response.json()).user : false;
  };
}

function createActiveStylistVerifier(authServiceUrl, secret) {
  if (!authServiceUrl) return null;
  const base = authServiceUrl.replace(/\/$/, "");
  return async (userId) => {
    const token = jwt.sign({ scope: "stylist-verify" }, secret,
      { algorithm: "HS256", issuer: "core-api", expiresIn: 30 });
    const response = await fetch(`${base}/internal/staff/${encodeURIComponent(userId)}/active-stylist`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("Stylist verification unavailable");
    return (await response.json()).active === true;
  };
}

function authenticate(secret, verifyStaff, verifyCustomer) {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    try {
      if (!match) throw new Error("Missing bearer token");
      const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
      if (typeof payload !== "object" || typeof payload.sub !== "string" || !/^[a-f0-9]{24}$/i.test(payload.sub) ||
          !ROLES.includes(payload.role) || !Number.isSafeInteger(payload.exp)) {
        throw new Error("Invalid token claims");
      }
      if (payload.guest === true) {
        throw new Error("Legacy Guest Session is disabled");
      } else {
        if (!Number.isSafeInteger(payload.authVersion) || payload.authVersion < 0) {
          throw new Error("Invalid staff session version");
        }
        if (payload.role === "customer") {
          if (!verifyCustomer) return res.status(503).json({ error: "Customer session verification unavailable" });
          let active;
          try { active = await verifyCustomer(match[1], payload); }
          catch { return res.status(503).json({ error: "Customer session verification unavailable" }); }
          if (!active) throw new Error("Customer session revoked");
          req.auth = { userId: payload.sub, role: "customer", guest: false,
            ...(typeof active === "object" ? { name: active.name, phone: active.phone } : {}) };
          return next();
        }
        if (!verifyStaff) return res.status(503).json({ error: "Staff session verification unavailable" });
        let active;
        try { active = await verifyStaff(match[1], payload); }
        catch { return res.status(503).json({ error: "Staff session verification unavailable" }); }
        if (!active) throw new Error("Staff session revoked");
        req.auth = { userId: payload.sub, role: payload.role };
      }
    } catch {
      res.set("WWW-Authenticate", "Bearer");
      return res.status(401).json({ error: "Invalid or expired bearer token" });
    }
    return next();
  };
}
module.exports = { authenticate, readJwtSecret, createStaffVerifier, createCustomerVerifier, createActiveStylistVerifier };
