const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { createApp } = require("../src/app");
const { serve, post } = require("./helpers");

test("System Admin creates staff; Manager cannot manage accounts; public registration is closed", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const records = new Map();
  const seed = async (email, role) => {
    const user = { _id: new mongoose.Types.ObjectId(), email, role, status: "active", authVersion: 0,
      passwordHash: await bcrypt.hash("Password123!", 4) };
    records.set(String(user._id), user);
    return user;
  };
  await seed("admin@example.test", "system_admin");
  await seed("manager@example.test", "general_manager");
  const users = {
    findByEmail: async (email) => [...records.values()].find((user) => user.email === email) || null,
    findById: async (id) => records.get(String(id)) || null,
    list: async () => [...records.values()],
    create: async (data) => { const user = { ...data, _id: new mongoose.Types.ObjectId(), status: "active", authVersion: 0 }; records.set(String(user._id), user); return user; },
    updateById: async (id, changes) => {
      const user = records.get(String(id));
      if (!user) return null;
      Object.assign(user, changes);
      user.authVersion++;
      return user;
    },
    countActiveAdmins: async () => [...records.values()].filter((user) => user.role === "system_admin" && user.status === "active").length,
    databaseHealth: () => true,
  };
  const events = [];
  const audit = { write: async (entry) => { events.push(entry); }, list: async () => events };
  let stylistClear = true;
  let coreAvailable = true;
  const base = await serve(t, createApp({ users, secret, expiresIn: 3600,
    staffChangeGuard: async () => stylistClear,
    coreHealthProbe: async () => {
      if (!coreAvailable) throw new Error("Core offline");
      return { ok: true, database: { ok: true } };
    },
    coreAuditProbe: async () => {
      if (!coreAvailable) throw new Error("Core offline");
      return [{ action: "branch.create", targetType: "branch", targetId: "branch-1",
        result: "success", occurredAt: new Date() }];
    }, audit }));
  const login = async (email) => (await post(base, "/auth/login", { email, password: "Password123!" })).body.accessToken;
  const admin = await login("admin@example.test");
  const manager = await login("manager@example.test");
  assert.ok(admin);
  assert.ok(manager);
  const health = await fetch(`${base}/admin/health`, { headers: { Authorization: `Bearer ${admin}` } });
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.services.auth.ok, true);
  assert.equal(healthBody.services.core.ok, true);
  assert.equal(healthBody.services.authDatabase.ok, true);
  assert.equal(healthBody.services.coreDatabase.ok, true);
  assert.ok(new Date(healthBody.checkedAt).getTime() > 0);
  assert.equal((await fetch(`${base}/admin/health`, { headers: { Authorization: `Bearer ${manager}` } })).status, 403);
  coreAvailable = false;
  const degraded = await (await fetch(`${base}/admin/health`, { headers: { Authorization: `Bearer ${admin}` } })).json();
  assert.equal(degraded.ok, false);
  assert.equal(degraded.services.core.ok, false);
  assert.equal(degraded.services.coreDatabase.ok, false);
  assert.equal((await fetch(`${base}/admin/audit`, { headers: { Authorization: `Bearer ${admin}` } })).status, 503);
  coreAvailable = true;
  const create = (token) => fetch(`${base}/admin/users`, { method: "POST", headers: {
    Authorization: `Bearer ${token}`, "Content-Type": "application/json",
  }, body: JSON.stringify({ email: "stylist@example.test", password: "Password123!", role: "stylist" }) });
  assert.equal((await create(manager)).status, 403);
  const response = await create(admin);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.user.email, "stylist@example.test");
  assert.equal(body.user.role, "stylist");
  assert.equal(JSON.stringify(body).includes("passwordHash"), false);
  const stylistToken = await login("stylist@example.test");
  assert.equal((await fetch(`${base}/auth/introspect`, { headers: { Authorization: `Bearer ${stylistToken}` } })).status, 200);
  const headers = { Authorization: `Bearer ${admin}`, "Content-Type": "application/json" };
  stylistClear = false;
  assert.equal((await fetch(`${base}/admin/users/${body.user.id}/lock`, { method: "POST", headers })).status, 409);
  stylistClear = true;
  const lock = await fetch(`${base}/admin/users/${body.user.id}/lock`, { method: "POST", headers });
  assert.equal(lock.status, 200);
  assert.equal((await lock.json()).user.status, "locked");
  assert.equal((await fetch(`${base}/auth/introspect`, { headers: { Authorization: `Bearer ${stylistToken}` } })).status, 401);
  assert.equal((await post(base, "/auth/login", { email: "stylist@example.test", password: "Password123!" })).status, 401);
  const restore = await fetch(`${base}/admin/users/${body.user.id}/restore`, { method: "POST", headers });
  assert.equal(restore.status, 200);
  const edited = await fetch(`${base}/admin/users/${body.user.id}`, { method: "PATCH", headers,
    body: JSON.stringify({ role: "general_manager" }) });
  assert.equal(edited.status, 200);
  assert.equal((await edited.json()).user.role, "general_manager");
  const list = await fetch(`${base}/admin/users`, { headers });
  assert.equal(list.status, 200);
  assert.equal((await list.json()).users.length, 3);
  const adminId = [...records.values()].find((user) => user.email === "admin@example.test")._id;
  assert.equal((await fetch(`${base}/admin/users/${adminId}/lock`, { method: "POST", headers })).status, 409);
  const auditResponse = await fetch(`${base}/admin/audit`, { headers });
  assert.equal(auditResponse.status, 200);
  const auditBody = await auditResponse.json();
  assert.ok(auditBody.events.some((event) => event.action === "staff.create" && event.targetId === body.user.id));
  assert.ok(auditBody.events.some((event) => event.action === "branch.create"));
  assert.equal(JSON.stringify(auditBody).includes("Password123!"), false);
  assert.equal((await fetch(`${base}/admin/audit`, { headers: { Authorization: `Bearer ${manager}` } })).status, 403);
  assert.equal((await post(base, "/auth/register", { email: "x@example.test", password: "Password123!", role: "system_admin" })).status, 410);

  const secondAdmin = await fetch(`${base}/admin/users`, { method: "POST", headers,
    body: JSON.stringify({ email: "second-admin@example.test", password: "Password123!", role: "system_admin" }) });
  assert.equal(secondAdmin.status, 201);
  const secondAdminId = (await secondAdmin.json()).user.id;
  const removalResults = await Promise.all([String(adminId), secondAdminId].map(async (id) =>
    (await fetch(`${base}/admin/users/${id}/lock`, { method: "POST", headers })).status));
  assert.equal(removalResults.filter((status) => status === 200).length, 1);
  assert.equal(await users.countActiveAdmins(), 1);
});
