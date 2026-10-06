export type AppointmentSummary = {
  id: string;
  startTime: string;
  status: "booked" | "completed" | "paid" | "cancelled";
};

export function isAppointmentSummary(value: unknown): value is AppointmentSummary {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 &&
    typeof item.startTime === "string" && !Number.isNaN(Date.parse(item.startTime)) &&
    (item.status === "booked" || item.status === "completed" || item.status === "paid" || item.status === "cancelled");
}
