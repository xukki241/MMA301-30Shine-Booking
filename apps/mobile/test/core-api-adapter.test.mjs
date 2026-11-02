import assert from "node:assert/strict";
import test from "node:test";

import { createDemoAppointmentDataSource } from "../src/appointments/demo-adapter.ts";
import { createCoreApiAppointmentDataSource } from "../src/appointments/core-api-adapter.ts";

test("appointment list resolves actual branch, stylist and service instead of placeholders", async () => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    urls.push(path);
    const data = path === "/appointments/customer" ? { appointments: [{ id: "a1", branchId: "b1",
      serviceId: "s1", stylistId: "u1", startTime: "2030-01-01T10:00:00Z", status: "cancelled" }] }
      : path === "/branches/b1" ? { branch: { name: "30Shine Cầu Diễn", address: "65 Cầu Diễn, Hà Nội" } }
      : path === "/services/s1" ? { service: { name: "Cắt xả" } }
      : path === "/branches/b1/stylists" ? { stylists: [{ userId: "u1", displayName: "Anh Phú", phone: "0912345678" }] }
      : null;
    return { ok: Boolean(data), json: async () => data };
  };
  try {
    const items = await createCoreApiAppointmentDataSource(() => "jwt", undefined, "http://localhost:4102").list();
    assert.equal(items[0].branchName, "30Shine Cầu Diễn");
    assert.equal(items[0].branchAddress, "65 Cầu Diễn, Hà Nội");
    assert.equal(items[0].stylistName, "Anh Phú");
    assert.equal(items[0].stylistPhone, "0912345678");
    assert.equal(items[0].serviceName, "Cắt xả");
    assert.deepEqual(urls.sort(), ["/appointments/customer", "/branches/b1",
      "/services/s1", "/branches/b1/stylists"].sort());
  } finally { globalThis.fetch = originalFetch; }
});

test("appointment list loads stylist phone when the appointment already includes the stylist name", async () => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    urls.push(path);
    const data = path === "/appointments/customer"
      ? { appointments: [{ id: "a1", branchId: "b1", stylistId: "u1", stylistName: "Tên stylist cũ",
        startTime: "2030-01-01T10:00:00Z", status: "booked" }] }
      : path === "/branches/b1/stylists"
        ? { stylists: [{ userId: "u1", displayName: "Stylist Toàn", phone: "0987654321" }] }
        : null;
    return { ok: Boolean(data), json: async () => data };
  };
  try {
    const items = await createCoreApiAppointmentDataSource(() => "jwt", undefined, "http://localhost:4102").list();
    assert.equal(items[0].stylistName, "Stylist Toàn");
    assert.equal(items[0].stylistPhone, "0987654321");
    assert.deepEqual(urls.sort(), ["/appointments/customer", "/branches/b1", "/branches/b1/stylists"].sort());
  } finally { globalThis.fetch = originalFetch; }
});

test("demo appointments remain awaiting payment without a simulated pay action", async () => {
  const source = createDemoAppointmentDataSource([{ id: "a1", startTime: "2030-01-01T10:00:00Z", status: "completed", bookedPrice: 120000 }]);
  assert.equal(source.pay, undefined);
  assert.equal((await source.list())[0].status, "completed");
});

test("createCoreApiAppointmentDataSource returns empty list when no token", async () => {
  const source = createCoreApiAppointmentDataSource(() => null);
  const items = await source.list();
  assert.deepEqual(items, []);
  await assert.rejects(source.cancel("any-id"), /Vui lòng đăng nhập/);
  assert.equal(source.pay, undefined);
});

test("createCoreApiAppointmentDataSource sends Bearer token and parses response", async () => {
  const originalFetch = globalThis.fetch;
  let lastUrl = "";
  let lastHeaders = {};
  let lastMethod = "";
  let lastBody = "";

  globalThis.fetch = async (url, options) => {
    lastUrl = String(url);
    lastHeaders = options?.headers || {};
    lastMethod = options?.method || "GET";
    lastBody = options?.body || "";

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
    if (lastUrl.includes("/payment-instructions")) {
      return { ok: true, json: async () => ({ bank: "VCB", accountNumber: "123", accountHolder: "A", amount: 120000, content: "SHINEA1", qrUrl: "https://vietqr.app/img" }) };
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

    const instructions = await source.paymentInstructions("a1");
    assert.equal(instructions.amount, 120000);
    assert.equal(lastMethod, "GET");
    assert.ok(lastUrl.endsWith("/appointments/a1/payment-instructions"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
