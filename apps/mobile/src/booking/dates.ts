export type BookingDate = { key: string; label: string };

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return localDateKey(date) === key ? date : null;
}

export function upcomingDates(count = 7, now = new Date()): BookingDate[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: localDateKey(date),
      label: new Intl.DateTimeFormat("vi-VN", {
        weekday: "short", day: "2-digit", month: "2-digit"
      }).format(date)
    };
  });
}

export function formatSlot(slot: { startTime: string; endTime: string }): string {
  const formatter = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${formatter.format(new Date(slot.startTime))} - ${formatter.format(new Date(slot.endTime))}`;
}

export function formatDate(date: string): string {
  const local = parseLocalDate(date);
  return local
    ? new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(local)
    : date;
}
