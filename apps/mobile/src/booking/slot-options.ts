import type { TimeSlot } from "./types.ts";

export type SlotOption = {
  startTime: string;
  serviceIds: string[];
  slotsByService: Record<string, TimeSlot>;
};

export function mergeSlotOptions(results: Array<{ serviceId: string; slots: TimeSlot[] }>): SlotOption[] {
  const byStart = new Map<string, SlotOption>();
  for (const { serviceId, slots } of results) {
    for (const slot of slots) {
      const option = byStart.get(slot.startTime) || {
        startTime: slot.startTime, serviceIds: [], slotsByService: {},
      };
      if (slot.available !== false) {
        if (!option.slotsByService[serviceId]) option.serviceIds.push(serviceId);
        option.slotsByService[serviceId] = slot;
      }
      byStart.set(slot.startTime, option);
    }
  }
  return [...byStart.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function slotForService(option: SlotOption, serviceId: string): TimeSlot | null {
  return option.slotsByService[serviceId] || null;
}

export function findSlotAtStart(slots: TimeSlot[], startTime: string): TimeSlot | null {
  return slots.find((slot) => slot.startTime === startTime && slot.available !== false) || null;
}
