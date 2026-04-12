# Safety Invariants

Date: 2026-04-12

## Purpose

This document turns the standalone's core clinical safety posture into a small set of explicit, testable invariants.

The goal is not to claim medical-device completeness. The goal is to make the current safety boundary concrete, reviewable, and traceable to automated evidence.

## Invariants

| ID | Invariant | Enforcement surface | Automated evidence |
|----|-----------|---------------------|--------------------|
| SI-001 | The product remains clinician-in-the-loop, draft-only, and non-autonomous. | `src/domain/manifest.ts`, `/api/v1/manifest` | `tests/safety-invariants.test.ts`, `tests/create-app.test.ts` |
| SI-002 | Intake remains bounded to FFDM bilateral four-view exams only. | `src/domain/mammography/contracts.ts`, `POST /api/v1/cases` | `tests/safety-invariants.test.ts`, `tests/create-case.test.ts` |
| SI-003 | Report rendering and delivery are blocked until clinician review finalizes the case. | review, report, and delivery use cases + routes | `tests/safety-invariants.test.ts`, `tests/report-rendering.test.ts`, `tests/delivery-tracking.test.ts` |
| SI-004 | Report integrity sealing is gated by finalization and is single-use after the first seal. | seal use case + integrity event path | `tests/safety-invariants.test.ts`, `tests/report-integrity.test.ts` |

## Current Boundary

- These invariants describe the current standalone control plane only.
- They do not claim live imaging inference, autonomous diagnosis, or final production deployment readiness.
- They are intended to keep the current FFDM-only workflow kernel honest while future sidecar, archive, and persistence depth evolves.

## Recommended Next Expansion

If the standalone continues to grow toward real clinical deployment, the next useful layer is a traceability matrix that maps:

1. requirement or hazard
2. invariant or control
3. code surface
4. automated test or evidence artifact

This document is the smallest current step in that direction.