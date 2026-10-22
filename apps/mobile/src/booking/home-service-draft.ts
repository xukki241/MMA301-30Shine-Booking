import type { BookingDraft, BookingWizardDataSource } from "./types.ts";

export async function loadHomeServiceDraft(
  source: Pick<BookingWizardDataSource, "listBranches" | "listServices">,
  branchId: string,
  serviceId: string,
  date: string,
): Promise<BookingDraft | null> {
  const branch = (await source.listBranches()).find((item) => item.id === branchId);
  if (!branch) return null;
  const service = (await source.listServices(branch.id)).find((item) => item.id === serviceId);
  return service ? { branch, service, stylist: null, date, slot: null } : null;
}

export async function loadHomeStylistDraft(
  source: Pick<BookingWizardDataSource, "listBranches" | "listStylists">,
  branchId: string,
  stylistId: string,
  date: string,
): Promise<BookingDraft | null> {
  const branch = (await source.listBranches()).find((item) => item.id === branchId);
  if (!branch) return null;
  const stylist = (await source.listStylists(branch.id)).find((item) => item.id === stylistId);
  return stylist ? { branch, service: null, stylist, date, slot: null } : null;
}
