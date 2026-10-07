import type { CustomerAppointment, CustomerAppointmentDataSource } from "./types";

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
      return data.appointments || [];
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

    async pay(id: string): Promise<CustomerAppointment> {
      const token = getToken();
      if (!token) throw new Error("Vui lòng đăng nhập để thanh toán lịch hẹn.");
      const data = await request<{ appointment: CustomerAppointment }>(
        `/appointments/${encodeURIComponent(id)}/pay`,
        { method: "POST" }
      );
      return data.appointment;
    },
  };
}
