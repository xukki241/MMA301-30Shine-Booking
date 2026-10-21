const assert = require("node:assert/strict");
const { once } = require("node:events");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { createApp: createCoreApp } = require("../../core-api/src/app");
const { createStaffVerifier } = require("../../core-api/src/middleware/auth");

function assertNoPassword(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!["password", "passwordHash"].includes(key), "Response must not expose " + key);
    assertNoPassword(child);
  }
}

async function serve(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return "http://127.0.0.1:" + server.address().port;
}

async function post(base, endpoint, body) {
  const response = await fetch(base + endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const json = await response.json();
  assertNoPassword(json);
  return { status: response.status, body: json, headers: response.headers };
}

// The same staff contract runs against an in-memory repository and real MongoDB.
async function authContract(t, { users, inspect, secret }) {
  const password = "Demo-password-2026!";
  await users.create({ email: "admin@example.test", passwordHash: await bcrypt.hash(password, 12),
    role: "system_admin", status: "active", authVersion: 0 });
  const base = await serve(t, createApp({ users, secret, expiresIn: 3600 }));
  const core = await serve(t, createCoreApp({ secret, verifyStaff: createStaffVerifier(base) }));
  const adminLogin = await post(base, "/auth/login", { email: "admin@example.test", password });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.accessToken;
  const sessionTokens = new Map();
  const create = async (email, role) => {
    const response = await fetch(base + "/admin/users", { method: "POST", headers: {
      Authorization: "Bearer " + adminToken, "Content-Type": "application/json",
    }, body: JSON.stringify({ email, password, role }) });
    return { status: response.status, body: await response.json() };
  };
  for (const role of ["stylist", "general_manager", "system_admin"]) {
    await t.test("System Admin creates and staff logs in: " + role, async () => {
      const email = role + "@example.test";
      const created = await create(email, role);
      assert.equal(created.status, 201);
      assert.equal(created.body.user.role, role);
      const stored = await inspect(email);
      assert.notEqual(stored.passwordHash, password);
      assert.equal(await bcrypt.compare(password, stored.passwordHash), true);
      assert.equal(bcrypt.getRounds(stored.passwordHash), 12);
      const login = await post(base, "/auth/login", { email: email.toUpperCase(), password });
      assert.equal(login.status, 200);
      sessionTokens.set(role, login.body.accessToken);
      assert.equal(login.headers.get("cache-control"), "no-store");
      const claims = jwt.verify(login.body.accessToken, secret, { algorithms: ["HS256"] });
      assert.equal(claims.role, role);
      assert.equal(claims.authVersion, 0);
      assert.equal(claims.exp - claims.iat, 3600);
      const verified = await fetch(core + "/auth/me", {
        headers: { Authorization: "Bearer " + login.body.accessToken },
      });
      assert.equal(verified.status, 200);
      assert.equal((await verified.json()).user.role, role);
    });
  }
  await t.test("locking staff invalidates the existing Core API session", async () => {
    const manager = await inspect("general_manager@example.test");
    const lock = await fetch(`${base}/admin/users/${manager._id}/lock`, {
      method: "POST", headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(lock.status, 200);
    const response = await fetch(core + "/auth/me", {
      headers: { Authorization: "Bearer " + sessionTokens.get("general_manager") },
    });
    assert.equal(response.status, 401);
  });
  await t.test("public registration is closed for every role", async () => {
    for (const role of ["customer", "stylist", "general_manager", "system_admin", "shop_admin"]) {
      assert.equal((await post(base, "/auth/register", { email: "x@example.test", password, role })).status, 410);
    }
  });
  await t.test("duplicate email and concurrent creation are rejected", async () => {
    assert.equal((await create("STYLIST@example.test", "stylist")).status, 409);
    const results = await Promise.all([create("race@example.test", "stylist"), create("race@example.test", "stylist")]);
    assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  });
  await t.test("invalid staff details are rejected", async () => {
    for (const role of ["admin", "Customer", ["stylist", "general_manager"], null]) {
      assert.equal((await create("invalid@example.test", role)).status, 400);
    }
    assert.equal((await create("bad", "stylist")).status, 400);
  });
  await t.test("invalid login is generic", async () => {
    for (const email of ["stylist@example.test", "missing@example.test"]) {
      const response = await post(base, "/auth/login", { email, password: "wrong-password" });
      assert.equal(response.status, 401);
      assert.deepEqual(response.body, { error: "Invalid email or password" });
    }
  });
}
module.exports = { serve, post, authContract };
