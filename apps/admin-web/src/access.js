export const canUseAdminWeb = (role) => role === "system_admin";

export function readAdminSession(storage) {
  try {
    const session = JSON.parse(storage.getItem("shine-admin-session") || "null");
    if (session?.accessToken && canUseAdminWeb(session.user?.role)) return session;
  } catch { /* Invalid cache is removed below. */ }
  storage.removeItem("shine-admin-session");
  return null;
}
