import type { CustomerAppointment, CustomerAppointmentDataSource, PaymentInput, PaymentResult } from "./types";

const isWeb = typeof window !== "undefined" || typeof document !== "undefined";
const defaultHost = isWeb ? "localhost" : "10.0.2.2";

const defaultCoreApi = (
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_CORE_API_URL
    ? process.env.EXPO_PUBLIC_CORE_API_URL
    : `http://${defaultHost}:4102`
).replace(/\/$/, "");

export function createCoreApiAppointmentDataSource(
  getToken: () => string | null,
  getCustomerId?: () => string | undefined,
  baseUrl: string = defaultCoreApi
): CustomerAppointmentDataSource {
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
    } catch {
      throw new Error("Không thể kết nối tới máy chủ.");
    }

    if (!response.ok) {
      let message = `Yêu cầu thất bại (${response.status})`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  return {
    async list(): Promise<CustomerAppointment[]> {
      const token = getToken();
      if (!token) return [];
      const customerId = getCustomerId?.();
      const path = customerId
        ? `/appointments?customerId=${encodeURIComponent(customerId)}`
        : "/appointments/customer";
      const data = await request<{ appointments: CustomerAppointment[] }>(path);
      const branches = new Map<string, Promise<{ name: string; address?: string } | null>>();
      const services = new Map<string, Promise<{ name: string } | null>>();
      const stylists = new Map<string, Promise<Array<{ userId: string; displayName: string; phone?: string | null }>>>();
      return Promise.all((data.appointments || []).map(async (item) => {
        if (item.branchId && (!item.branchName || !item.branchAddress) && !branches.has(item.branchId)) {
          branches.set(item.branchId, request<{ branch: { name: string; address?: string } }>(
            `/branches/${encodeURIComponent(item.branchId)}`).then((value) => value.branch).catch(() => null));
        }
        if (item.serviceId && !item.serviceName && !services.has(item.serviceId)) {
          services.set(item.serviceId, request<{ service: { name: string } }>(
            `/services/${encodeURIComponent(item.serviceId)}`).then((value) => value.service).catch(() => null));
        }
        if (item.branchId && item.stylistId && !stylists.has(item.branchId)) {
          stylists.set(item.branchId, request<{ stylists: Array<{ userId: string; displayName: string; phone?: string | null }> }>(
            `/branches/${encodeURIComponent(item.branchId)}/stylists`).then((value) => value.stylists).catch(() => []));
        }
        const [branch, service, branchStylists] = await Promise.all([
          item.branchId ? branches.get(item.branchId) : undefined,
          item.serviceId ? services.get(item.serviceId) : undefined,
          item.branchId ? stylists.get(item.branchId) : undefined,
        ]);
        const matchingStylist = branchStylists?.find((stylist) => stylist.userId === item.stylistId);
        return { ...item, branchName: item.branchName || branch?.name,
          branchAddress: item.branchAddress || branch?.address,
          serviceName: item.serviceName || service?.name,
          stylistName: matchingStylist?.displayName || item.stylistName,
          stylistPhone: matchingStylist?.phone || item.stylistPhone };
      }));
    },

    async cancel(id: string): Promise<CustomerAppointment> {
      const token = getToken();
      if (!token) throw new Error("Vui lòng đăng nhập để hủy lịch hẹn.");
      const data = await request<{ appointment: CustomerAppointment }>(
        `/appointments/${encodeURIComponent(id)}/cancel`,
        { method: "POST" }
      );
      return data.appointment;
    },

    async pay(id: string, input: PaymentInput): Promise<PaymentResult> {
      const token = getToken();
      if (!token) throw new Error("Vui lòng đăng nhập để thanh toán lịch hẹn.");
      const data = await request<PaymentResult>(
        `/appointments/${encodeURIComponent(id)}/pay`,
        { method: "POST", body: JSON.stringify(input) }
      );
      return data;
    },
  };
}
