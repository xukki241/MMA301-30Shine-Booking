import assert from "node:assert/strict";
import test from "node:test";
import { loadHomeServiceDraft, loadHomeStylistDraft } from "../src/booking/home-service-draft.ts";

test("home card preselects its own salon and service", async () => {
  const branch = { id: "salon-b", name: "Salon B", address: "Đà Nẵng" };
  const service = { id: "perm", name: "Uốn tóc", durationMinutes: 90, priceVnd: 300000 };
  const source = { listBranches: async () => [branch], listServices: async (id) => {
    assert.equal(id, branch.id);
    return [service];
  } };
  assert.deepEqual(await loadHomeServiceDraft(source, branch.id, service.id, "2030-10-20"),
    { branch, service, stylist: null, date: "2030-10-20", slot: null });
  assert.equal(await loadHomeServiceDraft(source, branch.id, "missing", "2030-10-20"), null);
});

test("stylist card preselects its salon and stylist before service choice", async () => {
  const branch = { id: "salon-b", name: "Salon B", address: "Đà Nẵng" };
  const stylist = { id: "stylist-b", name: "Stylist Bình" };
  const source = { listBranches: async () => [branch], listStylists: async () => [stylist] };
  assert.deepEqual(await loadHomeStylistDraft(source, branch.id, stylist.id, "2030-10-20"),
    { branch, service: null, stylist, date: "2030-10-20", slot: null });
  assert.equal(await loadHomeStylistDraft(source, branch.id, "missing", "2030-10-20"), null);
});
