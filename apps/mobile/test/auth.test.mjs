import assert from "node:assert/strict";
import test from "node:test";

import { createHttpBookingAdapter, loginStylist } from "../src/booking/http-adapter.ts";
import { isTokenExpired } from "../src/providers/auth-utils.ts";

function createJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake_signature`;
}

test("isTokenExpired handles valid, expired and malformed JWTs", () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(isTokenExpired(createJwt({ exp: now + 3600 })), false);
  assert.equal(isTokenExpired(createJwt({ exp: now - 60 })), true);
  assert.equal(isTokenExpired(createJwt({ exp: now + 2 })), true);
  assert.equal(isTokenExpired("not_a_jwt"), true);
});

test("mobile credential login accepts Stylist and rejects Manager/Admin roles", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  let role = "stylist";
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(options.body) });
    return { ok: true, status: 200, json: async () => ({
      accessToken: "staff_token", user: { id: "staff_id", email: "staff@example.test", role },
    }) };
  };

  const stylist = await loginStylist("staff@example.test", "Password123!");
  assert.equal(stylist.user.role, "stylist");
  assert.equal(stylist.user.password, undefined);
  assert.match(requests[0].url, /\/auth\/login$/);
  assert.deepEqual(requests[0].body, { email: "staff@example.test", password: "Password123!" });

  for (role of ["general_manager", "system_admin", "customer"]) {
    await assert.rejects(loginStylist("staff@example.test", "Password123!"), /quyền Stylist/);
  }
});

test("Customer catalog and time slot reads carry the Guest Session token", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), authorization: options.headers.Authorization });
    return { ok: true, status: 200, json: async () => ({ branches: [], services: [], stylists: [], slots: [] }) };
  };
  const adapter = createHttpBookingAdapter(() => "guest_token");
  await adapter.listBranches();
  await adapter.listServices("507f1f77bcf86cd799439011");
  await adapter.listStylists("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012");
  await adapter.listTimeSlots({ branchId: "507f1f77bcf86cd799439011", serviceId: "507f1f77bcf86cd799439012", stylistId: "507f1f77bcf86cd799439013", date: "2030-10-20" });
  assert.equal(calls.length, 4);
  assert.ok(calls.every((call) => call.authorization === "Bearer guest_token"));
});
