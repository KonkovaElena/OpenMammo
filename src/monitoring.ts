import { Counter, Registry } from "prom-client";

export interface StandaloneMonitoring {
  metricsRegistry: Registry;
  requestCounter: Counter<string>;
}

export function createMonitoring(): StandaloneMonitoring {
  const metricsRegistry = new Registry();
  const requestCounter = new Counter({
    name: "mammography_second_opinion_http_requests_total",
    help: "HTTP requests handled by the standalone kernel.",
    labelNames: ["method", "path", "status_code"],
    registers: [metricsRegistry],
  });

  return {
    metricsRegistry,
    requestCounter,
  };
}