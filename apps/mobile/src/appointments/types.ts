export type AppointmentStatus = "booked" | "completed" | "paid" | "cancelled";

export type CustomerAppointment = {
  id: string;
  branchName: string;
  serviceName: string;
  stylistName: string;
  startTime: string;
  status: AppointmentStatus;
};

export interface CustomerAppointmentDataSource {
  list(): Promise<CustomerAppointment[]>;
  cancel(id: string): Promise<CustomerAppointment>;
}
