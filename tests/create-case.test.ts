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