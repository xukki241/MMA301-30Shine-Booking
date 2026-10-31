import type { Connectivity } from "./connectivity";

export const OFFLINE_BOOKING_MESSAGE = "Không thể đặt lịch khi đang ngoại tuyến. Vui lòng kết nối mạng và thử lại.";

export async function runOnlineBooking<T>(connectivity: Connectivity, book: () => Promise<T>): Promise<T> {
  if (connectivity !== "online") throw new Error(OFFLINE_BOOKING_MESSAGE);
  return book();
}
