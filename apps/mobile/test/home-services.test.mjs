import assert from "node:assert/strict";
import test from "node:test";
import { listHomeStylists, listPublicHomeServices } from "../src/booking/http-adapter.ts";

test("home services come from active salon catalogs with the matching salon", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    const body = String(url).endsWith("/public/branches")
      ? { branches: [{ id: "salon-a", name: "Salon A", address: "Hà Nội" },
        { id: "salon-b", name: "Salon B", address: "Đà Nẵng" }] }
      : String(url).endsWith("/salon-a/services")
        ? { services: [{ id: "cut", name: "Cắt tóc", price: 100000, durationMinutes: 45,
          description: "Cắt và gội" }] }
        : { services: [{ id: "perm", name: "Uốn tóc", price: 300000, durationMinutes: 90 }] };
    return { ok: true, json: async () => body };
  };
  const items = await listPublicHomeServices();
  assert.deepEqual(items.map(({ branch, service }) => [branch.id, service.id, service.priceVnd]), [
    ["salon-a", "cut", 100000], ["salon-b", "perm", 300000],
  ]);
  assert.equal(items[0].description, "Cắt và gội");
  assert.ok(urls.every((url) => url.includes("/public/branches")));
});

test("home stylist profiles include only active stylists and their salon", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer customer-token");
    const body = String(url).endsWith("/branches")
      ? { branches: [{ id: "salon-a", name: "Salon A", address: "Hà Nội", isActive: true }] }
      : { stylists: [{ userId: "stylist-a", displayName: "Stylist An", isActive: true },
        { userId: "stylist-b", displayName: "Stylist Bình", isActive: false }] };
    return { ok: true, json: async () => body };
  };
  assert.deepEqual(await listHomeStylists("customer-token"), [
    { branch: { id: "salon-a", name: "Salon A", address: "Hà Nội" },
      stylist: { id: "stylist-a", name: "Stylist An" } },
  ]);
});
