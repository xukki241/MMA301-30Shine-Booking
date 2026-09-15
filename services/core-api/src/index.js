const { createApp } = require("./app");
const { readJwtSecret } = require("./middleware/auth");
try {
  const secret = readJwtSecret();
  const port = Number(process.env.PORT || 4102);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  const server = createApp(secret).listen(port, "0.0.0.0", () => console.log(`core-api on ${port}`));
  server.on("error", () => { console.error("Core API failed to listen"); process.exitCode = 1; });
  process.once("SIGINT", () => server.close());
  process.once("SIGTERM", () => server.close());
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
