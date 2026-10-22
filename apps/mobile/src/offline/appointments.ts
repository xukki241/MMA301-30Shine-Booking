export type AppointmentSummary = {
  id: string;
  startTime: string;
  status: "booked" | "checked_in" | "completed" | "paid" | "cancelled" | "no_show";
  bookedPrice?: number;
  branchId?: string;
  branchName?: string;
  branchAddress?: string;
  serviceId?: string;
  serviceName?: string;
  stylistId?: string;
  stylistName?: string;
};

export function isAppointmentSummary(value: unknown): value is AppointmentSummary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 &&
    typeof item.startTime === "string" && !Number.isNaN(Date.parse(item.startTime)) &&
    (item.status === "booked" || item.status === "checked_in" || item.status === "completed" ||
      item.status === "paid" || item.status === "cancelled" || item.status === "no_show") &&
    (item.bookedPrice === undefined || (typeof item.bookedPrice === "number" && Number.isSafeInteger(item.bookedPrice) && item.bookedPrice >= 0)) &&
    ["branchId", "branchName", "branchAddress", "serviceId", "serviceName", "stylistId", "stylistName"]
      .every((key) => item[key] === undefined || typeof item[key] === "string");
}
