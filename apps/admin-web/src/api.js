const authBase = (import.meta.env.VITE_AUTH_API_URL || "http://localhost:4101").replace(/\/$/, "");
const coreBase = (import.meta.env.VITE_CORE_API_URL || "http://localhost:4102").replace(/\/$/, "");

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
    const message = data.error || (response.status === 401 ? "Phiên đăng nhập đã hết hạn." : response.status === 403 ? "Tài khoản không có quyền Shop Admin." : `Yêu cầu thất bại (${response.status}).`);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  login: (email, password) => request(authBase, "/auth/login", { ...json("POST", { email, password }) }),
  listBranches: (token) => request(coreBase, "/branches", { token }).then((data) => data.branches),
  saveBranch: (token, branch, id) => request(coreBase, id ? `/branches/${id}` : "/branches", { token, ...json(id ? "PUT" : "POST", branch) }),
  deleteBranch: (token, id) => request(coreBase, `/branches/${id}`, { token, method: "DELETE" }),
  listServices: (token, branchId) => request(coreBase, `/branches/${branchId}/services`, { token }).then((data) => data.services),
  saveService: (token, branchId, service, id) => request(coreBase, id ? `/services/${id}` : `/branches/${branchId}/services`, { token, ...json(id ? "PUT" : "POST", service) }),
  deleteService: (token, id) => request(coreBase, `/services/${id}`, { token, method: "DELETE" }),
  listStylists: (token, branchId) => request(coreBase, `/branches/${branchId}/stylists`, { token }).then((data) => data.stylists),
  saveStylist: (token, branchId, stylist, id) => request(coreBase, id ? `/stylists/${id}` : `/branches/${branchId}/stylists`, { token, ...json(id ? "PUT" : "POST", stylist) }),
  deleteStylist: (token, id) => request(coreBase, `/stylists/${id}`, { token, method: "DELETE" }),
  listShifts: (token, branchId, date) => request(coreBase, `/work-shifts?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`, { token }).then((data) => data.workShifts),
  saveShift: (token, shift, id) => request(coreBase, id ? `/work-shifts/${id}` : "/work-shifts", { token, ...json(id ? "PUT" : "POST", shift) }),
  deleteShift: (token, id) => request(coreBase, `/work-shifts/${id}`, { token, method: "DELETE" }),
};
