const mongoose = require("mongoose");
const { readConfig } = require("./config");
const { createApp } = require("./app");
const { createUserModel, createUserRepository } = require("./models/user");

async function start() {
  let config;
  try {
    config = readConfig();
  } catch (error) {
    console.error(error.message); // These config errors never contain env values.
    process.exitCode = 1;
    return;
  }
  let connection;
  try {
    connection = mongoose.createConnection(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    await connection.asPromise();
    const User = createUserModel(connection);
    await User.init(); // Build unique email index before accepting requests.
    const app = createApp({ users: createUserRepository(User), ...config });
    const server = app.listen(config.port, "0.0.0.0", () => console.log(`auth-service on ${config.port}`));
    server.on("error", async () => {
      console.error("Auth HTTP server failed to listen");
      await connection.close();
      process.exitCode = 1;
    });
    const shutdown = () => server.close(() => connection.close());
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch {
    console.error("Auth startup failed: check MongoDB availability, credentials and unique email index");
    if (connection) await connection.close();
    process.exitCode = 1;
  }
}
start();
