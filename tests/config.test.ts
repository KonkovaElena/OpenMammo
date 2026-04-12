import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config";

test("loadConfig defaults HOST to 0.0.0.0 for container-safe binding", () => {
  const config = loadConfig({});

  assert.equal(config.HOST, "0.0.0.0");
  assert.equal(config.PORT, 4030);
});

test("loadConfig allows HOST override", () => {
  const config = loadConfig({ HOST: "127.0.0.1", PORT: "4090" });

  assert.equal(config.HOST, "127.0.0.1");
  assert.equal(config.PORT, 4090);
});

test("loadConfig exposes optional Orthanc base URL and DICOMweb source name", () => {
  const config = loadConfig({
    ORTHANC_BASE_URL: "http://localhost:8042/",
    DICOMWEB_SOURCE_NAME: "orthanc",
  });

  assert.equal(config.ORTHANC_BASE_URL, "http://localhost:8042/");
  assert.equal(config.DICOMWEB_SOURCE_NAME, "orthanc");
});

test("loadConfig exposes optional Python sidecar base URL", () => {
  const config = loadConfig({
    PYTHON_SIDECAR_BASE_URL: "http://127.0.0.1:8040",
  });

  assert.equal(config.PYTHON_SIDECAR_BASE_URL, "http://127.0.0.1:8040");
});

test("loadConfig exposes case intake rate limit settings", () => {
  const config = loadConfig({
    CASE_INTAKE_RATE_LIMIT_WINDOW_MS: "120000",
    CASE_INTAKE_RATE_LIMIT_MAX_REQUESTS: "12",
  });

  assert.equal(config.CASE_INTAKE_RATE_LIMIT_WINDOW_MS, 120000);
  assert.equal(config.CASE_INTAKE_RATE_LIMIT_MAX_REQUESTS, 12);
});

test("loadConfig derives a sqlite store path when the sqlite backend is selected", () => {
  const config = loadConfig({
    CASE_STORE_BACKEND: "sqlite",
  });

  assert.equal(config.CASE_STORE_BACKEND, "sqlite");
  assert.match(config.CASE_STORE_PATH, /mammography-second-opinion-cases\.sqlite$/);
});

test("loadConfig preserves an explicit store path override for sqlite backend", () => {
  const config = loadConfig({
    CASE_STORE_BACKEND: "sqlite",
    CASE_STORE_PATH: "custom/openmammo.sqlite",
  });

  assert.equal(config.CASE_STORE_PATH, "custom/openmammo.sqlite");
});