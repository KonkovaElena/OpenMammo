import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("sbom:cyclonedx:file writes a valid CycloneDX JSON file for attestations", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-sbom-"));
  const outputPath = join(tempDir, "mammography-runtime-sbom.cdx.json");

  try {
    const result = await runNpmScript("sbom:cyclonedx:file", outputPath);

    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.equal(existsSync(outputPath), true);

    const raw = readFileSync(outputPath, "utf8");
    assert.ok(raw.startsWith("{"), "SBOM output must be raw JSON without npm wrapper lines");

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(parsed.bomFormat, "CycloneDX");
    assert.equal(parsed.specVersion, "1.5");

    const metadata = parsed.metadata as Record<string, unknown> | undefined;
    const component = metadata?.component as Record<string, unknown> | undefined;

    assert.equal(component?.type, "application");
    assert.equal(component?.version, "0.1.0");
    assert.equal(component?.["bom-ref"], "mammography-second-opinion@0.1.0");
    assert.equal(component?.purl, "pkg:npm/mammography-second-opinion@0.1.0");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function runNpmScript(scriptName: string, outputPath: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/c", "npm", "run", scriptName, "--", outputPath], {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"],
        })
      : spawn("npm", ["run", scriptName, "--", outputPath], {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"],
        });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}