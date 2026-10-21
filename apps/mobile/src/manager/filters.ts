type FilterValue = string | number | undefined;
export function queryString(filters: Record<string, FilterValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

export function buildAppointmentQuery(filters: Record<string, FilterValue>, cursor?: string): string {
  return queryString({ ...filters, cursor });
}

export function buildPaymentQuery(filters: { branchId: string; from?: string; to?: string;
  cursor?: string; limit?: number }): string {
  if (!filters.branchId) throw new Error("Vui lòng chọn chi nhánh.");
  if (filters.from && filters.to && filters.from > filters.to) throw new Error("Khoảng ngày không hợp lệ.");
  return queryString(filters);
}
