import { loadConfig } from "./config";
import { bootstrap } from "./bootstrap";

const config = loadConfig();

let shuttingDown = false;

const { app } = bootstrap({
  metricsEnabled: config.METRICS_ENABLED,
  isShuttingDown: () => shuttingDown,
  caseStorePath: config.CASE_STORE_PATH,
});

const server = app.listen(config.PORT, config.HOST, () => {
  process.stdout.write(
    `mammography-second-opinion listening on ${config.HOST}:${String(config.PORT)} in ${config.NODE_ENV} mode\n`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    server.close(() => {
      process.exitCode = 0;
    });
  });
}