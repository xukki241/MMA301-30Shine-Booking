export type AppointmentStatus = "booked" | "completed" | "paid" | "cancelled";

export type CustomerAppointment = {
  id: string;
  branchName?: string;
  serviceName?: string;
  stylistName?: string;
  stylistId?: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
};

export interface CustomerAppointmentDataSource {
  list(): Promise<CustomerAppointment[]>;
  cancel(id: string): Promise<CustomerAppointment>;
  pay?(id: string): Promise<CustomerAppointment>;
}

