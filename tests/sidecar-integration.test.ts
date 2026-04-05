import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { afterEach } from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const serversToClose: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(
    serversToClose.splice(0, serversToClose.length).map(
      (server) => new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    ),
  );
});

test("GET /api/v1/integration-seams/python-sidecar probes a configured sidecar handshake", async () => {
  const server = createServer((requestMessage, responseMessage) => {
    if (requestMessage.url === "/healthz") {
      responseMessage.setHeader("content-type", "application/json");
      responseMessage.end(JSON.stringify({ status: "ok", runtime: { mode: "scaffold" } }));
      return;
    }

    if (requestMessage.url === "/readyz") {
      responseMessage.setHeader("content-type", "application/json");
      responseMessage.end(JSON.stringify({ status: "ready", runtime: { acceptingJobs: false } }));
      return;
    }

    if (requestMessage.url === "/api/v1/manifest") {
      responseMessage.setHeader("content-type", "application/json");
      responseMessage.end(JSON.stringify({
        product: { name: "mammography-python-sidecar" },
        scope: { outputShape: "draft-only-imaging-signals" },
        safety: { outputMode: "draft-only" },
      }));
      return;
    }

    if (requestMessage.url === "/api/v1/capabilities") {
      responseMessage.setHeader("content-type", "application/json");
      responseMessage.end(JSON.stringify({
        mode: "scaffold",
        implementedTasks: [],
        plannedTasks: ["image-qc", "density-estimation", "draft-handoff"],
        docs: ["/openapi.json", "/docs"],
      }));
      return;
    }

    responseMessage.statusCode = 404;
    responseMessage.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  serversToClose.push(server);

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP server address.");
  }

  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
    pythonSidecarBaseUrl: `http://127.0.0.1:${String(address.port)}`,
  });

  const response = await request(runtime.app)
    .get("/api/v1/integration-seams/python-sidecar")
    .set("x-request-id", "req-sidecar-001");

  assert.equal(response.status, 200);
  assert.equal(response.body.sidecar.configured, true);
  assert.equal(response.body.sidecar.reachable, true);
  assert.match(response.body.sidecar.baseUrl, /^http:\/\/127\.0\.0\.1:/);
  assert.equal(response.body.health.status, "ok");
  assert.equal(response.body.health.mode, "scaffold");
  assert.equal(response.body.readiness.status, "ready");
  assert.equal(response.body.readiness.acceptingJobs, false);
  assert.equal(response.body.manifest.productName, "mammography-python-sidecar");
  assert.equal(response.body.manifest.outputShape, "draft-only-imaging-signals");
  assert.equal(response.body.capabilities.mode, "scaffold");
  assert.deepEqual(response.body.capabilities.plannedTasks, ["image-qc", "density-estimation", "draft-handoff"]);
});

test("GET /api/v1/integration-seams/python-sidecar returns an unconfigured seam when no base URL exists", async () => {
  const runtime = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const response = await request(runtime.app)
    .get("/api/v1/integration-seams/python-sidecar")
    .set("x-request-id", "req-sidecar-unconfigured");

  assert.equal(response.status, 200);
  assert.equal(response.body.sidecar.configured, false);
  assert.equal(response.body.sidecar.reachable, false);
  assert.equal(response.body.sidecar.baseUrl, null);
  assert.equal(response.body.health.status, null);
  assert.equal(response.body.manifest.productName, null);
  assert.deepEqual(response.body.capabilities.plannedTasks, []);
});