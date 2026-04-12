import { loadConfig } from "./config";
import { bootstrap } from "./bootstrap";

const config = loadConfig();

let shuttingDown = false;

const { app, dispose } = bootstrap({
  metricsEnabled: config.METRICS_ENABLED,
  isShuttingDown: () => shuttingDown,
  caseStoreBackend: config.CASE_STORE_BACKEND,
  caseStorePath: config.CASE_STORE_PATH,
  caseIntakeRateLimit: {
    windowMs: config.CASE_INTAKE_RATE_LIMIT_WINDOW_MS,
    maxRequests: config.CASE_INTAKE_RATE_LIMIT_MAX_REQUESTS,
  },
  orthancBaseUrl: config.ORTHANC_BASE_URL,
  dicomwebSourceName: config.DICOMWEB_SOURCE_NAME,
  pythonSidecarBaseUrl: config.PYTHON_SIDECAR_BASE_URL,
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
      dispose();
      process.exitCode = 0;
    });
  });
}