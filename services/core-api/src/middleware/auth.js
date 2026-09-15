const jwt = require("jsonwebtoken");
const ROLES = Object.freeze(["customer", "stylist", "shop_admin"]);

function readJwtSecret(env = process.env) {
  if (typeof env.JWT_SECRET !== "string" || Buffer.byteLength(env.JWT_SECRET.trim()) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes; use the same secret as auth-service");
  }
  return env.JWT_SECRET;
}

function authenticate(secret) {
  return (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    try {
      if (!match) throw new Error("Missing bearer token");
      const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
      if (typeof payload !== "object" || typeof payload.sub !== "string" || !/^[a-f0-9]{24}$/i.test(payload.sub) ||
          !ROLES.includes(payload.role) || !Number.isSafeInteger(payload.exp)) {
        throw new Error("Invalid token claims");
      }
      req.auth = { userId: payload.sub, role: payload.role };
    } catch {
      res.set("WWW-Authenticate", "Bearer");
      return res.status(401).json({ error: "Invalid or expired bearer token" });
    }
    return next();
  };
}
module.exports = { authenticate, readJwtSecret };
