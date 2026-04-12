import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

const baseExam = {
  modality: "FFDM",
  standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
  patientAge: 58,
  breastDensity: "C",
} as const;

async function createCase(
  app: ReturnType<typeof bootstrap>["app"],
  studyInstanceUid: string,
  accessionNumber: string,
  questionText: string,
): Promise<string> {
  const response = await request(app)
    .post("/api/v1/cases")
    .send({
      exam: {
        ...baseExam,
        studyInstanceUid,
        accessionNumber,
      },
      clinicalQuestion: {
        questionText,
        urgency: "routine",
      },
    });

  assert.equal(response.status, 201);
  return response.body.caseId;
}

test("GET /api/v1/cases returns an empty paginated result when no cases exist", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const response = await request(app)
    .get("/api/v1/cases")
    .set("x-request-id", "req-list-empty-001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    cases: [],
    total: 0,
    limit: 50,
    offset: 0,
  });
});

test("GET /api/v1/cases returns created case summaries", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const firstCaseId = await createCase(
    app,
    "1.2.840.10008.1.2.3.201",
    "ACC-LIST-001",
    "List the first FFDM case summary.",
  );
  const secondCaseId = await createCase(
    app,
    "1.2.840.10008.1.2.3.202",
    "ACC-LIST-002",
    "List the second FFDM case summary.",
  );

  const response = await request(app)
    .get("/api/v1/cases")
    .set("x-request-id", "req-list-all-001");

  assert.equal(response.status, 200);
  assert.equal(response.body.total, 2);
  assert.equal(response.body.limit, 50);
  assert.equal(response.body.offset, 0);
  assert.equal(response.body.cases.length, 2);
  assert.deepEqual(
    response.body.cases.map((entry: { caseId: string }) => entry.caseId),
    [firstCaseId, secondCaseId],
  );
  assert.equal(response.body.cases[0].status, "AwaitingReview");
  assert.equal(response.body.cases[0].modality, "FFDM");
  assert.equal(response.body.cases[0].studyInstanceUid, "1.2.840.10008.1.2.3.201");
  assert.equal(typeof response.body.cases[0].createdAt, "string");
  assert.match(response.body.cases[0].assessmentSummary, /List the first FFDM case summary/);
});

test("GET /api/v1/cases applies limit and offset pagination", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const firstCaseId = await createCase(
    app,
    "1.2.840.10008.1.2.3.203",
    "ACC-LIST-003",
    "List pagination case one.",
  );
  const secondCaseId = await createCase(
    app,
    "1.2.840.10008.1.2.3.204",
    "ACC-LIST-004",
    "List pagination case two.",
  );
  const thirdCaseId = await createCase(
    app,
    "1.2.840.10008.1.2.3.205",
    "ACC-LIST-005",
    "List pagination case three.",
  );

  const firstPage = await request(app)
    .get("/api/v1/cases?limit=1&offset=0")
    .set("x-request-id", "req-list-page-001");

  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body.total, 3);
  assert.equal(firstPage.body.limit, 1);
  assert.equal(firstPage.body.offset, 0);
  assert.deepEqual(firstPage.body.cases.map((entry: { caseId: string }) => entry.caseId), [firstCaseId]);

  const secondPage = await request(app)
    .get("/api/v1/cases?limit=2&offset=1")
    .set("x-request-id", "req-list-page-002");

  assert.equal(secondPage.status, 200);
  assert.equal(secondPage.body.total, 3);
  assert.equal(secondPage.body.limit, 2);
  assert.equal(secondPage.body.offset, 1);
  assert.deepEqual(
    secondPage.body.cases.map((entry: { caseId: string }) => entry.caseId),
    [secondCaseId, thirdCaseId],
  );
});

test("GET /api/v1/cases rejects invalid query values with 400", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  await createCase(
    app,
    "1.2.840.10008.1.2.3.206",
    "ACC-LIST-006",
    "Validate default pagination fallback.",
  );

  const response = await request(app)
    .get("/api/v1/cases?limit=bad&offset=-5")
    .set("x-request-id", "req-list-invalid-001");

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "INVALID_QUERY_PARAMETERS");
  assert.equal(response.body.error.requestId, "req-list-invalid-001");
  assert.ok(Array.isArray(response.body.error.issues));
});

test("GET /api/v1/cases returns persisted summaries after a bootstrap restart", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "mammography-listing-store-"));
  const storePath = join(tempDir, "cases.json");

  try {
    const firstRuntime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const firstCaseId = await createCase(
      firstRuntime.app,
      "1.2.840.10008.1.2.3.207",
      "ACC-LIST-007",
      "Persist and list the first stored case.",
    );
    const secondCaseId = await createCase(
      firstRuntime.app,
      "1.2.840.10008.1.2.3.208",
      "ACC-LIST-008",
      "Persist and list the second stored case.",
    );

    const secondRuntime = bootstrap({
      metricsEnabled: false,
      isShuttingDown: () => false,
      caseStorePath: storePath,
    });

    const response = await request(secondRuntime.app)
      .get("/api/v1/cases")
      .set("x-request-id", "req-list-restart-001");

    assert.equal(response.status, 200);
    assert.equal(response.body.total, 2);
    assert.deepEqual(
      response.body.cases.map((entry: { caseId: string }) => entry.caseId),
      [firstCaseId, secondCaseId],
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
