export type Branch = {
  id: string;
  name: string;
  address: string;
};

export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceVnd: number;
};

export type Stylist = {
  id: string;
  name: string;
};

export type TimeSlot = {
  id: string;
  startTime: string;
  endTime: string;
};

export type BookingDraft = {
  branch: Branch | null;
  service: Service | null;
  stylist: Stylist | null;
  date: string | null;
  slot: TimeSlot | null;
};

export type CompleteBookingDraft = {
  branch: Branch;
  service: Service;
  stylist: Stylist;
  date: string;
  slot: TimeSlot;
};

export type AppointmentResult = {
  id: string;
  status: "booked";
  mode: "demo" | "api";
  booking: CompleteBookingDraft;
};

export type TimeSlotQuery = {
  branchId: string;
  serviceId: string;
  stylistId: string;
  date: string;
};

export interface BookingWizardDataSource {
  listBranches(): Promise<Branch[]>;
  listServices(branchId: string): Promise<Service[]>;
  listStylists(branchId: string, serviceId: string): Promise<Stylist[]>;
  listTimeSlots(query: TimeSlotQuery): Promise<TimeSlot[]>;
  confirmBooking(booking: CompleteBookingDraft): Promise<AppointmentResult>;
}

export function isCompleteBookingDraft(draft: BookingDraft): draft is CompleteBookingDraft {
  return Boolean(draft.branch && draft.service && draft.stylist && draft.date && draft.slot);
}
