const authBase = (import.meta.env.VITE_AUTH_API_URL || "http://localhost:4101").replace(/\/$/, "");

async function request(base, path, { token, ...init } = {}) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Kiểm tra dịch vụ và cấu hình API.");
  }
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || (response.status === 401 ? "Phiên đăng nhập đã hết hạn." : response.status === 403 ? "Tài khoản không có quyền truy cập." : `Yêu cầu thất bại (${response.status}).`);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  login: (email, password) => request(authBase, "/auth/login", { ...json("POST", { email, password }) }),
  listUsers: (token) => request(authBase, "/admin/users", { token }).then((data) => data.users),
  getUser: (token, id) => request(authBase, `/admin/users/${id}`, { token }).then((data) => data.user),
  createUser: (token, user) => request(authBase, "/admin/users", { token, ...json("POST", user) }),
  updateUser: (token, id, changes) => request(authBase, `/admin/users/${id}`, { token, ...json("PATCH", changes) }),
  lockUser: (token, id) => request(authBase, `/admin/users/${id}/lock`, { token, method: "POST" }),
  restoreUser: (token, id) => request(authBase, `/admin/users/${id}/restore`, { token, method: "POST" }),
  systemHealth: (token) => request(authBase, "/admin/health", { token }),
  auditEvents: (token, filters = {}) => request(authBase,
    `/admin/audit?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()}`, { token }).then((data) => data.events),
};
