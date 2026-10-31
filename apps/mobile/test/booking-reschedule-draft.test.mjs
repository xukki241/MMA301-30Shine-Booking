import assert from "node:assert/strict";
import test from "node:test";
import { loadRescheduleDraft } from "../src/booking/reschedule-draft.ts";

const branch = { id: "branch-1", name: "30Shine Phú Diễn", address: "Hà Nội" };
const service = { id: "service-1", name: "Cắt tóc", durationMinutes: 45, priceVnd: 60000 };
const stylist = { id: "stylist-1", name: "Toàn" };
const source = { listBranches: async () => [branch], listServices: async () => [service],
  listStylists: async () => [stylist] };
const appointments = [{ id: "appointment-1", branchId: branch.id, serviceId: service.id,
  stylistId: stylist.id, status: "booked", startTime: "2030-10-22T02:00:00Z" }];

test("reschedule loads the existing salon, stylist and service but requires a new slot", async () => {
  const draft = await loadRescheduleDraft("appointment-1", async () => appointments, source,
    ["2030-10-21", "2030-10-22"]);
  assert.equal(draft.branch, branch);
  assert.equal(draft.stylist, stylist);
  assert.equal(draft.service, service);
  assert.equal(draft.date, "2030-10-22");
  assert.equal(draft.slot, null);
});

test("reschedule refuses a cancelled appointment", async () => {
  await assert.rejects(loadRescheduleDraft("appointment-1", async () =>
    [{ ...appointments[0], status: "cancelled" }], source, ["2030-10-21"]), /không thể đổi/);
});
