const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { readJwtSecret } = require("../src/middleware/auth");
const secret = randomBytes(32).toString("hex");
const sub = "507f1f77bcf86cd799439011";

test("Core startup fails before opening HTTP without JWT_SECRET", () => {
  const env = { ...process.env };
  delete env.JWT_SECRET;
  const result = spawnSync(process.execPath, [path.join(__dirname, "../src/index.js")], {
    env, encoding: "utf8", timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /JWT_SECRET/);
  assert.equal(result.stdout, "");
});

test("Core JWT middleware", async (t) => {
  const server = createApp(secret).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = "http://127.0.0.1:" + server.address().port;
  const sign = (claims, options = {}) => jwt.sign(claims, secret, { algorithm: "HS256", expiresIn: 3600, ...options });
  for (const role of ["customer", "stylist", "shop_admin"]) {
    await t.test("accepts valid " + role, async () => {
      const response = await fetch(base + "/auth/me", {
        headers: { Authorization: "Bearer " + sign({ sub, role }) },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { user: { userId: sub, role } });
    });
  }
  const invalid = {
    missing: undefined,
    malformed: "Basic abc",
    garbage: "Bearer not-a-jwt",
    "wrong signature": "Bearer " + jwt.sign({ sub, role: "customer" }, randomBytes(32).toString("hex")),
    expired: "Bearer " + sign({ sub, role: "customer" }, { expiresIn: -1 }),
    "future nbf": "Bearer " + sign({ sub, role: "customer" }, { notBefore: 3600 }),
    "wrong algorithm": "Bearer " + sign({ sub, role: "customer" }, { algorithm: "HS384" }),
    "invalid role": "Bearer " + sign({ sub, role: "admin" }),
    "multiple roles": "Bearer " + sign({ sub, role: ["customer", "stylist"] }),
    "missing subject": "Bearer " + sign({ role: "customer" }),
    "invalid subject": "Bearer " + sign({ sub: "not-an-id", role: "customer" }),
    "missing expiry": "Bearer " + jwt.sign({ sub, role: "customer" }, secret),
  };
  for (const [name, Authorization] of Object.entries(invalid)) {
    await t.test("rejects " + name, async () => {
      const response = await fetch(base + "/auth/me", { headers: Authorization ? { Authorization } : {} });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("www-authenticate"), "Bearer");
      assert.deepEqual(await response.json(), { error: "Invalid or expired bearer token" });
    });
  }
  await t.test("health remains public", async () => {
    assert.equal((await fetch(base + "/health")).status, 200);
  });
});

test("Core fails configuration without shared secret", () => {
  for (const JWT_SECRET of [undefined, "", "weak"]) {
    assert.throws(() => readJwtSecret({ JWT_SECRET }), /JWT_SECRET/);
  }
  assert.equal(readJwtSecret({ JWT_SECRET: secret }), secret);
});
