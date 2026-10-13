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

    let paymentRepository;
    if (process.env.PAYMENT_PROVIDER === 'sepay') {
      if (process.env.SEPAY_MODE !== 'sandbox' || !process.env.SEPAY_BANK_ACCOUNT || !process.env.SEPAY_BANK_CODE || !process.env.SEPAY_WEBHOOK_API_KEY) throw new Error('Complete SePay sandbox configuration is required');
      paymentRepository = require('./payments/repository').createPaymentRepository(models, { accountNumber: process.env.SEPAY_BANK_ACCOUNT, bankCode: process.env.SEPAY_BANK_CODE, gateway: process.env.SEPAY_BANK_GATEWAY });
      await paymentRepository.init();
    }
    const app = createApp({ secret: config.secret, models, paymentRepository, paymentConfig: { webhookKey: process.env.SEPAY_WEBHOOK_API_KEY, sandboxControls: process.env.SEPAY_MODE === 'sandbox' } });
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
