const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createApp } = require("../src/app");
const { createUserModel } = require("../src/models/user");
const { migrateLegacyShopAdmins, bootstrapSystemAdmin } = require("../src/staff-migration");
const { serve, post } = require("./helpers");

test("staff User accepts three personnel roles and rejects guest/legacy roles", async () => {
  const connection = mongoose.createConnection();
  const User = createUserModel(connection);
  const passwordHash = await bcrypt.hash("demo-password", 4);
  for (const role of ["stylist", "system_admin", "general_manager"]) {
    await new User({ email: `${role}@example.test`, passwordHash, role }).validate();
  }
  for (const role of ["customer", "shop_admin"]) {
    await assert.rejects(new User({ email: `${role}@example.test`, passwordHash, role }).validate());
  }
  await connection.close();
});

test("public registration cannot create staff or legacy customer accounts", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const users = { findByEmail: async () => null, create: async () => { throw new Error("must not create"); } };
  const base = await serve(t, createApp({ users, secret, expiresIn: 3600 }));
  for (const role of ["customer", "stylist", "system_admin", "general_manager", "shop_admin"]) {
    const response = await post(base, "/auth/register", { email: `${role}@example.test`, password: "demo-password", role });
    assert.equal(response.status, 410);
  }
});

test("migration converts only legacy shop_admin accounts and can run twice", async () => {
  const calls = [];
  const User = { updateMany: (filter, update) => ({
    exec: async () => { calls.push({ filter, update }); return { modifiedCount: calls.length === 1 ? 2 : 0 }; },
  }) };
  assert.equal(await migrateLegacyShopAdmins(User), 2);
  assert.equal(await migrateLegacyShopAdmins(User), 0);
  assert.deepEqual(calls[0], {
    filter: { role: "shop_admin" },
    update: { $set: { role: "system_admin" } },
  });
  assert.deepEqual(calls.slice(1, 3), [
    { filter: { role: { $in: ["stylist", "system_admin", "general_manager"] }, status: { $exists: false } }, update: { $set: { status: "active" } } },
    { filter: { role: { $in: ["stylist", "system_admin", "general_manager"] }, authVersion: { $exists: false } }, update: { $set: { authVersion: 0 } } },
  ]);
  assert.equal(calls.length, 6);
});

test("bootstrap creates the first System Admin and refuses a second bootstrap", async () => {
  let existing = 0;
  let created;
  const User = {
    countDocuments: () => ({ exec: async () => existing }),
    create: async (data) => { created = data; existing++; return { _id: new mongoose.Types.ObjectId(), ...data }; },
  };
  const result = await bootstrapSystemAdmin(User, " ADMIN@EXAMPLE.TEST ", "Password123!");
  assert.equal(result.email, "admin@example.test");
  assert.equal(result.role, "system_admin");
  assert.equal(await bcrypt.compare("Password123!", created.passwordHash), true);
  await assert.rejects(bootstrapSystemAdmin(User, "next@example.test", "Password123!"), /already exists/);
});
