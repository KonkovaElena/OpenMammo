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