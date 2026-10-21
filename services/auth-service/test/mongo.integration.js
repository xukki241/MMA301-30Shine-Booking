const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createUserModel, createUserRepository } = require("../src/models/user");
const { migrateLegacyShopAdmins } = require("../src/staff-migration");
const { authContract } = require("./helpers");

test("SHINE-26 integration: real MongoDB, staff creation/login and Core API verification", async (t) => {
  assert.ok(process.env.TEST_MONGODB_URI,
    "Mongo dependency unavailable: configure TEST_MONGODB_URI before running integration tests");
  const collection = "shine02_test_" + randomBytes(12).toString("hex");
  const connection = mongoose.createConnection(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  // Never drop the database or touch existing collections.
  t.after(async () => {
    try {
      if (connection.readyState === 1) {
        try { await connection.collection(collection).drop(); }
        catch (error) { if (error.code !== 26) throw error; }
      }
    } finally { await connection.close(); }
  });
  await connection.asPromise();
  const User = createUserModel(connection, collection);
  await User.init();
  await authContract(t, {
    users: createUserRepository(User),
    inspect: (email) => User.collection.findOne({ email }),
    secret: randomBytes(32).toString("hex"),
  });
  await t.test("Mongo unique index rejects direct duplicates", async () => {
    const stored = await User.collection.findOne({ email: "stylist@example.test" });
    const { _id, ...data } = stored;
    await assert.rejects(User.collection.insertOne(data), { code: 11000 });
    assert.ok(stored.createdAt instanceof Date);
    assert.ok(stored.updatedAt instanceof Date);
    const queried = await User.findById(_id);
    assert.equal(queried.passwordHash, undefined);
    assert.equal(queried.toJSON().passwordHash, undefined);
  });
  await t.test("real Mongo migration converts legacy shop_admin once", async () => {
    const legacyId = new mongoose.Types.ObjectId();
    await User.collection.insertOne({ _id: legacyId, email: "legacy-admin@example.test",
      passwordHash: await bcrypt.hash("Password123!", 4), role: "shop_admin" });
    assert.equal(await migrateLegacyShopAdmins(User), 1);
    assert.equal(await migrateLegacyShopAdmins(User), 0);
    const migrated = await User.findById(legacyId);
    assert.equal(migrated.role, "system_admin");
    assert.equal(migrated.status, "active");
    assert.equal(migrated.authVersion, 0);
    assert.equal(await createUserRepository(User).countActiveAdmins(), 3);
  });
  await t.test("two Auth repositories cannot remove the last Admin concurrently", async () => {
    const admins = await User.find({ role: "system_admin", status: "active" }).sort({ email: 1 });
    assert.equal(admins.length, 3);
    await User.updateOne({ _id: admins[0]._id }, { $set: { status: "locked" } });
    const repositories = [createUserRepository(User), createUserRepository(User)];
    const results = await Promise.all(repositories.map((repository, index) =>
      repository.withAdminRemovalLock(async () => {
        if (await repository.countActiveAdmins() <= 1) return false;
        await repository.updateById(String(admins[index + 1]._id), { status: "locked" });
        return true;
      })));
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await repositories[0].countActiveAdmins(), 1);
  });
});
