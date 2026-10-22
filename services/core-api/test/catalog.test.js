const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { createApp } = require("../src/app");
const {
  createBranchModel,
  createServiceModel,
  createStylistModel,
} = require("../src/models");

const TEST_MONGO_URI =
  process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/shine_core_test";

test("SHINE-05 Catalog API (Branch, Service, Stylist)", async (t) => {
  const secret = randomBytes(32).toString("hex");
  const suffix = randomBytes(8).toString("hex");
  const branchCol = `test_branches_${suffix}`;
  const serviceCol = `test_services_${suffix}`;
  const stylistCol = `test_stylists_${suffix}`;

  const connection = mongoose.createConnection(TEST_MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  t.after(async () => {
    try {
      if (connection.readyState === 1) {
        await connection.collection(branchCol).drop().catch(() => {});
        await connection.collection(serviceCol).drop().catch(() => {});
        await connection.collection(stylistCol).drop().catch(() => {});
      }
    } finally {
      await connection.close();
    }
  });

  await connection.asPromise();

  const Branch = createBranchModel(connection, branchCol);
  const Service = createServiceModel(connection, serviceCol);
  const StylistProfile = createStylistModel(connection, stylistCol);

  await Promise.all([Branch.init(), Service.init(), StylistProfile.init()]);

  const models = { Branch, Service, StylistProfile };
  let directoryName = "Stylist Nam Phong";
  const app = createApp({ secret, models, verifyStaff: async () => true, verifyCustomer: async () => true,
    verifyActiveStylist: async () => true,
    stylistDirectory: async () => [{ id: "507f191e810c19729de860ea", email: "nam@example.test", fullName: directoryName }] });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));

  const base = `http://127.0.0.1:${server.address().port}`;

  const sign = (role, sub = "507f1f77bcf86cd799439011") =>
    jwt.sign({ sub, role, authVersion: 0 }, secret, { algorithm: "HS256", expiresIn: 3600 });

  const adminToken = sign("general_manager");
  const customerToken = sign("customer");
  const customerRead = { headers: { Authorization: `Bearer ${customerToken}` } };
  const stylistToken = sign("stylist");

  let createdBranchId;
  let createdServiceId;
  let createdStylistId;
  const stylistUserId = "507f191e810c19729de860ea";

  // --- 1. Branch API Tests ---
  await t.test("Branch endpoints", async (tBranch) => {
    await tBranch.test("GET /branches starts empty", async () => {
      const res = await fetch(`${base}/branches`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.branches));
      assert.equal(data.branches.length, 0);
    });

    await tBranch.test("POST /branches requires authentication", async () => {
      const res = await fetch(`${base}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "30Shine Cau Giay", address: "123 Cau Giay, Hanoi" }),
      });
      assert.equal(res.status, 401);
    });

    await tBranch.test("POST /branches rejects customer role", async () => {
      const res = await fetch(`${base}/branches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "30Shine Cau Giay", address: "123 Cau Giay, Hanoi" }),
      });
      assert.equal(res.status, 403);
    });

    await tBranch.test("POST /branches rejects invalid body", async () => {
      const res = await fetch(`${base}/branches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "A", address: "123" }),
      });
      assert.equal(res.status, 400);
    });

    await tBranch.test("POST /branches succeeds with general_manager", async () => {
      const res = await fetch(`${base}/branches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "30Shine Cau Giay",
          address: "123 Cau Giay, Dich Vong, Hanoi",
          phone: "0901234567",
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.branch);
      assert.ok(data.branch.id);
      assert.equal(data.branch.name, "30Shine Cau Giay");
      assert.equal(data.branch.address, "123 Cau Giay, Dich Vong, Hanoi");
      assert.equal(data.branch.phone, "0901234567");
      assert.equal(data.branch.isActive, true);
      createdBranchId = data.branch.id;
    });

    await tBranch.test("GET /branches returns created branch", async () => {
      const res = await fetch(`${base}/branches`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.branches.length, 1);
      assert.equal(data.branches[0].id, createdBranchId);
    });

    await tBranch.test("GET /branches/:id returns branch details", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.branch.id, createdBranchId);
    });

    await tBranch.test("GET /branches/:id rejects invalid ObjectId format", async () => {
      const res = await fetch(`${base}/branches/invalid-id-format`, customerRead);
      assert.equal(res.status, 400);
    });

    await tBranch.test("GET /branches/:id returns 404 for non-existent branch", async () => {
      const res = await fetch(`${base}/branches/507f1f77bcf86cd799439011`, customerRead);
      assert.equal(res.status, 404);
    });

    await tBranch.test("PUT /branches/:id updates branch", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "30Shine Cau Giay Premium" }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.branch.name, "30Shine Cau Giay Premium");
    });
  });

  // --- 2. Service API Tests ---
  await t.test("Service endpoints", async (tService) => {
    await tService.test("GET /branches/:id/services starts empty", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/services`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.services, []);
    });

    await tService.test("POST /branches/:id/services rejects non-admin", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/services`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stylistToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Cat goi Shine Combo",
          price: 120000,
          durationMinutes: 45,
        }),
      });
      assert.equal(res.status, 403);
    });

    await tService.test("POST /branches/:id/services validates fields", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/services`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Combo",
          price: -100,
          durationMinutes: 1,
        }),
      });
      assert.equal(res.status, 400);
    });

    await tService.test("POST /branches/:id/services creates service", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/services`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Cat goi Shine Combo 7 Buoc",
          price: 120000,
          durationMinutes: 45,
          description: "Goi dau thu gian, cat toc tao kieu chuyen nghiep",
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.service);
      assert.ok(data.service.id);
      assert.equal(data.service.branchId, createdBranchId);
      assert.equal(data.service.name, "Cat goi Shine Combo 7 Buoc");
      assert.equal(data.service.price, 120000);
      assert.equal(data.service.durationMinutes, 45);
      createdServiceId = data.service.id;
    });

    await tService.test("GET /branches/:id/services returns created service", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/services`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.services.length, 1);
      assert.equal(data.services[0].id, createdServiceId);
    });

    await tService.test("GET /services/:id returns service details", async () => {
      const res = await fetch(`${base}/services/${createdServiceId}`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.service.id, createdServiceId);
    });

    await tService.test("PUT /services/:id updates service", async () => {
      const res = await fetch(`${base}/services/${createdServiceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price: 150000 }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.service.price, 150000);
    });

    await tService.test("service price must be a safe whole VND amount for mock payment", async () => {
      const headers = { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" };
      for (const price of [120000.5, Number.MAX_SAFE_INTEGER + 1]) {
        const create = await fetch(`${base}/branches/${createdBranchId}/services`, {
          method: "POST", headers,
          body: JSON.stringify({ name: "Gia khong hop le", price, durationMinutes: 45 }),
        });
        assert.equal(create.status, 400, `create accepted ${price}`);
        const update = await fetch(`${base}/services/${createdServiceId}`, {
          method: "PUT", headers, body: JSON.stringify({ price }),
        });
        assert.equal(update.status, 400, `update accepted ${price}`);
        await assert.rejects(Service.create({ branchId: createdBranchId, name: "Gia sai",
          price, durationMinutes: 45 }), /Giá dịch vụ phải là số nguyên VND an toàn/);
      }
      assert.equal((await Service.findById(createdServiceId)).price, 150000);
    });
  });

  // --- 3. Stylist Profile API Tests ---
  await t.test("StylistProfile endpoints", async (tStylist) => {
    await tStylist.test("GET /branches/:id/stylists starts empty", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/stylists`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data.stylists, []);
    });

    await tStylist.test("Manager sees selectable staff without entering User ID", async () => {
      const response = await fetch(`${base}/stylists/candidates?branchId=${createdBranchId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).candidates, [{ id: stylistUserId,
        email: "nam@example.test", fullName: "Stylist Nam Phong" }]);
      const denied = await fetch(`${base}/stylists/candidates?branchId=${createdBranchId}`, customerRead);
      assert.equal(denied.status, 403);
    });

    await tStylist.test("POST /branches/:id/stylists assigns stylist to branch", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/stylists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: stylistUserId,
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.stylist);
      assert.ok(data.stylist.id);
      assert.equal(data.stylist.branchId, createdBranchId);
      assert.equal(data.stylist.userId, stylistUserId);
      assert.equal(data.stylist.displayName, "Stylist Nam Phong");
      createdStylistId = data.stylist.id;
      const candidates = await fetch(`${base}/stylists/candidates?branchId=${createdBranchId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.deepEqual((await candidates.json()).candidates, []);
    });

    await tStylist.test("GET /stylists/me returns only the signed-in stylist's active assignment", async () => {
      const own = await fetch(`${base}/stylists/me`, {
        headers: { Authorization: `Bearer ${sign("stylist", stylistUserId)}` },
      });
      assert.equal(own.status, 200);
      const data = await own.json();
      assert.equal(data.profiles.length, 1);
      assert.equal(data.profiles[0].displayName, "Stylist Nam Phong");
      assert.equal(data.profiles[0].branchName, "30Shine Cau Giay Premium");
      assert.equal(data.profiles[0].branchAddress, "123 Cau Giay, Dich Vong, Hanoi");

      const other = await fetch(`${base}/stylists/me`, { headers: { Authorization: `Bearer ${stylistToken}` } });
      assert.equal(other.status, 200);
      assert.deepEqual((await other.json()).profiles, []);
      const customer = await fetch(`${base}/stylists/me`, customerRead);
      assert.equal(customer.status, 403);
    });

    await tStylist.test("POST /branches/:id/stylists rejects duplicate assignment", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/stylists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: stylistUserId,
        }),
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.error, /đã được gán/i);
    });

    await tStylist.test("GET /branches/:id/stylists returns assigned stylist", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}/stylists`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.stylists.length, 1);
      assert.equal(data.stylists[0].id, createdStylistId);
    });

    await tStylist.test("GET /stylists/:id returns stylist profile", async () => {
      const res = await fetch(`${base}/stylists/${createdStylistId}`, customerRead);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.stylist.id, createdStylistId);
    });

    await tStylist.test("profile name follows the staff directory and Manager cannot rename it", async () => {
      directoryName = "Master Nam Phong";
      const current = await fetch(`${base}/stylists/${createdStylistId}`, customerRead);
      assert.equal((await current.json()).stylist.displayName, "Master Nam Phong");
      const res = await fetch(`${base}/stylists/${createdStylistId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "Master Nam Phong" }),
      });
      assert.equal(res.status, 400);
    });
  });

  // --- 4. Deletions & Cascade Tests ---
  await t.test("Deletion operations", async (tDelete) => {
    await tDelete.test("DELETE /services/:id removes service", async () => {
      const res = await fetch(`${base}/services/${createdServiceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);

      const check = await fetch(`${base}/services/${createdServiceId}`, customerRead);
      assert.equal(check.status, 404);
    });

    await tDelete.test("DELETE /stylists/:id removes stylist", async () => {
      const res = await fetch(`${base}/stylists/${createdStylistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);

      const check = await fetch(`${base}/stylists/${createdStylistId}`, customerRead);
      assert.equal(check.status, 404);
    });

    await tDelete.test("DELETE /branches/:id removes branch", async () => {
      const res = await fetch(`${base}/branches/${createdBranchId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);

      const check = await fetch(`${base}/branches/${createdBranchId}`, customerRead);
      assert.equal(check.status, 404);
    });
  });
});
