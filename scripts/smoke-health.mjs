import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const args = process.argv.slice(2);
const baseUrl = getArgValue("--base-url") ?? `http://127.0.0.1:${process.env.PORT ?? "4030"}`;
const skipStart = args.includes("--skip-start");
const port = process.env.PORT ?? "4030";
const server = skipStart
  ? null
  : spawn(process.execPath, ["dist/index.js"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? "test",
        PORT: port,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

let stdout = "";
let stderr = "";

server?.stdout?.on("data", (chunk) => {
  stdout += chunk.toString();
});

server?.stderr?.on("data", (chunk) => {
  stderr += chunk.toString();
});

const cleanupAndExit = async (code) => {
  await stopServer();
  process.exit(code);
};

process.on("SIGINT", () => {
  void cleanupAndExit(130);
});

process.on("SIGTERM", () => {
  void cleanupAndExit(143);
});

try {
  const health = await pollJson(`${baseUrl}/healthz`, (body) => body?.status === "ok" && body?.scope?.modality === "FFDM");
  const ready = await pollJson(`${baseUrl}/readyz`, (body) => body?.status === "ready" && body?.product?.name === "mammography-second-opinion");

  process.stdout.write(`${JSON.stringify({ health, ready })}\n`);
  await stopServer();
} catch (error) {
  process.stderr.write(`Smoke health failed: ${error instanceof Error ? error.message : "unknown error"}\n`);

  if (stdout) {
    process.stderr.write(`--- server stdout ---\n${stdout}`);
  }

  if (stderr) {
    process.stderr.write(`--- server stderr ---\n${stderr}`);
  }

  await stopServer();
  process.exit(1);
}

async function pollJson(url, predicate) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }

      const body = await response.json();

      if (predicate(body)) {
        return body;
      }
    } catch (error) {
      if (attempt === 30) {
        throw error;
      }
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.killed) {
    return;
  }

  server.kill();
  await Promise.race([once(server, "exit"), delay(5000)]);
}

function getArgValue(flagName) {
  const flagIndex = args.indexOf(flagName);

  if (flagIndex === -1) {
    return undefined;
  }

  return args[flagIndex + 1];
}