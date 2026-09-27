function readConfig(env = process.env) {
  if (typeof env.JWT_SECRET !== "string" || Buffer.byteLength(env.JWT_SECRET.trim()) < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes; configure the same secret in core-api");
  }
  if (!/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI || "")) {
    throw new Error("MONGODB_URI must be configured with a MongoDB connection string");
  }
  const expiresIn = Number(env.JWT_EXPIRES_IN_SECONDS ?? 3600);
  if (!Number.isSafeInteger(expiresIn) || expiresIn < 1 || expiresIn > 86400) {
    throw new Error("JWT_EXPIRES_IN_SECONDS must be an integer from 1 to 86400");
  }
  const port = Number(env.PORT ?? 4101);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }
  return { secret: env.JWT_SECRET, mongoUri: env.MONGODB_URI, expiresIn, port };
}
module.exports = { readConfig };
