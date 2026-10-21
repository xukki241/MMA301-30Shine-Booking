const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { createCustomerModels, createCustomerRepository } = require("../src/customer-account");
const { serve } = require("./helpers");

test("Customer profile persists in MongoDB across Auth Service connections", async (t) => {
  const uri = process.env.TEST_MONGODB_URI;
  assert.ok(uri, "TEST_MONGODB_URI is required for profile integration test");
  const database = `shine_profile_test_${randomBytes(8).toString("hex")}`;
  const connectionUri = new URL(uri);
  connectionUri.pathname = `/${database}`;
  const secret = randomBytes(32).toString("hex");
  let connection = mongoose.createConnection(connectionUri.toString(), { serverSelectionTimeoutMS: 5000 });
  await connection.asPromise();
  t.after(async () => {
    if (connection.readyState !== 1) await connection.openUri(connectionUri.toString());
    for (const name of ["customer_accounts", "customer_challenges"]) {
      try { await connection.collection(name).drop(); }
      catch (error) { if (error.code !== 26) throw error; }
    }
    await connection.close();
  });
  let { Account, Challenge } = createCustomerModels(connection);
  const account = await Account.create({ phone: "+84912345678", name: "Nguyễn An", passwordHash: "test-only-hash" });
  const token = jwt.sign({ role: "customer", authVersion: 0 }, secret,
    { algorithm: "HS256", subject: String(account._id), expiresIn: 3600 });
  let base = await serve(t, createApp({ users: {}, customers: createCustomerRepository({ Account, Challenge }), secret, expiresIn: 3600 }));
  const address = { province: "Hà Nội", district: "Ba Đình", ward: "Điện Biên", streetAddress: "12 A" };
  const changed = await fetch(`${base}/auth/customer/profile`, { method: "PATCH", headers: {
    Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: " AN@EXAMPLE.COM ", homeAddress: address }) });
  assert.equal(changed.status, 200);
  await connection.close();
  connection = mongoose.createConnection(connectionUri.toString(), { serverSelectionTimeoutMS: 5000 });
  await connection.asPromise();
  ({ Account, Challenge } = createCustomerModels(connection));
  base = await serve(t, createApp({ users: {}, customers: createCustomerRepository({ Account, Challenge }), secret, expiresIn: 3600 }));
  const loaded = await fetch(`${base}/auth/customer/profile`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(loaded.status, 200);
  const profile = await loaded.json();
  assert.equal(profile.email, "an@example.com");
  assert.deepEqual(profile.homeAddress, address);
  assert.equal(profile.passwordHash, undefined);
});
