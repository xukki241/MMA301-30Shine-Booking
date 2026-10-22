import type { CustomerAppointment, AppointmentStatus } from "./types";

const labels: Record<AppointmentStatus, string> = {
  booked: "Đã đặt",
  checked_in: "Đã đến · Đang chờ thợ",
  completed: "Hoàn thành",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
  no_show: "Bạn đã không đến",
};

export function isOverdueUnconfirmedAppointment(
  item: Pick<CustomerAppointment, "status" | "startTime">, now = new Date(),
): boolean {
  return item.status === "booked" && Number.isFinite(Date.parse(item.startTime)) &&
    now.getTime() >= Date.parse(item.startTime) + 15 * 60000;
}

export function customerAppointmentStatusLabel(
  status: AppointmentStatus, startTime?: string, now = new Date(),
): string {
  if (startTime && isOverdueUnconfirmedAppointment({ status, startTime }, now)) {
    return "Chưa ghi nhận khách đến";
  }
  return labels[status];
}

export function selectUpcomingAppointment<T extends Pick<CustomerAppointment, "status" | "startTime">>(
  items: T[], now = new Date(),
): T | null {
  return items.filter((item) => item.status === "booked" &&
    Number.isFinite(Date.parse(item.startTime)) && Date.parse(item.startTime) > now.getTime())
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0] || null;
}
