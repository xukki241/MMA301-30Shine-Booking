export const TOKEN_STORAGE_KEY = "@shine:auth:token";
export const USER_STORAGE_KEY = "@shine:auth:user";

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonStr =
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(jsonStr);
    if (!payload || typeof payload.exp !== "number") return false;
    // Buffer 5 seconds before expiration
    return Date.now() >= payload.exp * 1000 - 5000;
  } catch {
    return true;
  }
}
