const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const { createUserModel, createUserRepository } = require("../src/models/user");
const { authContract } = require("./helpers");

test("SHINE-02 integration: real MongoDB, HTTP register/login and Core API verification", async (t) => {
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
    const stored = await User.collection.findOne({ email: "customer@example.test" });
    const { _id, ...data } = stored;
    await assert.rejects(User.collection.insertOne(data), { code: 11000 });
    assert.ok(stored.createdAt instanceof Date);
    assert.ok(stored.updatedAt instanceof Date);
    const queried = await User.findById(_id);
    assert.equal(queried.passwordHash, undefined);
    assert.equal(queried.toJSON().passwordHash, undefined);
  });
});
