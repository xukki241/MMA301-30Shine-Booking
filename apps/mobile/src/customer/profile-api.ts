import { AUTH_SERVICE_URL } from "../constants/config.ts";

export type HomeAddress = { province: string; district: string; ward: string; streetAddress: string };
export type CustomerProfile = { id: string; name: string; phone: string; email: string | null;
  birthDate: string | null; avatar: string | null; homeAddress: HomeAddress | null };
export type ProfilePatch = Partial<Pick<CustomerProfile, "name" | "email" | "birthDate" | "avatar" | "homeAddress">>;
export type ProfileDraft = { name: string; email: string; birthDate: string; avatar: string | null;
  homeAddress: HomeAddress };

export class ProfileRequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

async function request(token: string, method: "GET" | "PATCH", patch?: ProfilePatch): Promise<CustomerProfile> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_SERVICE_URL}/auth/customer/profile`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "PATCH" ? { body: JSON.stringify(patch) } : {}),
    });
  } catch { throw new ProfileRequestError("Không kết nối được Auth Service.", 0); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ProfileRequestError(body.error || "Không thể tải hồ sơ.", response.status);
  return body as CustomerProfile;
}

export const getCustomerProfile = (token: string) => request(token, "GET");
export const updateCustomerProfile = (token: string, patch: ProfilePatch) => request(token, "PATCH", patch);

export function validateProfileDraft(draft: ProfileDraft): string | null {
  if (draft.name.trim().length < 2 || draft.name.trim().length > 100) return "Họ tên cần từ 2 đến 100 ký tự.";
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return "Email không hợp lệ.";
  if (draft.birthDate.trim()) {
    const value = draft.birthDate.trim();
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value || value > new Date().toISOString().slice(0, 10)) {
      return "Ngày sinh không hợp lệ (YYYY-MM-DD).";
    }
  }
  const parts = Object.values(draft.homeAddress).map((part) => part.trim());
  if (parts.some(Boolean) && [draft.homeAddress.province, draft.homeAddress.ward,
    draft.homeAddress.streetAddress].some((part) => !part.trim())) {
    return "Địa chỉ nhà cần đủ tỉnh, phường/xã và số nhà/đường.";
  }
  if (parts.some((part) => part.length > 120)) return "Mỗi phần địa chỉ tối đa 120 ký tự.";
  return null;
}

export async function saveProfileDraft(draft: ProfileDraft, send: (patch: ProfilePatch) => Promise<CustomerProfile>) {
  const error = validateProfileDraft(draft);
  if (error) return { draft, error };
  const address = draft.homeAddress;
  const patch: ProfilePatch = { name: draft.name.trim(), email: draft.email.trim() || null,
    birthDate: draft.birthDate.trim() || null, avatar: draft.avatar,
    homeAddress: Object.values(address).some((value) => value.trim()) ? {
      province: address.province.trim(), district: address.district.trim(),
      ward: address.ward.trim(), streetAddress: address.streetAddress.trim(),
    } : null };
  try { return { draft, profile: await send(patch), error: null }; }
  catch (cause) { return { draft, error: cause instanceof Error ? cause.message : "Không thể lưu hồ sơ.", cause }; }
}
