import type {
  AppointmentResult,
  BookingWizardDataSource,
  Branch,
  CompleteBookingDraft,
  Service,
  Stylist,
  TimeSlot,
  TimeSlotQuery,
} from "./types";

const coreApi = (process.env.EXPO_PUBLIC_CORE_API_URL || "http://localhost:4102").replace(/\/$/, "");
const authApi = (process.env.EXPO_PUBLIC_AUTH_API_URL || "http://localhost:4101").replace(/\/$/, "");

async function request<T>(base: string, path: string, token?: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Yêu cầu thất bại (${response.status}).`);
  return data as T;
}

export async function loginCustomer(email: string, password: string) {
  const result = await request<{ accessToken: string; user: { id: string; email: string; role: string } }>(
    authApi,
    "/auth/login",
    undefined,
    { method: "POST", body: JSON.stringify({ email, password }), headers: { "Content-Type": "application/json" } },
  );
  if (result.user?.role !== "customer") throw new Error("Tài khoản này không có quyền Customer.");
  return result.accessToken;
}

export async function loginStylist(email: string, password: string) {
  const result = await request<{ accessToken: string; user: { id: string; email: string; role: string } }>(
    authApi,
    "/auth/login",
    undefined,
    { method: "POST", body: JSON.stringify({ email, password }), headers: { "Content-Type": "application/json" } },
  );
  if (result.user?.role !== "stylist") throw new Error("Tài khoản này không có quyền Stylist.");
  return { token: result.accessToken, user: result.user };
}

export interface StylistAppointmentItem {
  id: string;
  customerId: string;
  stylistId: string;
  startTime: string;
  endTime: string;
  status: "booked" | "completed" | "paid" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export async function getStylistTodayAppointments(token: string, date?: string): Promise<StylistAppointmentItem[]> {
  const path = date ? `/appointments?date=${encodeURIComponent(date)}` : "/appointments";
  const data = await request<{ appointments: StylistAppointmentItem[] }>(coreApi, path, token);
  return data.appointments || [];
}

export async function completeStylistAppointment(token: string, appointmentId: string): Promise<StylistAppointmentItem> {
  const data = await request<{ appointment: StylistAppointmentItem }>(
    coreApi,
    `/appointments/${encodeURIComponent(appointmentId)}/complete`,
    token,
    { method: "POST" },
  );
  return data.appointment;
}

export interface CustomerAppointmentItem {
  id: string;
  customerId: string;
  stylistId: string;
  startTime: string;
  endTime?: string;
  status: "booked" | "completed" | "paid" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
}

export async function getCustomerAppointments(token: string, customerId?: string): Promise<CustomerAppointmentItem[]> {
  const path = customerId ? `/appointments?customerId=${encodeURIComponent(customerId)}` : "/appointments/customer";
  const data = await request<{ appointments: CustomerAppointmentItem[] }>(coreApi, path, token);
  return data.appointments || [];
}

export async function cancelCustomerAppointment(token: string, appointmentId: string): Promise<CustomerAppointmentItem> {
  const data = await request<{ appointment: CustomerAppointmentItem }>(
    coreApi,
    `/appointments/${encodeURIComponent(appointmentId)}/cancel`,
    token,
    { method: "POST" },
  );
  return data.appointment;
}

export async function payCustomerAppointment(token: string, appointmentId: string): Promise<CustomerAppointmentItem> {
  const data = await request<{ appointment: CustomerAppointmentItem }>(
    coreApi,
    `/appointments/${encodeURIComponent(appointmentId)}/pay`,
    token,
    { method: "POST" },
  );
  return data.appointment;
}

export function createHttpBookingAdapter(getToken: () => string | null): BookingWizardDataSource {
  return {
    async listBranches(): Promise<Branch[]> {
      const data = await request<{ branches: Array<{ id: string; name: string; address: string; isActive: boolean }> }>(coreApi, "/branches");
      return data.branches.filter((branch) => branch.isActive).map(({ id, name, address }) => ({ id, name, address }));
    },
    async listServices(branchId: string): Promise<Service[]> {
      const data = await request<{ services: Array<{ id: string; name: string; durationMinutes: number; price: number; isActive: boolean }> }>(coreApi, `/branches/${encodeURIComponent(branchId)}/services?isActive=true`);
      return data.services.map((service) => ({ id: service.id, name: service.name, durationMinutes: service.durationMinutes, priceVnd: service.price }));
    },
    async listStylists(branchId: string, _serviceId: string): Promise<Stylist[]> {
      const data = await request<{ stylists: Array<{ userId: string; displayName: string; isActive: boolean }> }>(coreApi, `/branches/${encodeURIComponent(branchId)}/stylists?isActive=true`);
      return data.stylists.filter((stylist) => stylist.isActive).map((stylist) => ({ id: stylist.userId, name: stylist.displayName }));
    },
    async listTimeSlots(query: TimeSlotQuery): Promise<TimeSlot[]> {
      const params = new URLSearchParams(query);
      const data = await request<{ slots: TimeSlot[] }>(coreApi, `/time-slots?${params}`);
      return data.slots;
    },
    async confirmBooking(booking: CompleteBookingDraft): Promise<AppointmentResult> {
      const token = getToken();
      if (!token) throw new Error("Đăng nhập Customer để xác nhận lịch hẹn.");
      const data = await request<{ appointment: { id: string; status: "booked" } }>(coreApi, "/appointments", token, {
        method: "POST",
        body: JSON.stringify({ branchId: booking.branch.id, serviceId: booking.service.id, stylistId: booking.stylist.id, startTime: booking.slot.startTime, endTime: booking.slot.endTime }),
      });
      return { id: data.appointment.id, status: data.appointment.status, mode: "api", booking };
    },
  };
}
