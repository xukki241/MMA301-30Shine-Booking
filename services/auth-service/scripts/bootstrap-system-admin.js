const mongoose = require("mongoose");
const { readConfig } = require("../src/config");
const { createUserModel } = require("../src/models/user");
const { migrateLegacyShopAdmins, bootstrapSystemAdmin } = require("../src/staff-migration");

async function main() {
  const config = readConfig();
  const connection = mongoose.createConnection(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    await connection.asPromise();
    const User = createUserModel(connection);
    await migrateLegacyShopAdmins(User);
    await User.init();
    const user = await bootstrapSystemAdmin(User, process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD);
    console.log(`Created System Admin ${user.email}`);
  } finally { await connection.close(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
