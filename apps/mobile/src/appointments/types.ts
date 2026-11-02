export type AppointmentStatus = "booked" | "checked_in" | "completed" | "paid" | "cancelled" | "no_show";

export type CustomerAppointment = {
  id: string;
  branchName?: string;
  branchAddress?: string;
  branchId?: string;
  serviceName?: string;
  serviceId?: string;
  stylistName?: string;
  stylistPhone?: string | null;
  stylistId?: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  bookedPrice?: number;
};

export type PaymentInstructions = { bank: string; accountNumber: string; accountHolder: string; amount: number; content: string; qrUrl: string };

export interface CustomerAppointmentDataSource {
  list(): Promise<CustomerAppointment[]>;
  cancel(id: string): Promise<CustomerAppointment>;
  paymentInstructions?(id: string): Promise<PaymentInstructions>;
  payCash?(id: string): Promise<CustomerAppointment>;
}

