import type { CustomerAppointment } from "./types";

export function orderCustomerAppointments<T extends Pick<CustomerAppointment, "status" | "startTime">>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aBooked = a.status === "booked";
    const bBooked = b.status === "booked";
    if (aBooked !== bBooked) return aBooked ? -1 : 1;
    const aTime = Date.parse(a.startTime);
    const bTime = Date.parse(b.startTime);
    return aBooked ? aTime - bTime : bTime - aTime;
  });
}
