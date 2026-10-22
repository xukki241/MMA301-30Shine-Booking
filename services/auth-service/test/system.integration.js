const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { createApp: createAuthApp } = require("../src/app");
const { createUserModel, createUserRepository } = require("../src/models/user");
const { createGuestModels, createGuestRepository } = require("../src/customer-guest");
const { createCustomerModels, createCustomerRepository } = require("../src/customer-account");
const { createAuditLogModel, createAuditRepository } = require("../src/audit-log");
const { bootstrapSystemAdmin } = require("../src/staff-migration");
const { createCoreAuditProbe } = require("../src/staff-admin");
const { createStylistChangeGuard } = require("../src/stylist-change-guard");
const { createApp: createCoreApp } = require("../../core-api/src/app");
const { createModels } = require("../../core-api/src/models");

const databaseUri = (suffix) => {
  const uri = new URL(process.env.TEST_MONGODB_URI);
  uri.pathname = `/shine26_${suffix}`;
  return uri.toString();
};
const tokenHeader = (token) => ({ Authorization: `Bearer ${token}` });
async function request(base, path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${base}${path}`, { method,
    headers: { ...(token ? tokenHeader(token) : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}

test("SHINE-26: Auth and Core enforce staff roles against real MongoDB", async (t) => {
  assert.ok(process.env.TEST_MONGODB_URI, "Set TEST_MONGODB_URI to an isolated MongoDB server");
  const suffix = randomBytes(8).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const authDb = mongoose.createConnection(databaseUri(`${suffix}_auth`), { serverSelectionTimeoutMS: 5000 });
  const coreDb = mongoose.createConnection(databaseUri(`${suffix}_core`), { serverSelectionTimeoutMS: 5000 });
  let authServer;
  let coreServer;
  t.after(async () => {
    for (const server of [coreServer, authServer]) {
      if (server) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    }
    for (const connection of [coreDb, authDb]) {
      if (connection.readyState === 1) await connection.dropDatabase();
      await connection.close();
    }
  });
  await Promise.all([authDb.asPromise(), coreDb.asPromise()]);

  const User = createUserModel(authDb);
  const guests = createGuestModels(authDb);
  const customers = createCustomerModels(authDb);
  const authAudit = createAuditLogModel(authDb);
  const coreModels = createModels(coreDb);
  await Promise.all([User.init(), guests.Guest.init(), guests.Recovery.init(), customers.Account.init(), customers.Challenge.init(), authAudit.init(),
    ...Object.values(coreModels).map((model) => model.init())]);
  await bootstrapSystemAdmin(User, "root@example.test", "Password123!");

  let authBase;
  let coreBase;
  let demoOtp = "";
  const authApp = createAuthApp({ users: createUserRepository(User),
    guests: createGuestRepository(guests), customers: createCustomerRepository(customers), audit: createAuditRepository(authAudit),
    secret, expiresIn: 3600, otpEnabled: true, otpLogger: (value) => { demoOtp = value; },
    staffChangeGuard: (id) => createStylistChangeGuard({ coreApiUrl: coreBase, secret })(id),
    coreHealthProbe: async () => (await fetch(`${coreBase}/health`)).json(),
    coreAuditProbe: (filters) => createCoreAuditProbe(coreBase, secret)(filters) });
  authServer = authApp.listen(0, "127.0.0.1");
  await once(authServer, "listening");
  authBase = `http://127.0.0.1:${authServer.address().port}`;
  coreServer = createCoreApp({ models: coreModels, secret, authServiceUrl: authBase,
    verifyStaff: async (token) => (await fetch(`${authBase}/auth/introspect`, {
      headers: tokenHeader(token) })).ok }).listen(0, "127.0.0.1");
  await once(coreServer, "listening");
  coreBase = `http://127.0.0.1:${coreServer.address().port}`;

  const adminLogin = await request(authBase, "/auth/login", { method: "POST",
    body: { email: "root@example.test", password: "Password123!" } });
  assert.equal(adminLogin.status, 200);
  const admin = adminLogin.body.accessToken;
  const createStaff = async (email, role) => request(authBase, "/admin/users", { token: admin,
    method: "POST", body: { email, fullName: email.startsWith("stylist") ? "Thợ thử nghiệm" : "Nhân sự thử nghiệm", password: "Password123!", role } });
  const managerCreated = await createStaff("manager@example.test", "general_manager");
  const stylistCreated = await createStaff("stylist@example.test", "stylist");
  assert.equal(managerCreated.status, 201);
  assert.equal(stylistCreated.status, 201);
  const managerLogin = await request(authBase, "/auth/login", { method: "POST",
    body: { email: "manager@example.test", password: "Password123!" } });
  const manager = managerLogin.body.accessToken;

  const branchInput = { name: "Chi nhánh thử nghiệm", address: "123 Đường Thử Nghiệm" };
  assert.equal((await request(coreBase, "/branches", { token: admin, method: "POST", body: branchInput })).status, 403);
  assert.equal((await request(authBase, "/admin/users", { token: manager })).status, 403);
  assert.equal((await request(authBase, "/admin/health", { token: manager })).status, 403);
  assert.equal((await request(authBase, "/admin/audit", { token: manager })).status, 403);
  const branchCreated = await request(coreBase, "/branches", { token: manager, method: "POST", body: branchInput });
  assert.equal(branchCreated.status, 201);
  const branchId = branchCreated.body.branch.id;
  const stylistId = stylistCreated.body.user.id;
  assert.equal((await request(coreBase, "/branches", { token: admin })).status, 403);
  assert.equal((await request(coreBase, "/branches")).status, 401);
  assert.equal((await request(coreBase, `/branches/${branchId}/stylists`, { token: manager,
    method: "POST", body: { userId: managerCreated.body.user.id } })).status, 409);
  const lockedStylist = await createStaff("locked-stylist@example.test", "stylist");
  assert.equal(lockedStylist.status, 201);
  assert.equal((await request(authBase, `/admin/users/${lockedStylist.body.user.id}/lock`, {
    token: admin, method: "POST" })).status, 200);
  assert.equal((await request(coreBase, `/branches/${branchId}/stylists`, { token: manager,
    method: "POST", body: { userId: lockedStylist.body.user.id } })).status, 409);
  const assignment = await request(coreBase, `/branches/${branchId}/stylists`, { token: manager,
    method: "POST", body: { userId: stylistId } });
  assert.equal(assignment.status, 201);
  assert.equal(assignment.body.stylist.displayName, "Thợ thử nghiệm");
  assert.equal((await request(authBase, `/admin/users/${stylistId}`, { token: admin, method: "PATCH",
    body: { fullName: "Thợ đổi tên" } })).status, 200);
  const renamed = await request(coreBase, `/branches/${branchId}/stylists`, { token: manager });
  assert.equal(renamed.body.stylists[0].displayName, "Thợ đổi tên");
  const shift = await request(coreBase, "/work-shifts", { token: manager, method: "POST",
    body: { branchId, stylistId, date: "2030-01-01", startAt: "2030-01-01T09:00:00+07:00",
      endAt: "2030-01-01T10:00:00+07:00" } });
  assert.equal(shift.status, 201);
  assert.equal((await request(authBase, `/admin/users/${stylistId}/lock`, { token: admin, method: "POST" })).status, 409);
  assert.equal((await request(authBase, `/admin/users/${stylistId}`, { token: admin,
    method: "PATCH", body: { role: "general_manager" } })).status, 409);

  assert.equal((await request(authBase, "/auth/customer/start", { method: "POST",
    body: { name: "Khách thử nghiệm", phone: "0912345678" } })).status, 410);
  assert.equal((await request(authBase, "/auth/customer/register/request", { method: "POST",
    body: { phone: "0912345678" } })).status, 200);
  const code = demoOtp.match(/: (\d{6})$/)?.[1];
  assert.ok(code);
  assert.equal((await request(authBase, "/auth/customer/register/verify", { method: "POST",
    body: { phone: "0912345678", code } })).status, 200);
  const customer = await request(authBase, "/auth/customer/register/complete", { method: "POST",
    body: { name: "Khách thử nghiệm", phone: "0912345678", code, password: "123456" } });
  assert.equal(customer.status, 201);
  const staffList = await request(authBase, "/admin/users", { token: admin });
  assert.equal(staffList.status, 200);
  assert.equal(staffList.body.users.length, 4);
  assert.equal(staffList.body.users.some((user) => user.id === customer.body.user.id), false);
  const health = await request(authBase, "/admin/health", { token: admin });
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.ok(health.body.checkedAt);

  const managerId = managerCreated.body.user.id;
  assert.equal((await request(authBase, `/admin/users/${managerId}/lock`, { token: admin, method: "POST" })).status, 200);
  assert.equal((await request(coreBase, "/work-shifts", { token: manager })).status, 401);
  const audit = await request(authBase, "/admin/audit", { token: admin });
  assert.equal(audit.status, 200);
  assert.ok(audit.body.events.some((event) => event.action === "staff.lock"));
  assert.ok(audit.body.events.some((event) => event.action === "branch.create"));
  assert.equal(JSON.stringify(audit.body).includes("Password123!"), false);
  const todayInVietnam = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const sameDay = await request(authBase,
    `/admin/audit?from=${todayInVietnam}&to=${todayInVietnam}`, { token: admin });
  assert.equal(sameDay.status, 200);
  assert.ok(sameDay.body.events.some((event) => event.action === "staff.lock"));
  assert.equal((await request(authBase, "/admin/audit?to=2030-02-31", { token: admin })).status, 400);
  assert.equal(jwt.decode(customer.body.accessToken).role, "customer");
});
