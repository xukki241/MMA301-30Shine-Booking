const jwt = require("jsonwebtoken");

function createStylistChangeGuard({ coreApiUrl, secret }) {
  const base = coreApiUrl.replace(/\/$/, "");
  return async (userId) => {
    const token = jwt.sign({ scope: "stylist-obligations" }, secret,
      { algorithm: "HS256", issuer: "auth-service", expiresIn: 30 });
    const response = await fetch(`${base}/internal/stylists/${userId}/obligations`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("Stylist schedule check unavailable");
    const data = await response.json();
    if (typeof data.hasPendingWork !== "boolean") throw new Error("Invalid stylist schedule response");
    return !data.hasPendingWork;
  };
}

module.exports = { createStylistChangeGuard };
