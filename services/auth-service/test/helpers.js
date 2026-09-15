const assert = require("node:assert/strict");
const { once } = require("node:events");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { createApp: createCoreApp } = require("../../core-api/src/app");

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

// Same HTTP contract runs with an explicit unit-test double and with real MongoDB.
async function authContract(t, { users, inspect, secret }) {
  const base = await serve(t, createApp({ users, secret, expiresIn: 3600 }));
  const core = await serve(t, createCoreApp(secret));
  const password = "Demo-password-2026!";
  for (const role of ["customer", "stylist", "shop_admin"]) {
    await t.test("register, bcrypt storage, login and Core JWT: " + role, async () => {
      const email = role + "@example.test";
      const registered = await post(base, "/auth/register", {
        email: "  " + email.toUpperCase() + "  ", password, role,
      });
      assert.equal(registered.status, 201);
      assert.deepEqual(Object.keys(registered.body.user).sort(), ["email", "id", "role"]);
      assert.equal(registered.body.user.email, email);
      assert.equal(registered.body.user.role, role);
      const stored = await inspect(email);
      assert.notEqual(stored.passwordHash, password);
      assert.equal(await bcrypt.compare(password, stored.passwordHash), true);
      assert.equal(bcrypt.getRounds(stored.passwordHash), 12);
      assert.equal(stored.password, undefined);
      const login = await post(base, "/auth/login", { email: email.toUpperCase(), password });
      assert.equal(login.status, 200);
      assert.equal(login.headers.get("cache-control"), "no-store");
      assert.equal(login.body.tokenType, "Bearer");
      assert.equal(login.body.expiresIn, 3600);
      const payload = jwt.verify(login.body.accessToken, secret, { algorithms: ["HS256"] });
      assertNoPassword(payload);
      assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub"]);
      assert.equal(payload.sub, registered.body.user.id);
      assert.equal(payload.role, role);
      assert.equal(payload.exp - payload.iat, 3600);
      const verified = await fetch(core + "/auth/me", {
        headers: { Authorization: "Bearer " + login.body.accessToken },
      });
      assert.equal(verified.status, 200);
      assert.deepEqual(await verified.json(), { user: { userId: payload.sub, role } });
    });
  }
  await t.test("normalized duplicate email returns 409", async () => {
    assert.equal((await post(base, "/auth/register", {
      email: " CUSTOMER@example.test ", password, role: "stylist",
    })).status, 409);
  });
  await t.test("concurrent registration: one 201 and one 409", async () => {
    const input = { email: "race@example.test", password, role: "customer" };
    const responses = await Promise.all([post(base, "/auth/register", input), post(base, "/auth/register", input)]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  });
  await t.test("unknown role and multi-role are 400", async () => {
    for (const role of ["admin", "Customer", ["customer", "stylist"], null, {}]) {
      assert.equal((await post(base, "/auth/register", { email: "invalid@example.test", password, role })).status, 400);
    }
  });
  await t.test("invalid and malformed inputs are 400", async () => {
    for (const input of [null, [], {}, { email: { $ne: null }, password, role: "customer" },
      { email: "bad", password, role: "customer" },
      { email: "valid@example.test", password: "short", role: "customer" },
      { email: "valid@example.test", password: "é".repeat(37), role: "customer" },
      { email: "valid@example.test", password, role: "customer", passwordHash: "injected" }]) {
      assert.equal((await post(base, "/auth/register", input)).status, 400);
    }
    const malformed = await fetch(base + "/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "Invalid JSON body" });
    assert.equal((await post(base, "/auth/login", { email: [], password })).status, 400);
  });
  await t.test("wrong password and nonexistent user are 401 without credential details", async () => {
    for (const email of ["customer@example.test", "missing@example.test"]) {
      const response = await post(base, "/auth/login", { email, password: "wrong-password" });
      assert.equal(response.status, 401);
      assert.deepEqual(response.body, { error: "Invalid email or password" });
    }
    assert.equal((await post(base, "/auth/login", {
      email: "customer@example.test", password: "wrong",
    })).status, 401);
  });
}
module.exports = { serve, post, authContract };
