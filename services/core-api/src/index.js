const mongoose = require("mongoose");
const { readConfig } = require("./config");
const { createApp } = require("./app");
const { createModels } = require("./models");
const { createBookingRepository } = require("./booking/mongo-repository");
const { createNoShowPoller } = require("./booking/no-show-poller");
const { createPaymentService } = require("./payment/service");
const { createSepayPoller } = require("./payment/poller");

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
      models.AuditLog.init(),
    ]);

    const bookingRepository = createBookingRepository(models.Calendar);
    const app = createApp({ secret: config.secret, authServiceUrl: config.authServiceUrl, models, bookingRepository, payment: config.payment });
    const noShowPoller = createNoShowPoller(bookingRepository);
    const poller = createSepayPoller(createPaymentService(bookingRepository, config.payment), config.payment);
    const server = app.listen(config.port, "0.0.0.0", () => {
      console.log(`core-api on ${config.port}`);
      poller.start();
      void noShowPoller.start();
    });

    server.on("error", async () => {
      console.error("Core API failed to listen");
      await connection.close();
      process.exitCode = 1;
    });

    const shutdown = () => { noShowPoller.stop(); poller.stop(); server.close(() => connection.close()); };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch {
    console.error("Core API startup failed: check MongoDB availability and connection string");
    if (connection) await connection.close();
    process.exitCode = 1;
  }
}
start();
