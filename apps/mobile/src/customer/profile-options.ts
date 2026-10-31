import { divisions } from "./vietnam-divisions.ts";

export const provinces = divisions.map((division) => division.name);

export function wardsForProvince(province: string): string[] {
  return divisions.find((division) => division.name === province)?.wards || [];
}

export function formatBirthDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export function toBirthDate(day: number, month: number, year: number): string | null {
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${value}T00:00:00Z`);
  return date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10)
    ? value : null;
}
