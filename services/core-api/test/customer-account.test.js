const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { createBookingService } = require("../src/booking/service");

test("registered customer token is accepted and guest cannot create a new booking", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const id = "507f1f77bcf86cd799439011";
  const app = createApp({ secret, verifyCustomer: async () => true });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ role: "customer", authVersion: 0 }, secret, { subject: id, expiresIn: 3600 });
  const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.userId, id);
  const service = createBookingService({});
  await assert.rejects(() => service.book({ role: "customer", guest: true, userId: id }, {}), /Registered customer account required/);
});

test("legacy Guest token cannot access Core appointments", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const server = createApp({ secret, bookingRepository: { listByCustomer: async () => [] } }).listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  await new Promise((resolve) => server.once("listening", resolve));
  const token = jwt.sign({ role: "customer", guest: true, phone: "+84912345678", name: "Khách thử",
    phoneVerified: true }, secret, { subject: "507f1f77bcf86cd799439011", expiresIn: 3600 });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/appointments/customer`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 401);
});

test("public catalog exposes only active branch summary", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const Branch = { find: async (query) => {
    assert.deepEqual(query, { isActive: true });
    return [{ _id: "507f1f77bcf86cd799439011", name: "Quận 1", address: "123 Đường A", phone: "0123", isActive: true }];
  } };
  const server = createApp({ secret, models: { Branch } }).listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  await new Promise((resolve) => server.once("listening", resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/public/branches`);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).branches, [{ id: "507f1f77bcf86cd799439011", name: "Quận 1", address: "123 Đường A" }]);
});

test("registered customer never inherits legacy Guest appointments with the same phone", async () => {
  const ownId = "507f1f77bcf86cd799439012";
  const legacyId = "507f1f77bcf86cd799439013";
  const service = createBookingService({
    listByCustomer: async (id) => id === ownId ? [{ id: "new", customerId: ownId }] : [],
    listByPhone: async () => [{ id: "old", customerId: legacyId }],
  });
  const appointments = await service.listCustomerAppointments({ role: "customer", guest: false,
    userId: ownId, phone: "+84912345678" });
  assert.deepEqual(appointments.map((item) => item.id), ["new"]);
});

test("public service catalog rejects inactive branches and filters services", async (t) => {
  const id = "507f1f77bcf86cd799439011";
  let active = false;
  const Branch = { findById: async () => ({ _id: id, isActive: active }) };
  const Service = { find: async (query) => {
    assert.equal(query.branchId, id);
    assert.equal(query.isActive, true);
    return [{ _id: id, name: "Cắt tóc", price: 100000, durationMinutes: 45, description: "Combo" }];
  } };
  const server = createApp({ secret: randomBytes(32).toString("hex"), models: { Branch, Service } }).listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}/public/branches/${id}/services`;
  assert.equal((await fetch(url)).status, 404);
  active = true;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).services, [{ id, name: "Cắt tóc", price: 100000,
    durationMinutes: 45, description: "Combo" }]);
});
