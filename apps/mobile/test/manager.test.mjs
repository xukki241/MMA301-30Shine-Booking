import assert from "node:assert/strict";
import test from "node:test";
import { managerToday } from "../src/manager/date.ts";
import { createManagerApi } from "../src/manager/api.ts";
import { canSubmitMutation, validateServiceDraft, validateShiftDraft } from "../src/manager/operations-model.ts";

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

test("Manager operation drafts reject bad service and shift data offline", () => {
  assert.match(validateServiceDraft({ name: "Cắt", price: -1, durationMinutes: 30 }), /giá/i);
  assert.match(validateShiftDraft({ stylistId: "507f1f77bcf86cd799439011", branchId: "507f1f77bcf86cd799439012",
    date: "2030-01-01", startAt: "2030-01-01T10:00:00+07:00", endAt: "2030-01-01T09:00:00+07:00" }), /kết thúc/i);
  assert.equal(canSubmitMutation("offline"), false);
  assert.equal(canSubmitMutation("online"), true);
});
