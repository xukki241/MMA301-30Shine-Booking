const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { serve } = require("./helpers");

async function fixture(t) {
  const secret = randomBytes(32).toString("hex");
  const account = { _id: "507f1f77bcf86cd799439011", role: "customer", phone: "+84912345678",
    name: "Nguyễn An", authVersion: 0 };
  const customers = {
    findById: async (id) => id === account._id ? account : null,
    updateProfile: async (_id, fields) => { Object.assign(account, fields); return account; },
  };
  const base = await serve(t, createApp({ users: {}, customers, secret, expiresIn: 3600 }));
  const token = jwt.sign({ role: "customer", authVersion: 0 }, secret,
    { algorithm: "HS256", subject: account._id, expiresIn: 3600 });
  const request = async (method, body, bearer = token) => {
    const response = await fetch(`${base}/auth/customer/profile`, {
      method, headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = {}; }
    return { status: response.status, body: json, headers: response.headers };
  };
  return { request, account, secret, token };
}

test("profile belongs only to authenticated customer and optional fields start empty", async (t) => {
  const { request, account, secret } = await fixture(t);
  assert.equal((await request("GET", undefined, null)).status, 401);
  const staffToken = jwt.sign({ role: "stylist", authVersion: 0 }, secret,
    { subject: account._id, expiresIn: 3600 });
  assert.equal((await request("GET", undefined, staffToken)).status, 401);
  const anotherCustomerToken = jwt.sign({ role: "customer", authVersion: 0 }, secret,
    { subject: "507f1f77bcf86cd799439012", expiresIn: 3600 });
  assert.equal((await request("GET", undefined, anotherCustomerToken)).status, 401);
  assert.equal((await request("PATCH", { name: "Wrong" }, anotherCustomerToken)).status, 401);
  const profile = await request("GET");
  assert.equal(profile.status, 200);
  assert.equal(profile.body.phone, account.phone);
  assert.equal(profile.body.homeAddress, null);
  assert.equal(profile.body.email, null);
  assert.equal(profile.body.passwordHash, undefined);
  assert.equal(profile.headers.get("cache-control"), "no-store");
});

test("profile persists optional home address and rejects invalid patches atomically", async (t) => {
  const { request, account, secret } = await fixture(t);
  const address = { province: "Hà Nội", district: "Ba Đình", ward: "Điện Biên", streetAddress: "12 A" };
  const saved = await request("PATCH", { name: "Nguyễn Bình", email: "  AN@EXAMPLE.COM ",
    birthDate: "2000-01-02", homeAddress: address });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.email, "an@example.com");
  assert.deepEqual((await request("GET")).body.homeAddress, address);
  for (const patch of [{ homeAddress: { ...address, ward: "" } }, { birthDate: "2999-01-01" },
    { phone: "+84999999999" }, { authVersion: 22 }, {}]) {
    assert.equal((await request("PATCH", patch)).status, 400);
  }
  assert.deepEqual((await request("GET")).body.homeAddress, address);
  assert.equal(account.phone, "+84912345678");
  assert.equal((await request("PATCH", { homeAddress: null })).status, 200);
  assert.equal((await request("GET")).body.homeAddress, null);
  const stale = jwt.sign({ role: "customer", authVersion: 1 }, secret,
    { subject: account._id, expiresIn: 3600 });
  assert.equal((await request("PATCH", { name: "Wrong" }, stale)).status, 401);
});

test("profile accepts current two-level address without district", async (t) => {
  const { request } = await fixture(t);
  const address = { province: "Hà Nội", district: "", ward: "Ba Đình", streetAddress: "12 A" };
  assert.equal((await request("PATCH", { homeAddress: address })).status, 200);
  assert.deepEqual((await request("GET")).body.homeAddress, address);
});

test("avatar accepts bounded PNG/JPEG data and rejects malformed or oversized images", async (t) => {
  const { request } = await fixture(t);
  const png = `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString("base64")}`;
  assert.equal((await request("PATCH", { avatar: png })).status, 200);
  assert.equal((await request("GET")).body.avatar, png);
  const invalid = ["data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,@@@",
    `data:image/png;base64,${Buffer.alloc(204801, 1).toString("base64")}`,
    `data:image/jpeg;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64")}`];
  for (const avatar of invalid) assert.ok([400, 413].includes((await request("PATCH", { avatar })).status));
  assert.equal((await request("GET")).body.avatar, png);
  assert.equal((await request("PATCH", { avatar: null })).status, 200);
  assert.equal((await request("GET")).body.avatar, null);
});
