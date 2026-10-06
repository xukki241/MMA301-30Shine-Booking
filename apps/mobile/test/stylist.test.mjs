import assert from "node:assert/strict";
import test from "node:test";

import {
  completeStylistAppointment,
  getStylistTodayAppointments,
  loginStylist,
} from "../src/booking/http-adapter.ts";

test("loginStylist succeeds for stylist role and rejects non-stylist", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. Success case: role is stylist
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "mock_stylist_token",
      user: { id: "stylist123", email: "stylist@30shine.vn", role: "stylist" },
    }),
  });

  const result = await loginStylist("stylist@30shine.vn", "Password123!");
  assert.equal(result.token, "mock_stylist_token");
  assert.equal(result.user.role, "stylist");

  // 2. Failure case: role is customer
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: "mock_customer_token",
      user: { id: "cust123", email: "customer@30shine.vn", role: "customer" },
    }),
  });

  await assert.rejects(
    loginStylist("customer@30shine.vn", "Password123!"),
    /Tài khoản này không có quyền Stylist/
  );
});

test("getStylistTodayAppointments lists appointments and handles empty state", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. Empty state
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ appointments: [] }),
  });

  const emptyList = await getStylistTodayAppointments("mock_token", "2026-10-10");
  assert.deepEqual(emptyList, []);

  // 2. Returns appointment list
  const mockAppointments = [
    {
      id: "appt_001",
      customerId: "cust_1",
      stylistId: "stylist_1",
      startTime: "2026-10-10T09:00:00.000Z",
      endTime: "2026-10-10T09:45:00.000Z",
      status: "booked",
      createdAt: "2026-10-09T00:00:00.000Z",
      updatedAt: "2026-10-09T00:00:00.000Z",
    },
  ];
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ appointments: mockAppointments }),
  });

  const list = await getStylistTodayAppointments("mock_token");
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "appt_001");
  assert.equal(list[0].status, "booked");
});

test("completeStylistAppointment transitions booked appointment to completed", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let calledUrl = "";
  let calledMethod = "";
  globalThis.fetch = async (url, options) => {
    calledUrl = String(url);
    calledMethod = options?.method || "GET";
    return {
      ok: true,
      status: 200,
      json: async () => ({
        appointment: {
          id: "appt_001",
          customerId: "cust_1",
          stylistId: "stylist_1",
          startTime: "2026-10-10T09:00:00.000Z",
          endTime: "2026-10-10T09:45:00.000Z",
          status: "completed",
          createdAt: "2026-10-09T00:00:00.000Z",
          updatedAt: "2026-10-10T09:45:00.000Z",
        },
      }),
    };
  };

  const completed = await completeStylistAppointment("mock_token", "appt_001");
  assert.equal(completed.id, "appt_001");
  assert.equal(completed.status, "completed");
  assert.match(calledUrl, /\/appointments\/appt_001\/complete$/);
  assert.equal(calledMethod, "POST");

  // Error case: already completed or invalid state returns error from API
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: "Invalid appointment state" }),
  });

  await assert.rejects(
    completeStylistAppointment("mock_token", "appt_001"),
    /Invalid appointment state/
  );
});
