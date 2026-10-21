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
  available?: boolean;
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

export type BookingWishes = {
  stylistPreference?: string;
  specialRequest?: string;
  referenceImages?: string[];
};

export type AppointmentResult = {
  id: string;
  status: "booked";
  mode: "demo" | "api";
  booking: CompleteBookingDraft;
  bookedPrice?: number;
};

export type TimeSlotQuery = {
  branchId: string;
  serviceId: string;
  stylistId: string;
  date: string;
  excludeAppointmentId?: string;
};

export interface BookingWizardDataSource {
  listBranches(): Promise<Branch[]>;
  listServices(branchId: string): Promise<Service[]>;
  listStylists(branchId: string, serviceId?: string): Promise<Stylist[]>;
  listTimeSlots(query: TimeSlotQuery): Promise<TimeSlot[]>;
  confirmBooking(booking: CompleteBookingDraft, wishes?: BookingWishes): Promise<AppointmentResult>;
}

export function isCompleteBookingDraft(draft: BookingDraft): draft is CompleteBookingDraft {
  return Boolean(draft.branch && draft.service && draft.stylist && draft.date && draft.slot);
}
