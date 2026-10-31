import type { CustomerAppointment } from "./types";

export function orderCustomerAppointments<T extends Pick<CustomerAppointment, "status" | "startTime">>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const priority = (status: CustomerAppointment["status"]) => status === "completed" ? 0 : status === "booked" ? 1 : 2;
    const aPriority = priority(a.status);
    const bPriority = priority(b.status);
    if (aPriority !== bPriority) return aPriority - bPriority;
    const aTime = Date.parse(a.startTime);
    const bTime = Date.parse(b.startTime);
    return aPriority === 1 ? aTime - bTime : bTime - aTime;
  });
}

export function isValidLookupDate(value: string): boolean {
  if (!value.trim()) return true;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function filterCustomerAppointments<T extends Pick<CustomerAppointment, "serviceName" | "branchName" | "stylistName" | "startTime">>(items: T[], query: string, dateQuery = ""): T[] {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
  const term = normalize(query);
  const date = dateQuery.trim();
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
  return items.filter((item) => {
    if (date && (!Number.isFinite(Date.parse(item.startTime)) || formatter.format(new Date(item.startTime)) !== date)) return false;
    return !term || [item.serviceName, item.branchName, item.stylistName]
      .some((value) => value && normalize(value).includes(term));
  });
}
