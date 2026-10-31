const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { normalizePhone } = require("../src/customer-guest");
const { serve, post } = require("./helpers");

function memoryGuests() {
  const profiles = new Map();
  const recoveries = new Map();
  return {
    async create(data) {
      const guest = { ...data, _id: new mongoose.Types.ObjectId(), verifiedAt: null };
      profiles.set(data.deviceHash, guest);
      return guest;
    },
    findByDeviceHash: async (deviceHash) => profiles.get(deviceHash) || null,
    async markVerified(id) {
      const guest = [...profiles.values()].find((item) => String(item._id) === String(id));
      guest.verifiedAt = new Date();
      return guest;
    },
    findRecovery: async (phone) => recoveries.get(phone) || null,
    async saveRecovery(data) { recoveries.set(data.phone, data); return data; },
    async increaseAttempts(phone) { recoveries.get(phone).attempts++; },
    async consumeRecovery(phone, digest) {
      const current = recoveries.get(phone);
      if (!current || current.digest !== digest || current.attempts >= 5 || current.expiresAt <= new Date()) return null;
      recoveries.delete(phone);
      return current;
    },
  };
}

test("guest customer start, resume and mock OTP recovery", async (t) => {
  const secret = randomBytes(32).toString("hex");
  let logged = "";
  const base = await serve(t, createApp({ users: {}, guests: memoryGuests(), secret, expiresIn: 3600,
    otpEnabled: true, otpLogger: (value) => { logged = value; } }));
  assert.equal(normalizePhone("0912 345 678"), "+84912345678");
  assert.equal((await post(base, "/auth/customer/start", { name: "A", phone: "0912345678" })).status, 400);
  const first = await post(base, "/auth/customer/start", { name: "Nguyễn An", phone: "0912345678" });
  assert.equal(first.status, 201);
  assert.equal(first.body.user.email, undefined);
  assert.equal(first.body.user.phone, "+84912345678");
  assert.equal(first.body.deviceSecret.length, 64);
  const firstClaims = jwt.verify(first.body.accessToken, secret);
  assert.equal(firstClaims.role, "customer");
  assert.equal(firstClaims.phoneVerified, false);
  const resumed = await post(base, "/auth/customer/resume", { deviceSecret: first.body.deviceSecret });
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.user.id, first.body.user.id);
  assert.equal((await post(base, "/auth/customer/resume", { deviceSecret: "0".repeat(64) })).status, 401);

  const second = await post(base, "/auth/customer/start", { name: "Nguyễn An", phone: "+84912345678" });
  assert.notEqual(second.body.user.id, first.body.user.id);
  const request = await post(base, "/auth/customer/recovery/request", { phone: "0912345678" });
  assert.equal(request.status, 200);
  const code = logged.match(/: (\d{6})$/)?.[1];
  assert.ok(code);
  assert.equal((await post(base, "/auth/customer/recovery/request", { phone: "0912345678" })).status, 429);
  const wrongCode = code === "999999" ? "000000" : "999999";
  assert.equal((await post(base, "/auth/customer/recovery/verify", { phone: "0912345678", code: wrongCode, deviceSecret: second.body.deviceSecret })).status, 401);
  assert.equal((await post(base, "/auth/customer/recovery/verify", { phone: "0912345678", code, deviceSecret: first.body.deviceSecret })).status, 200);
  const verified = await post(base, "/auth/customer/recovery/verify", { phone: "0912345678", code, deviceSecret: second.body.deviceSecret });
  assert.equal(verified.status, 401, "OTP is single use");
  const after = await post(base, "/auth/customer/resume", { deviceSecret: first.body.deviceSecret });
  assert.equal(jwt.verify(after.body.accessToken, secret).phoneVerified, true);
});
