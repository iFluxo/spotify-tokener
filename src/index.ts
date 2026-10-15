import { loadConfig, type Config } from "./config.ts";
import { logger, setLogLevel } from "./logger.ts";
import { createServer } from "./server.ts";

function main(): void {
  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    logger.error("Invalid configuration", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  setLogLevel(config.logLevel);
  logger.info("Log level set", { level: config.logLevel });

  const server = createServer(config);
  logger.info("Server started", {
    address: `http://${server.hostname}:${server.port}`,
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info("Server stopping", { signal });
    server.stop(true);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
