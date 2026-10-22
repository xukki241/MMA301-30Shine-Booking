import type {
  AppointmentResult,
  BookingWizardDataSource,
  Branch,
  CompleteBookingDraft,
  BookingWishes,
  Service,
  Stylist,
  TimeSlot,
  TimeSlotQuery,
} from "./types";

const isWeb = typeof window !== "undefined" || typeof document !== "undefined";
const defaultHost = isWeb ? "localhost" : "10.0.2.2";

const coreApi = (process.env.EXPO_PUBLIC_CORE_API_URL || `http://${defaultHost}:4102`).replace(/\/$/, "");
const authApi = (process.env.EXPO_PUBLIC_AUTH_API_URL || `http://${defaultHost}:4101`).replace(/\/$/, "");

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

export type HomeService = {
  branch: Branch;
  service: Service;
  description?: string;
};

export type HomeStylist = { branch: Branch; stylist: Stylist };

export async function listHomeStylists(token: string): Promise<HomeStylist[]> {
  const { branches } = await request<{ branches: Array<Branch & { isActive: boolean }> }>(
    coreApi, "/branches", token);
  const catalogs = await Promise.all(branches.filter((branch) => branch.isActive).map(async (branch) => {
    const { stylists } = await request<{ stylists: Array<{ userId: string; displayName: string;
      isActive: boolean }> }>(coreApi,
      `/branches/${encodeURIComponent(branch.id)}/stylists?isActive=true`, token);
    return stylists.filter((item) => item.isActive).map((item): HomeStylist => ({
      branch: { id: branch.id, name: branch.name, address: branch.address },
      stylist: { id: item.userId, name: item.displayName },
    }));
  }));
  return catalogs.flat();
}

export async function listPublicHomeServices(): Promise<HomeService[]> {
  const { branches } = await request<{ branches: Branch[] }>(coreApi, "/public/branches");
  const catalogs = await Promise.all(branches.map(async (branch) => {
    const { services } = await request<{ services: Array<{ id: string; name: string; price: number;
      durationMinutes: number; description?: string }> }>(coreApi,
      `/public/branches/${encodeURIComponent(branch.id)}/services`);
    return services.map((item): HomeService => ({ branch,
      service: { id: item.id, name: item.name, priceVnd: item.price,
        durationMinutes: item.durationMinutes }, description: item.description }));
  }));
  return catalogs.flat();
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
  customerName?: string;
  customerPhone?: string;
  serviceName?: string;
  branchName?: string;
  wishes?: {
    stylistPreference?: string;
    specialRequest?: string;
    referenceImages?: string[];
  };
  stylistId: string;
  startTime: string;
  endTime: string;
  status: "booked" | "checked_in" | "completed" | "paid" | "cancelled" | "no_show";
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StylistProfileItem {
  id: string;
  userId: string;
  displayName: string;
  branchId: string;
  branchName: string | null;
  branchAddress: string | null;
}

export async function getStylistProfiles(token: string): Promise<StylistProfileItem[]> {
  const data = await request<{ profiles: StylistProfileItem[] }>(coreApi, "/stylists/me", token);
  return data.profiles || [];
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

export async function actOnStylistAppointment(token: string, appointmentId: string,
  action: "check_in" | "undo_check_in" | "no_show"): Promise<StylistAppointmentItem> {
  const data = await request<{ appointment: StylistAppointmentItem }>(coreApi,
    `/appointments/${encodeURIComponent(appointmentId)}/${action}`, token, { method: "POST" });
  return data.appointment;
}

export interface CustomerAppointmentItem {
  id: string;
  customerId: string;
  branchId?: string;
  serviceId?: string;
  stylistId: string;
  startTime: string;
  endTime?: string;
  status: "booked" | "checked_in" | "completed" | "paid" | "cancelled" | "no_show";
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

export async function rescheduleCustomerAppointment(token: string, appointmentId: string,
  slot: TimeSlot, serviceId?: string): Promise<CustomerAppointmentItem> {
  const data = await request<{ appointment: CustomerAppointmentItem }>(coreApi,
    `/appointments/${encodeURIComponent(appointmentId)}/reschedule`, token,
    { method: "POST", body: JSON.stringify({ startTime: slot.startTime, endTime: slot.endTime,
      ...(serviceId ? { serviceId } : {}) }) });
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
      const data = await request<{ branches: Array<{ id: string; name: string; address: string; isActive: boolean }> }>(coreApi, "/branches", getToken() || undefined);
      return data.branches.filter((branch) => branch.isActive).map(({ id, name, address }) => ({ id, name, address }));
    },
    async listServices(branchId: string): Promise<Service[]> {
      const data = await request<{ services: Array<{ id: string; name: string; durationMinutes: number; price: number; isActive: boolean }> }>(coreApi, `/branches/${encodeURIComponent(branchId)}/services?isActive=true`, getToken() || undefined);
      return data.services.map((service) => ({ id: service.id, name: service.name, durationMinutes: service.durationMinutes, priceVnd: service.price }));
    },
    async listStylists(branchId: string): Promise<Stylist[]> {
      const data = await request<{ stylists: Array<{ userId: string; displayName: string; isActive: boolean }> }>(coreApi, `/branches/${encodeURIComponent(branchId)}/stylists?isActive=true`, getToken() || undefined);
      return data.stylists.filter((stylist) => stylist.isActive).map((stylist) => ({ id: stylist.userId, name: stylist.displayName }));
    },
    async listTimeSlots(query: TimeSlotQuery): Promise<TimeSlot[]> {
      const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined) as [string, string][]);
      const data = await request<{ slots: TimeSlot[] }>(coreApi, `/time-slots?${params}`, getToken() || undefined);
      return data.slots;
    },
    async confirmBooking(booking: CompleteBookingDraft, wishes?: BookingWishes): Promise<AppointmentResult> {
      const token = getToken();
      if (!token) throw new Error("Đăng nhập Customer để xác nhận lịch hẹn.");
      const data = await request<{ appointment: { id: string; status: "booked"; bookedPrice?: number } }>(coreApi, "/appointments", token, {
        method: "POST",
        body: JSON.stringify({ branchId: booking.branch.id, serviceId: booking.service.id, stylistId: booking.stylist.id,
          startTime: booking.slot.startTime, endTime: booking.slot.endTime, ...(wishes ? { wishes } : {}) }),
      });
      return { id: data.appointment.id, status: data.appointment.status, mode: "api", booking,
        bookedPrice: data.appointment.bookedPrice };
    },
  };
}
