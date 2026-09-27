const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { readConfig } = require("../src/config");
const { createApp } = require("../src/app");
const { createUserModel } = require("../src/models/user");
const { serve, post, authContract } = require("./helpers");
const secret = randomBytes(32).toString("hex");

test("startup fails before opening HTTP without JWT_SECRET", () => {
  const env = { ...process.env };
  delete env.JWT_SECRET;
  const result = spawnSync(process.execPath, [path.join(__dirname, "../src/index.js")], {
    env, encoding: "utf8", timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /JWT_SECRET/);
  assert.equal(result.stdout, "");
});

test("Auth HTTP contract (unit-test repository double; no database)", async (t) => {
  const records = new Map();
  const users = {
    findByEmail: async (email) => records.get(email) || null,
    create: async (data) => {
      if (records.has(data.email)) throw Object.assign(new Error("duplicate"), { code: 11000 });
      const user = { ...data, _id: new mongoose.Types.ObjectId() };
      records.set(data.email, user);
      return user;
    },
  };
  await authContract(t, { users, inspect: users.findByEmail, secret });
});

test("Mongo duplicate-key error after pre-check maps to 409", async (t) => {
  const users = {
    findByEmail: async () => null,
    create: async () => { throw Object.assign(new Error("E11000 private details"), { code: 11000 }); },
  };
  const base = await serve(t, createApp({ users, secret, expiresIn: 3600 }));
  const response = await post(base, "/auth/register", {
    email: "race@example.test", password: "demo-password", role: "customer",
  });
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { error: "Email already registered" });
});

test("unexpected failures return generic 500, no stack or database details", async (t) => {
  const users = { findByEmail: async () => { throw new Error("sensitive database error"); } };
  const base = await serve(t, createApp({ users, secret, expiresIn: 3600 }));
  const response = await post(base, "/auth/login", { email: "user@example.test", password: "demo-password" });
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: "Internal server error" });
});

test("configuration fails without secret/Mongo, or with invalid expiry", () => {
  const valid = { JWT_SECRET: secret, MONGODB_URI: "mongodb://127.0.0.1:27017/shine_auth_test" };
  assert.equal(readConfig(valid).expiresIn, 3600);
  for (const JWT_SECRET of [undefined, "", "weak", " ".repeat(40)]) {
    assert.throws(() => readConfig({ ...valid, JWT_SECRET }), /JWT_SECRET/);
  }
  assert.throws(() => readConfig({ JWT_SECRET: secret }), /MONGODB_URI/);
  for (const JWT_EXPIRES_IN_SECONDS of ["0", "-1", "abc", "1.5", "86401"]) {
    assert.throws(() => readConfig({ ...valid, JWT_EXPIRES_IN_SECONDS }), /JWT_EXPIRES/);
  }
  assert.throws(() => readConfig({ ...valid, PORT: "0" }), /PORT/);
});

test("Mongoose schema validates role/hash, hides hash and declares unique email index (no DB)", async () => {
  const connection = mongoose.createConnection();
  const User = createUserModel(connection);
  const passwordHash = await bcrypt.hash("demo-password", 12);
  const user = new User({ email: " USER@example.test ", passwordHash, role: "customer" });
  await user.validate();
  assert.equal(user.email, "user@example.test");
  assert.equal(user.toJSON().passwordHash, undefined);
  assert.equal(User.schema.path("passwordHash").options.select, false);
  assert.ok(User.schema.indexes().some(([keys, options]) => keys.email === 1 && options.unique));
  for (const data of [{ passwordHash: "plain-text", role: "customer" }, { passwordHash, role: "admin" },
    { passwordHash, role: ["customer", "stylist"] }]) {
    await assert.rejects(new User({ email: "user@example.test", ...data }).validate());
  }
  await connection.close();
});
