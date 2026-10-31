const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { serve, post } = require("./helpers");

function memoryCustomers() {
  const accounts = new Map();
  const challenges = new Map();
  return {
    findByPhone: async (phone) => accounts.get(phone) || null,
    findById: async (id) => [...accounts.values()].find((x) => String(x._id) === String(id)) || null,
    async create(data) {
      if (accounts.has(data.phone)) { const error = new Error("duplicate"); error.code = 11000; throw error; }
      const account = { ...data, _id: new mongoose.Types.ObjectId(), authVersion: 0,
        loginAttempts: 0, lastFailedAt: null };
      accounts.set(data.phone, account);
      return account;
    },
    async updatePassword(phone, passwordHash) {
      const account = accounts.get(phone);
      if (!account) return null;
      account.passwordHash = passwordHash;
      account.authVersion++;
      account.loginAttempts = 0;
      account.lastFailedAt = null;
      return account;
    },
    async recordLoginFailure(phone) {
      const account = accounts.get(phone);
      if (account.lastFailedAt && Date.now() - account.lastFailedAt.getTime() >= 15 * 60 * 1000) account.loginAttempts = 0;
      account.loginAttempts++;
      account.lastFailedAt = new Date();
      return account;
    },
    async clearLoginFailures(phone) {
      const account = accounts.get(phone);
      account.loginAttempts = 0;
      account.lastFailedAt = null;
    },
    getChallenge: async (phone, purpose) => challenges.get(`${purpose}:${phone}`) || null,
    saveChallenge: async (data) => { challenges.set(`${data.purpose}:${data.phone}`, data); return data; },
    async increaseAttempts(phone, purpose) { challenges.get(`${purpose}:${phone}`).attempts++; },
    async verifyChallenge(phone, purpose, digest) {
      const challenge = challenges.get(`${purpose}:${phone}`);
      if (!challenge || challenge.digest !== digest || challenge.attempts >= 5 || challenge.expiresAt <= new Date()) return null;
      challenge.verifiedAt = new Date();
      return challenge;
    },
    async consumeChallenge(phone, purpose, digest) {
      const key = `${purpose}:${phone}`;
      const challenge = challenges.get(key);
      if (!challenge || challenge.digest !== digest || !challenge.verifiedAt || challenge.expiresAt <= new Date()) return false;
      challenges.delete(key);
      return true;
    },
  };
}

test("new customer verifies demo OTP before creating one phone account", async (t) => {
  const secret = randomBytes(32).toString("hex");
  let log = "";
  const base = await serve(t, createApp({ users: {}, customers: memoryCustomers(), secret, expiresIn: 3600,
    otpEnabled: true, otpLogger: (value) => { log = value; } }));
  assert.equal((await post(base, "/auth/customer/lookup", { phone: "0912345678" })).body.exists, false);
  assert.equal((await post(base, "/auth/customer/register/request", { phone: "0912345678" })).status, 200);
  const code = log.match(/: (\d{6})$/)?.[1];
  assert.ok(code);
  assert.equal((await post(base, "/auth/customer/register/complete", { phone: "0912345678", code, password: "123456", name: "Nguyễn An" })).status, 403);
  assert.equal((await post(base, "/auth/customer/register/verify", { phone: "0912345678", code })).status, 200);
  const created = await post(base, "/auth/customer/register/complete", { phone: "0912345678", code, password: "123456", name: "Nguyễn An" });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.phone, "+84912345678");
  assert.equal(jwt.verify(created.body.accessToken, secret).role, "customer");
  assert.equal((await post(base, "/auth/customer/register/complete", { phone: "0912345678", code, password: "123456", name: "Nguyễn An" })).status, 409);
  assert.equal((await post(base, "/auth/customer/lookup", { phone: "0912345678" })).body.exists, true);
  assert.equal((await post(base, "/auth/customer/login", { phone: "0912345678", password: "000000" })).status, 401);
  assert.equal((await post(base, "/auth/customer/login", { phone: "0912345678", password: "123456" })).status, 200);
});

test("password reset needs OTP and revokes old account version", async (t) => {
  const secret = randomBytes(32).toString("hex");
  let log = "";
  const base = await serve(t, createApp({ users: {}, customers: memoryCustomers(), secret, expiresIn: 3600,
    otpEnabled: true, otpLogger: (value) => { log = value; } }));
  await post(base, "/auth/customer/register/request", { phone: "0912345678" });
  let code = log.match(/: (\d{6})$/)?.[1];
  await post(base, "/auth/customer/register/verify", { phone: "0912345678", code });
  const before = await post(base, "/auth/customer/register/complete", { phone: "0912345678", code, password: "123456", name: "Nguyễn An" });
  assert.equal((await post(base, "/auth/customer/reset/complete", { phone: "0912345678", code, password: "654321" })).status, 403);
  await post(base, "/auth/customer/reset/request", { phone: "0912345678" });
  code = log.match(/: (\d{6})$/)?.[1];
  assert.equal((await post(base, "/auth/customer/reset/verify", { phone: "0912345678", code })).status, 200);
  assert.equal((await post(base, "/auth/customer/reset/complete", { phone: "0912345678", code, password: "654321" })).status, 200);
  assert.equal((await post(base, "/auth/customer/login", { phone: "0912345678", password: "123456" })).status, 401);
  const after = await post(base, "/auth/customer/login", { phone: "0912345678", password: "654321" });
  assert.equal(jwt.verify(after.body.accessToken, secret).authVersion, jwt.verify(before.body.accessToken, secret).authVersion + 1);
  assert.equal((await fetch(`${base}/auth/customer/introspect`, { headers: { Authorization: `Bearer ${before.body.accessToken}` } })).status, 401);
  assert.equal((await fetch(`${base}/auth/customer/introspect`, { headers: { Authorization: `Bearer ${after.body.accessToken}` } })).status, 200);
});

test("new Guest Session is closed when account flow is enabled", async (t) => {
  const base = await serve(t, createApp({ users: {}, guests: {}, customers: memoryCustomers(),
    secret: randomBytes(32).toString("hex"), expiresIn: 3600 }));
  assert.equal((await post(base, "/auth/customer/start", { name: "Nguyễn An", phone: "0912345678" })).status, 410);
  assert.equal((await post(base, "/auth/customer/resume", { deviceSecret: "0".repeat(64) })).status, 410);
  assert.equal((await post(base, "/auth/customer/recovery/request", { phone: "0912345678" })).status, 410);
});

test("six-digit customer PIN is rate limited after repeated failures", async (t) => {
  const secret = randomBytes(32).toString("hex");
  let log = "";
  const customers = memoryCustomers();
  const base = await serve(t, createApp({ users: {}, customers, secret, expiresIn: 3600,
    otpEnabled: true, otpLogger: (value) => { log = value; } }));
  await post(base, "/auth/customer/register/request", { phone: "0912345678" });
  const code = log.match(/: (\d{6})$/)?.[1];
  await post(base, "/auth/customer/register/verify", { phone: "0912345678", code });
  await post(base, "/auth/customer/register/complete", { phone: "0912345678", code, password: "123456", name: "Nguyễn An" });
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal((await post(base, "/auth/customer/login", { phone: "0912345678", password: "000000" })).status, 401);
  }
  assert.equal((await post(base, "/auth/customer/login", { phone: "0912345678", password: "123456" })).status, 429);
  const secondInstance = await serve(t, createApp({ users: {}, customers, secret, expiresIn: 3600 }));
  assert.equal((await post(secondInstance, "/auth/customer/login", { phone: "0912345678", password: "123456" })).status, 429);
});
