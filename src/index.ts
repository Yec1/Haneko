import { ExtendedClient } from "./structures/Client";
import { loadCommands, loadEvents } from "./handlers/index";
import { Logger } from "./utils/Logger";

const logger = new Logger("Process");

async function main() {
  const client = new ExtendedClient();
  await loadCommands(client);
  await loadEvents(client);
  await client.start();

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", reason);
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
  });
  process.on("SIGINT", () => {
    client.stop();
    client.destroy();
    process.exit(0);
  });
}

main();
