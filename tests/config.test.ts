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