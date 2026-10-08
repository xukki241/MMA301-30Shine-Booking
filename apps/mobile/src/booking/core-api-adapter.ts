/**
 * Core API adapter for the booking wizard (SHINE-06).
 *
 * Implements BookingWizardDataSource by calling the real Core API endpoints:
 *  - GET /branches
 *  - GET /branches/:id/services
 *  - GET /branches/:id/services/:serviceId/stylists  (or /branches/:id/stylists?serviceId=)
 *  - GET /time-slots?stylistId=&date=&serviceId=
 *  - POST /appointments
 *
 * Auth: uses a bearer token stored in-memory (set via setCoreApiToken).
 * In a real auth flow, the token would come from the Auth Service login response.
 */

import { CORE_API_URL } from "@/constants/config";
import type {
  AppointmentResult,
  BookingWizardDataSource,
  Branch,
  CompleteBookingDraft,
  Service,
  Stylist,
  TimeSlot,
  TimeSlotQuery,
} from "./types";

// ---------------------------------------------------------------------------
// Token management - very simple in-memory store for MVP.
// Replace with SecureStore / AuthContext in a real app.
// ---------------------------------------------------------------------------
let _token: string | null = null;

export function setCoreApiToken(token: string | null): void {
  _token = token;
}

export function getCoreApiToken(): string | null {
  return _token;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }

  const response = await fetch(`${CORE_API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `API error ${response.status}`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Type shapes returned by the Core API
// ---------------------------------------------------------------------------
type ApiBranch = { id: string; name: string; address: string };
type ApiService = { id: string; name: string; durationMinutes: number; priceVnd: number };
type ApiStylist = { id: string; displayName: string };
type ApiTimeSlot = { id: string; startTime: string; endTime: string };
type ApiAppointment = {
  id: string;
  status: "booked";
  stylistId: string;
  startTime: string;
  endTime: string;
};

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------
export const coreApiBookingAdapter: BookingWizardDataSource = {
  async listBranches(): Promise<Branch[]> {
    const data = await apiFetch<{ branches: ApiBranch[] }>("/branches");
    return data.branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
    }));
  },

  async listServices(branchId: string): Promise<Service[]> {
    const data = await apiFetch<{ services: ApiService[] }>(
      `/branches/${branchId}/services`
    );
    return data.services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      priceVnd: s.priceVnd,
    }));
  },

  async listStylists(branchId: string, serviceId: string): Promise<Stylist[]> {
    const data = await apiFetch<{ stylists: ApiStylist[] }>(
      `/branches/${branchId}/stylists?serviceId=${encodeURIComponent(serviceId)}`
    );
    return data.stylists.map((s) => ({
      id: s.id,
      name: s.displayName,
    }));
  },

  async listTimeSlots({ branchId: _branchId, serviceId, stylistId, date }: TimeSlotQuery): Promise<TimeSlot[]> {
    // branchId is not needed by the /time-slots endpoint (stylist already belongs to branch),
    // but we keep it in the interface for consistency.
    const params = new URLSearchParams({ stylistId, date, serviceId });
    const data = await apiFetch<{ slots: ApiTimeSlot[] }>(
      `/time-slots?${params.toString()}`
    );
    return data.slots.map((slot) => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  },

  async confirmBooking(booking: CompleteBookingDraft): Promise<AppointmentResult> {
    const data = await apiFetch<{ appointment: ApiAppointment }>("/appointments", {
      method: "POST",
      body: JSON.stringify({
        stylistId: booking.stylist.id,
        startTime: booking.slot.startTime,
        endTime: booking.slot.endTime,
      }),
    });

    return {
      id: data.appointment.id,
      status: "booked",
      mode: "api",
      booking,
    };
  },
};
