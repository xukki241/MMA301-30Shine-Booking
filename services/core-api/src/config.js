function readConfig(env = process.env) {
  if (typeof env.JWT_SECRET !== "string" || Buffer.byteLength(env.JWT_SECRET.trim()) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes; use the same secret as auth-service");
  }
  const mongoUri = env.MONGODB_URI || "mongodb://127.0.0.1:27017/shine_core";
  if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
    throw new Error("MONGODB_URI must be configured with a MongoDB connection string");
  }
  const port = Number(env.PORT || 4102);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }
  const authServiceUrl = env.AUTH_SERVICE_URL || "http://127.0.0.1:4101";
  if (!/^https?:\/\/[^\s]+$/.test(authServiceUrl)) {
    throw new Error("AUTH_SERVICE_URL must be an HTTP URL");
  }
  return { secret: env.JWT_SECRET, mongoUri, port, authServiceUrl };
}

module.exports = { readConfig };
