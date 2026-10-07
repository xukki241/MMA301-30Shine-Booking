const mongoose = require("mongoose");
const { readConfig } = require("./config");
const { createApp } = require("./app");
const { createModels } = require("./models");

async function start() {
  let config;
  try {
    config = readConfig();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  let connection;
  try {
    connection = mongoose.createConnection(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    await connection.asPromise();
    const models = createModels(connection);

    // Build indexes
    await Promise.all([
      models.Branch.init(),
      models.Service.init(),
      models.StylistProfile.init(),
      models.Calendar.init(),
      models.WorkShift.init(),
    ]);

    const app = createApp({ secret: config.secret, models });
    const server = app.listen(config.port, "0.0.0.0", () => {
      console.log(`core-api on ${config.port}`);
    });

    server.on("error", async () => {
      console.error("Core API failed to listen");
      await connection.close();
      process.exitCode = 1;
    });

    const shutdown = () => server.close(() => connection.close());
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch {
    console.error("Core API startup failed: check MongoDB availability and connection string");
    if (connection) await connection.close();
    process.exitCode = 1;
  }
}
start();
