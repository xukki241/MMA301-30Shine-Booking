import assert from "node:assert/strict";
import test from "node:test";
import { canUseAdminWeb, readAdminSession } from "../src/access.js";

test("Admin Web accepts only System Admin and drops cached Manager session", () => {
  assert.equal(canUseAdminWeb("system_admin"), true);
  assert.equal(canUseAdminWeb("general_manager"), false);
  assert.equal(canUseAdminWeb("stylist"), false);
  let removed = false;
  const storage = { getItem: () => JSON.stringify({ accessToken: "old", user: { role: "general_manager" } }),
    removeItem: () => { removed = true; } };
  assert.equal(readAdminSession(storage), null);
  assert.equal(removed, true);
});
