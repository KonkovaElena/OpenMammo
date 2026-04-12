# Traceability Matrix

Date: 2026-04-12

## Purpose

This matrix connects the current standalone requirements and hazards to the controls, code surfaces, and automated evidence already present in the repository.

It is intentionally small. The goal is to make the current proof chain explicit before deeper clinical or regulatory work begins.

## Matrix

| Trace ID | Requirement or hazard | Control or invariant | Primary code surface | Automated evidence |
|----------|-----------------------|----------------------|----------------------|--------------------|
| TR-001 | The product must stay clinician-in-the-loop and draft-only. | SI-001 | `src/domain/manifest.ts`, `src/application/createApp.ts` | `tests/safety-invariants.test.ts`, `tests/create-app.test.ts`, `tests/bootstrap.test.ts` |
| TR-002 | The intake boundary must stay FFDM-only and bilateral four-view. | SI-002 | `src/domain/mammography/contracts.ts` | `tests/safety-invariants.test.ts`, `tests/create-case.test.ts` |
| TR-003 | Report rendering and delivery must remain blocked before clinician finalization. | SI-003 | review, report, and delivery routes and use cases | `tests/safety-invariants.test.ts`, `tests/report-rendering.test.ts`, `tests/delivery-tracking.test.ts` |
| TR-004 | Report sealing must require finalization and remain single-use. | SI-004 | report sealing and integrity routes | `tests/safety-invariants.test.ts`, `tests/report-integrity.test.ts` |
| TR-005 | Persisted case state must survive restarts in supported local modes. | Persistence controls | `src/bootstrap.ts`, `src/infrastructure/persistence/*` | `tests/persistence-seam.test.ts` |
| TR-006 | Hosted CI and local validation must agree on the current public head. | Release evidence closure | `.github/workflows/ci.yml`, `.github/workflows/scorecards.yml`, docs verification surfaces | `docs/verification/release-validation-packet.md`, `docs/verification/launch-evidence-index.md` |
| TR-007 | Lifecycle events should retain request and actor audit context when a caller provides it. | Optional event audit metadata capture | `src/application/createApp.ts`, `src/domain/mammography/contracts.ts`, `src/domain/mammography/MammographySecondOpinionCase.ts` | `tests/create-case.test.ts`, `tests/review-finalization.test.ts`, `tests/delivery-tracking.test.ts`, `tests/report-integrity.test.ts` |

## Open Rows

The following trace rows do not exist yet and should be added before clinical deployment claims grow:

1. authentication and authorization requirements
2. model governance and sidecar-output provenance
3. interoperability validation against live Orthanc and OHIF targets
4. human-factors validation and reviewer override behavior

## Maintenance Rule

Every new safety-relevant feature should add or update at least one trace row in the same change that introduces the feature.