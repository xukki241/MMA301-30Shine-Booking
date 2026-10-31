import { useEffect, useState } from "react";

import type { BookingDraft, BookingWizardDataSource, Branch, Service, Stylist, TimeSlot } from "./types";

export type BookingStep = 0 | 1 | 2 | 3 | 4;

export function useBookingOptions(step: BookingStep, draft: BookingDraft, source: BookingWizardDataSource) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [request, setRequest] = useState<{ key: string; loading: boolean; error: string | null }>({
    key: "", loading: true, error: null
  });
  const [revision, setRevision] = useState(0);

  const branchId = step > 0 ? draft.branch?.id : undefined;
  const serviceId = step > 1 ? draft.service?.id : undefined;
  const stylistId = step > 2 ? draft.stylist?.id : undefined;
  const date = step === 3 ? draft.date : undefined;
  const requestKey = [step, branchId, serviceId, stylistId, date, revision].join(":");
  // A new step/date must not briefly show options or an error from the previous request.
  const loading = request.key !== requestKey || request.loading;
  const error = request.key === requestKey ? request.error : null;

  useEffect(() => {
    let active = true;
    if (step === 4 || (step === 3 && !date)) {
      setRequest({ key: requestKey, loading: false, error: null });
      return () => { active = false; };
    }
    setRequest({ key: requestKey, loading: true, error: null });

    async function load() {
      try {
        if (step === 0) {
          const next = await source.listBranches();
          if (active) setBranches(next);
        } else if (step === 1 && branchId) {
          const next = await source.listServices(branchId);
          if (active) setServices(next);
        } else if (step === 2 && branchId && serviceId) {
          const next = await source.listStylists(branchId, serviceId);
          if (active) setStylists(next);
        } else if (step === 3 && branchId && serviceId && stylistId && date) {
          const next = await source.listTimeSlots({ branchId, serviceId, stylistId, date });
          if (active) setSlots(next);
        }
        if (active) setRequest({ key: requestKey, loading: false, error: null });
      } catch {
        if (active) setRequest({ key: requestKey, loading: false, error: "Không tải được dữ liệu cho bước này. Vui lòng thử lại." });
      }
    }
    void load();
    return () => { active = false; };
  }, [step, branchId, serviceId, stylistId, date, revision, requestKey, source]);

  return { branches, services, stylists, slots, loading, error, retry: () => setRevision((value) => value + 1) };
}
