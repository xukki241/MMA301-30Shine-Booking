const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");

test("general_manager writes catalog while system_admin and legacy shop_admin cannot", async (t) => {
  const secret = randomBytes(32).toString("hex");
  let writes = 0;
  const branchController = {
    list: (_req, res) => res.json({ branches: [] }),
    create: (_req, res) => { writes++; res.status(201).json({ branch: { id: "created" } }); },
    getById: (_req, res) => res.status(404).end(),
    update: (_req, res) => res.status(404).end(),
    remove: (_req, res) => res.status(404).end(),
  };
  const server = createApp({ secret, controllers: { branchController }, verifyStaff: async () => true }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = (role) => jwt.sign({ sub: "507f1f77bcf86cd799439011", role, authVersion: 0 }, secret, { expiresIn: 3600 });
  const create = (role) => fetch(`${base}/branches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token(role)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Chi nhánh mới", address: "Hà Nội" }),
  });

  assert.equal((await create("general_manager")).status, 201);
  assert.equal((await create("system_admin")).status, 403);
  assert.equal((await create("shop_admin")).status, 401);
  assert.equal((await fetch(`${base}/branches`)).status, 401);
  assert.equal((await fetch(`${base}/branches`, { headers: { Authorization: `Bearer ${token("system_admin")}` } })).status, 403);
  assert.equal((await fetch(`${base}/branches`, { headers: { Authorization: `Bearer ${token("general_manager")}` } })).status, 200);
  assert.equal(writes, 1);
});

test("staff request is rejected when Auth Service reports an invalidated session", async (t) => {
  const secret = randomBytes(32).toString("hex");
  let active = true;
  const branchController = {
    list: (_req, res) => res.json({ branches: [] }),
    create: (_req, res) => res.status(201).json({ branch: {} }),
    getById: (_req, res) => res.status(404).end(),
    update: (_req, res) => res.status(404).end(),
    remove: (_req, res) => res.status(404).end(),
  };
  const server = createApp({ secret, controllers: { branchController },
    verifyStaff: async () => active }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ sub: "507f1f77bcf86cd799439011", role: "general_manager", authVersion: 0 }, secret, { expiresIn: 3600 });
  const create = () => fetch(`${base}/branches`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await create()).status, 201);
  active = false;
  assert.equal((await create()).status, 401);
});

test("internal stylist guard reports future shifts and open appointments", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const userId = "507f1f77bcf86cd799439011";
  let futureShift = false;
  let openAppointment = false;
  const models = {
    WorkShift: { exists: async () => futureShift ? { _id: "shift" } : null },
    Calendar: { exists: async () => openAppointment ? { _id: userId } : null },
  };
  const server = createApp({ secret, models }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const serviceToken = jwt.sign({ scope: "stylist-obligations" }, secret,
    { algorithm: "HS256", issuer: "auth-service", expiresIn: 30 });
  const read = (bearer) => fetch(`${base}/internal/stylists/${userId}/obligations`, {
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
  });
  assert.equal((await read()).status, 401);
  assert.deepEqual(await (await read(serviceToken)).json(), { hasPendingWork: false });
  futureShift = true;
  assert.deepEqual(await (await read(serviceToken)).json(), { hasPendingWork: true });
  futureShift = false;
  openAppointment = true;
  assert.deepEqual(await (await read(serviceToken)).json(), { hasPendingWork: true });
});

test("catalog mutation writes audit metadata without request body", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const events = [];
  const audit = { write: async (entry) => { events.push(entry); }, list: async () => events };
  const branchController = {
    list: (_req, res) => res.json({ branches: [] }),
    create: (_req, res) => res.status(201).json({ branch: { id: "created" } }),
    getById: (_req, res) => res.status(404).end(),
    update: (_req, res) => res.status(404).end(),
    remove: (_req, res) => res.status(404).end(),
  };
  const server = createApp({ secret, controllers: { branchController }, audit,
    verifyStaff: async () => true }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const manager = jwt.sign({ sub: "507f1f77bcf86cd799439011", role: "general_manager", authVersion: 0 },
    secret, { expiresIn: 3600 });
  const created = await fetch(`${base}/branches`, { method: "POST", headers: {
    Authorization: `Bearer ${manager}`, "Content-Type": "application/json",
  }, body: JSON.stringify({ name: "Chi nhánh thử", address: "Hà Nội", password: "must-not-log" }) });
  assert.equal(created.status, 201);
  assert.equal(events.length, 1);
  assert.equal(events[0].action, "branch.create");
  assert.equal(events[0].actorId, "507f1f77bcf86cd799439011");
  assert.equal(JSON.stringify(events).includes("must-not-log"), false);
  const internal = jwt.sign({ scope: "audit-read" }, secret,
    { algorithm: "HS256", issuer: "auth-service", expiresIn: 30 });
  assert.equal((await fetch(`${base}/internal/audit`)).status, 401);
  const response = await fetch(`${base}/internal/audit`, { headers: { Authorization: `Bearer ${internal}` } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).events.length, 1);
});
