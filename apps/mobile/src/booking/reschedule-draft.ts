import type { CustomerAppointmentItem } from "./http-adapter";
import type { BookingDraft, BookingWizardDataSource } from "./types";

export async function loadRescheduleDraft(
  appointmentId: string,
  listAppointments: () => Promise<CustomerAppointmentItem[]>,
  source: Pick<BookingWizardDataSource, "listBranches" | "listServices" | "listStylists">,
  dateKeys: string[],
): Promise<BookingDraft> {
  const appointment = (await listAppointments()).find((item) => item.id === appointmentId);
  if (!appointment || appointment.status !== "booked") {
    throw new Error("Lịch hẹn này không thể đổi ngày hoặc giờ.");
  }
  if (!appointment.branchId || !appointment.serviceId || !appointment.stylistId) {
    throw new Error("Lịch hẹn thiếu thông tin salon, stylist hoặc dịch vụ.");
  }
  const branch = (await source.listBranches()).find((item) => item.id === appointment.branchId);
  if (!branch) throw new Error("Salon của lịch hẹn không còn khả dụng.");
  const [services, stylists] = await Promise.all([
    source.listServices(branch.id), source.listStylists(branch.id),
  ]);
  const service = services.find((item) => item.id === appointment.serviceId);
  const stylist = stylists.find((item) => item.id === appointment.stylistId);
  if (!service || !stylist) throw new Error("Stylist hoặc dịch vụ của lịch hẹn không còn khả dụng.");
  const original = new Date(appointment.startTime);
  const originalDate = `${original.getFullYear()}-${String(original.getMonth() + 1).padStart(2, "0")}-${String(original.getDate()).padStart(2, "0")}`;
  return { branch, service, stylist, date: dateKeys.includes(originalDate) ? originalDate : dateKeys[0] || null,
    slot: null };
}
