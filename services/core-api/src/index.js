const { createApp } = require("./app");
const { readJwtSecret } = require("./middleware/auth");
const mongoose = require("mongoose");
const { createCalendarModel } = require("./models/stylist-calendar");
const { createBookingRepository } = require("./booking/mongo-repository");

async function start() {
  let connection;
  try {
    const secret = readJwtSecret();
    const port = Number(process.env.PORT || 4102);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
    let bookingRepository;
    if (process.env.MONGODB_URI) {
      connection = mongoose.createConnection(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      await connection.asPromise();
      const Calendar = createCalendarModel(connection);
      await Calendar.init();
      bookingRepository = createBookingRepository(Calendar);
    } else {
      console.warn("MONGODB_URI not configured: booking endpoints will return 503");
    }
    const server = createApp(secret, bookingRepository).listen(port, "0.0.0.0", () => console.log(`core-api on ${port}`));
    server.on("error", async () => {
      console.error("Core API failed to listen");
      if (connection) await connection.close();
      process.exitCode = 1;
    });
    const shutdown = () => server.close(() => connection?.close());
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    // Mongo errors may contain credentials; only expose known configuration messages.
    console.error(error.message.startsWith("JWT_SECRET") || error.message === "Invalid PORT"
      ? error.message : "Core startup failed: check MongoDB availability and configuration");
    if (connection) await connection.close();
    process.exitCode = 1;
  }
}
start();
