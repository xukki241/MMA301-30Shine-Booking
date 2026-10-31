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

export type PaymentInput = { provider: "momo" | "vnpay"; outcome: "success" | "failed"; requestId: string };
export type PaymentAttempt = { id: string; requestId: string; amount: number; provider: PaymentInput["provider"];
  status: PaymentInput["outcome"]; attemptedAt: string };
export type PaymentResult = { appointment: CustomerAppointment; attempt: PaymentAttempt };

export interface CustomerAppointmentDataSource {
  list(): Promise<CustomerAppointment[]>;
  cancel(id: string): Promise<CustomerAppointment>;
  pay?(id: string, input: PaymentInput): Promise<PaymentResult>;
}

