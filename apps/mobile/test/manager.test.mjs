import assert from "node:assert/strict";
import test from "node:test";
import { managerToday } from "../src/manager/date.ts";
import { createManagerApi } from "../src/manager/api.ts";

test("Manager date uses Vietnam timezone", () => {
  assert.equal(managerToday(new Date("2030-10-20T17:01:00Z")), "2030-10-21");
});

test("Manager API keeps filters and clears revoked session", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls = [];
  let unauthorized = 0;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init.headers });
    if (calls.length === 2) return { ok: false, status: 401, json: async () => ({ error: "revoked" }) };
    return { ok: true, status: 200, json: async () => ({ items: [], nextCursor: null }) };
  };
  const api = createManagerApi(() => "manager-token", () => { unauthorized++; }, "http://example.test");
  await api.appointments({ date: "2030-10-21", status: "booked", limit: 20 });
  assert.match(calls[0].url, /date=2030-10-21.*status=booked.*limit=20/);
  assert.equal(calls[0].headers.Authorization, "Bearer manager-token");
  await assert.rejects(api.overview({ date: "2030-10-21" }), /Phiên đã hết hạn/);
  assert.equal(unauthorized, 1);
  assert.throws(() => api.payments({ branchId: "" }), /chi nhánh/i);
});
