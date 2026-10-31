export type BookingStatusItem = { id: string; status: string; startTime: string };

export function activeBooking<T extends BookingStatusItem>(items: T[], now = new Date()): T | null {
  return items.filter((item) => item.status === "booked" &&
    Number.isFinite(Date.parse(item.startTime)) && Date.parse(item.startTime) > now.getTime())
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0] || null;
}

export function isCurrentRescheduleSlot(startTime: string, currentStartTime: string | null): boolean {
  return Boolean(currentStartTime && Date.parse(startTime) === Date.parse(currentStartTime));
}
