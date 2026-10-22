import type { AppointmentFilters, Branch, ManagerAppointment, Overview, Page, PaymentFilters,
  PaymentPage, Service, Shift, Stylist } from "./types";
import { buildAppointmentQuery, buildPaymentQuery, queryString } from "./filters.ts";

const host = typeof window !== "undefined" || typeof document !== "undefined" ? "localhost" : "10.0.2.2";
const defaultBaseUrl = (process.env.EXPO_PUBLIC_CORE_API_URL || `http://${host}:4102`).replace(/\/$/, "");

export function createManagerApi(getToken: () => string | null, onUnauthorized: () => void,
  baseUrl = defaultBaseUrl) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken();
    if (!token) throw new Error("Cần đăng nhập Manager.");
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...init, headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`, ...init.headers,
      } });
    } catch { throw new Error("Không kết nối được máy chủ. Vui lòng thử lại."); }
    if (response.status === 401) {
      onUnauthorized();
      throw new Error("Phiên đã hết hạn. Vui lòng đăng nhập lại.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Yêu cầu thất bại (${response.status}).`);
    return data as T;
  }
  const body = (method: string, value: unknown): RequestInit => ({ method, body: JSON.stringify(value) });
  return {
    overview: (filters: { date?: string; branchId?: string }) =>
      request<Overview>(`/manager/overview?${queryString(filters)}`),
    appointments: (filters: AppointmentFilters) =>
      request<Page<ManagerAppointment>>(`/manager/appointments?${buildAppointmentQuery(filters)}`),
    appointment: (id: string) => request<ManagerAppointment>(`/manager/appointments/${encodeURIComponent(id)}`),
    restoreNoShow: (id: string) => request<ManagerAppointment>(
      `/manager/appointments/${encodeURIComponent(id)}/restore-no-show`, { method: "POST" }),
    payments: (filters: PaymentFilters) => {
      return request<PaymentPage>(`/manager/payments?${buildPaymentQuery(filters)}`);
    },
    branches: async () => (await request<{ branches: Branch[] }>("/branches")).branches,
    createBranch: (value: Partial<Branch>) => request<{ branch: Branch }>("/branches", body("POST", value)),
    updateBranch: (id: string, value: Partial<Branch>) => request<{ branch: Branch }>(`/branches/${encodeURIComponent(id)}`, body("PUT", value)),
    deleteBranch: (id: string) => request<unknown>(`/branches/${encodeURIComponent(id)}`, { method: "DELETE" }),
    services: async (branchId: string) => (await request<{ services: Service[] }>(`/branches/${encodeURIComponent(branchId)}/services`)).services,
    createService: (branchId: string, value: Partial<Service>) => request<{ service: Service }>(`/branches/${encodeURIComponent(branchId)}/services`, body("POST", value)),
    updateService: (id: string, value: Partial<Service>) => request<{ service: Service }>(`/services/${encodeURIComponent(id)}`, body("PUT", value)),
    deleteService: (id: string) => request<unknown>(`/services/${encodeURIComponent(id)}`, { method: "DELETE" }),
    stylists: async (branchId: string) => (await request<{ stylists: Stylist[] }>(`/branches/${encodeURIComponent(branchId)}/stylists`)).stylists,
    createStylist: (branchId: string, value: Partial<Stylist>) => request<{ stylist: Stylist }>(`/branches/${encodeURIComponent(branchId)}/stylists`, body("POST", value)),
    updateStylist: (id: string, value: Partial<Stylist>) => request<{ stylist: Stylist }>(`/stylists/${encodeURIComponent(id)}`, body("PUT", value)),
    deleteStylist: (id: string) => request<unknown>(`/stylists/${encodeURIComponent(id)}`, { method: "DELETE" }),
    shifts: async (branchId: string, date: string, stylistId?: string) =>
      (await request<{ workShifts: Shift[] }>(`/work-shifts?${queryString({ branchId, date, stylistId })}`)).workShifts,
    createShift: (value: Partial<Shift>) => request<{ workShift: Shift }>("/work-shifts", body("POST", value)),
    updateShift: (id: string, value: Partial<Shift>) => request<{ workShift: Shift }>(`/work-shifts/${encodeURIComponent(id)}`, body("PUT", value)),
    deleteShift: (id: string) => request<unknown>(`/work-shifts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}
