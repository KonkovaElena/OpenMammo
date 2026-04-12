# Hazard Analysis

Date: 2026-04-12

## Purpose

This document is the first risk-management surface for the OpenMammo standalone.

It does not claim full ISO 14971 compliance. It records the current major hazards, the controls already implemented in the repository, and the most obvious residual gaps.

## Scope

- current Node.js control-plane standalone only
- FFDM-only, bilateral four-view workflow only
- current draft-only, clinician-reviewed operating mode only

## Current Hazard Table

| Hazard ID | Hazard | Current control surface | Verification evidence | Residual status |
|-----------|--------|-------------------------|-----------------------|-----------------|
| HZ-001 | A draft output is treated as a final clinical report without clinician review. | `standaloneManifest.safety`, review-finalization gate, report and delivery route guards | `tests/safety-invariants.test.ts`, `tests/report-rendering.test.ts`, `tests/delivery-tracking.test.ts` | Reduced but not eliminated; operators still need to respect the standalone boundary outside the app. |
| HZ-002 | An out-of-scope exam enters the workflow and is processed as if it were valid FFDM input. | Zod intake schema for modality and standard views | `tests/safety-invariants.test.ts`, `tests/create-case.test.ts` | Reduced for the current API boundary; broader ingest surfaces do not exist yet. |
| HZ-003 | A finalized report is modified or disputed without a strong integrity signal. | SHA-256 report sealing, integrity verification route, lifecycle event persistence | `tests/report-integrity.test.ts` | Reduced for the current text-report artifact; external timestamping and signed bundles are not implemented. |
| HZ-004 | Stored case state is lost or diverges across process restarts. | File-backed JSON persistence, opt-in SQLite persistence, persistence-seam tests | `tests/persistence-seam.test.ts` | Partially reduced; no multi-instance or external database guarantee exists yet. |
| HZ-005 | An unauthorized actor creates, reviews, exports, or delivers cases. | Current controls are limited to narrow scope, draft-only posture, and basic request hardening such as headers and rate limiting. | Repository inspection only; no authn/authz tests exist because authn/authz is not implemented. | Open high-priority gap. |
| HZ-006 | A future sidecar or model output is interpreted as autonomous diagnostic truth. | Non-autonomous manifest, draft-only output mode, clinician review requirement, sidecar seam remains optional and scaffolded | `tests/safety-invariants.test.ts`, `tests/sidecar-integration.test.ts` | Reduced at the control-plane level; future live inference requires a dedicated model-governance layer. |

## Immediate Risk Priorities

1. Add actor identity, authentication, and authorization controls before treating review, export, or delivery as deployable workflow features.
2. Move from a repository-level hazard table to a maintained risk register with severity, likelihood, and residual-risk ownership.
3. Add explicit traceability between hazards, controls, tests, and release evidence.

## Status Note

This file should evolve with the product. If a new workflow stage or integration seam is added, the hazard table should be updated in the same change.