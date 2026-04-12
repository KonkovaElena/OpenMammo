import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { bootstrap } from "../src/bootstrap";

test("POST /api/v1/cases creates a draft mammography second-opinion case", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const response = await request(app)
    .post("/api/v1/cases")
    .send({
      exam: {
        studyInstanceUid: "1.2.840.10008.1.2.3.4",
        modality: "FFDM",
        standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
        patientAge: 54,
        breastDensity: "C",
        accessionNumber: "ACC-001",
      },
      clinicalQuestion: {
        questionText: "Provide a second-opinion draft for screening exam with possible calcifications.",
        urgency: "routine",
      },
    });

  assert.equal(response.status, 201);
  assert.match(response.body.caseId, /^[a-f0-9-]{36}$/i);
  assert.equal(response.body.status, "AwaitingReview");
  assert.equal(response.body.assessment.biradsCategory, "0");
  assert.equal(response.body.assessment.outputMode, "draft-only");
  assert.equal(response.body.qc.status, "pass");
  assert.equal(response.body.qc.findingCount, 0);
  assert.equal(response.body.generation.orchestratorId, "baseline-draft-orchestrator:v1");
  assert.equal(response.body.generation.modelId, "baseline-rule-engine:v0");
  assert.deepEqual(
    response.body.generation.stages.map((stage: { name: string }) => stage.name),
    ["exam-qc", "draft-generation", "safety-evaluation"],
  );
  assert.equal(response.body.generation.stages.length, 3);
  assert.equal(typeof response.body.generation.totalLatencyMs, "number");
  assert.ok(response.body.generation.totalLatencyMs >= 0);
  assert.equal(response.body.safety.hasBlockingFlags, false);
});

test("POST /api/v1/cases rejects non-FFDM modalities", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const response = await request(app)
    .post("/api/v1/cases")
    .send({
      exam: {
        studyInstanceUid: "1.2.840.10008.1.2.3.5",
        modality: "MRI",
        standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
      },
      clinicalQuestion: {
        questionText: "This payload must be rejected because modality is outside scope.",
        urgency: "routine",
      },
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "INVALID_REQUEST_BODY");
});

test("POST /api/v1/cases returns QC warnings when optional intake metadata is absent", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const response = await request(app)
    .post("/api/v1/cases")
    .send({
      exam: {
        studyInstanceUid: "1.2.840.10008.1.2.3.6",
        modality: "FFDM",
        standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
      },
      clinicalQuestion: {
        questionText: "Create a draft and surface missing intake metadata as QC warnings.",
        urgency: "routine",
      },
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.qc.status, "warning");
  assert.equal(response.body.qc.findingCount, 3);
  assert.deepEqual(
    response.body.qc.findings.map((finding: { code: string }) => finding.code),
    [
      "MISSING_ACCESSION_NUMBER",
      "MISSING_PATIENT_AGE",
      "MISSING_BREAST_DENSITY",
    ],
  );
  assert.equal(response.body.generation.orchestratorId, "baseline-draft-orchestrator:v1");
  assert.equal(response.body.generation.stages.length, 3);
  assert.equal(response.body.safety.hasBlockingFlags, false);
});

test("POST /api/v1/cases persists request audit metadata into lifecycle events", async () => {
  const { app } = bootstrap({
    metricsEnabled: false,
    isShuttingDown: () => false,
  });

  const createResponse = await request(app)
    .post("/api/v1/cases")
    .set("x-request-id", "req-create-audit-001")
    .set("x-correlation-id", "corr-create-audit-001")
    .set("x-actor-id", "radiologist-001")
    .set("x-actor-role", "radiologist")
    .send({
      exam: {
        studyInstanceUid: "1.2.840.10008.1.2.3.7",
        modality: "FFDM",
        standardViews: ["L-CC", "L-MLO", "R-CC", "R-MLO"],
      },
      clinicalQuestion: {
        questionText: "Create a draft case with explicit audit metadata.",
        urgency: "routine",
      },
    });

  assert.equal(createResponse.status, 201);

  const eventsResponse = await request(app)
    .get(`/api/v1/cases/${createResponse.body.caseId}/events`)
    .set("x-request-id", "req-create-audit-events-001");

  assert.equal(eventsResponse.status, 200);
  assert.ok(eventsResponse.body.events.length >= 5);

  for (const event of eventsResponse.body.events) {
    assert.equal(event.audit.requestId, "req-create-audit-001");
    assert.equal(event.audit.correlationId, "corr-create-audit-001");
    assert.equal(event.audit.actorId, "radiologist-001");
    assert.equal(event.audit.actorRole, "radiologist");
  }
});