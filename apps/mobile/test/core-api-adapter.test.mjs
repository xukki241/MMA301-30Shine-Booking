import assert from "node:assert/strict";
import test from "node:test";

import { createDemoAppointmentDataSource } from "../src/appointments/demo-adapter.ts";
import { createCoreApiAppointmentDataSource } from "../src/appointments/core-api-adapter.ts";

test("demoAppointmentDataSource supports pay for completed appointments", async () => {
  const sample = [
    { id: "a1", branchName: "B", serviceName: "S", stylistName: "St", startTime: "2030-01-01T10:00:00Z", status: "completed" },
    { id: "a2", branchName: "B", serviceName: "S", stylistName: "St", startTime: "2030-01-01T11:00:00Z", status: "booked" },
  ];
  const source = createDemoAppointmentDataSource(sample);
  const paid = await source.pay("a1");
  assert.equal(paid.status, "paid");
  assert.equal((await source.list())[0].status, "paid");

  // Cannot pay a booked appointment
  await assert.rejects(source.pay("a2"), /Chỉ có thể thanh toán/);
});

test("createCoreApiAppointmentDataSource returns empty list when no token", async () => {
  const source = createCoreApiAppointmentDataSource(() => null);
  const items = await source.list();
  assert.deepEqual(items, []);
  await assert.rejects(source.cancel("any-id"), /Vui lòng đăng nhập/);
  await assert.rejects(source.pay("any-id"), /Vui lòng đăng nhập/);
});

test("createCoreApiAppointmentDataSource sends Bearer token and parses response", async () => {
  const originalFetch = globalThis.fetch;
  let lastUrl = "";
  let lastHeaders = {};
  let lastMethod = "";

  globalThis.fetch = async (url, options) => {
    lastUrl = String(url);
    lastHeaders = options?.headers || {};
    lastMethod = options?.method || "GET";

    if (lastUrl.includes("/appointments/customer")) {
      return {
        ok: true,
        json: async () => ({
          appointments: [
            { id: "a1", customerId: "c1", stylistId: "s1", startTime: "2026-10-10T10:00:00Z", status: "booked" }
          ],
        }),
      };
    }
    if (lastUrl.includes("/cancel")) {
      return {
        ok: true,
        json: async () => ({
          appointment: { id: "a1", customerId: "c1", stylistId: "s1", startTime: "2026-10-10T10:00:00Z", status: "cancelled" }
        }),
      };
    }
    if (lastUrl.includes("/pay")) {
      return {
        ok: true,
        json: async () => ({
          appointment: { id: "a1", customerId: "c1", stylistId: "s1", startTime: "2026-10-10T10:00:00Z", status: "paid" }
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
  };

  try {
    const source = createCoreApiAppointmentDataSource(() => "mock-jwt-token", () => undefined, "http://localhost:4102");
    const items = await source.list();
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "a1");
    assert.equal(lastHeaders.Authorization, "Bearer mock-jwt-token");
    assert.equal(lastUrl, "http://localhost:4102/appointments/customer");

    const cancelled = await source.cancel("a1");
    assert.equal(cancelled.status, "cancelled");
    assert.equal(lastMethod, "POST");
    assert.ok(lastUrl.endsWith("/appointments/a1/cancel"));

    const paid = await source.pay("a1");
    assert.equal(paid.status, "paid");
    assert.equal(lastMethod, "POST");
    assert.ok(lastUrl.endsWith("/appointments/a1/pay"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
