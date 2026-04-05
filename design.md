---
title: "Mammography Second Opinion Standalone Design"
status: active
version: "0.1.0"
last_updated: "2026-04-05"
tags: [mammography, ffdm, standalone, control-plane]
---

# Design: Mammography Second Opinion Standalone

## Goal

Build a truthful standalone clinician-in-the-loop FFDM mammography workflow rather than a speculative autonomous breast-imaging AI product.

## Runtime Thesis

The first standalone slice must prove workflow integrity, scope discipline, and independent bootability before it grows into ingestion, inference, review workbench, reporting, or delivery depth.

## Current Wave

Implemented in wave 1:
- independent Node and TypeScript runtime
- explicit bootstrap chain
- health, readiness, metrics, and manifest routes
- correlation headers for every response
- authority docs for mission, evidence, and roadmap

Implemented in the first wave 2 slice:
- FFDM case intake route
- request validation for the bounded intake contract
- mammography case aggregate and application use case
- in-memory persistence seam
- baseline draft-generation service for clinician review only

Implemented in the second wave 2 slice:
- file-backed persistence seam for draft mammography cases
- readback route for persisted draft retrieval after restart

Implemented in the third wave 2 slice:
- typed lifecycle events for case submission, draft generation, and safety evaluation
- persisted event-history retrieval route for case audits and downstream integration

Implemented in the first wave 3 slice:
- rule-based exam consistency and QC summary for intake metadata completeness
- persisted QC lifecycle event before draft generation

Implemented in the second wave 3 slice:
- persisted draft-generation orchestration summary with stage timings and model provenance
- orchestration-completed lifecycle event after QC, draft generation, and safety evaluation

Implemented in the third wave 3 slice:
- separate Python imaging sidecar scaffold using FastAPI and Uvicorn
- health, readiness, manifest, and capability routes for future FFDM compute integration

Implemented in the first wave 4 slice:
- clinician review finalization route with persisted reviewer summary and conflict handling
- review-finalized lifecycle event after clinician confirmation or modification

Implemented in the second wave 4 slice:
- deterministic report rendering route for finalized clinician-reviewed cases
- report artifact response with text body, filename, and render timestamp

Implemented in the third wave 4 slice:
- delivery tracking route for finalized reports with persisted delivery metadata
- case-delivered lifecycle event after delivery recording

Implemented in the first wave 5 slice:
- OHIF-compatible review seam route with a truthful launch manifest for `StudyInstanceUIDs`
- DICOMweb-style datasource placeholders marked not-ready until archive wiring exists

Implemented in the second wave 5 slice:
- Orthanc and DICOMweb-compatible archive seam route with env-backed DICOMweb and WADO-URI roots
- OHIF seam upgrade from placeholder datasource roots to configured archive roots when `ORTHANC_BASE_URL` is present

Not implemented yet:
- deeper image QC
- deeper inference orchestration and multi-engine routing
- live Python imaging inference and Node-to-sidecar integration
- production-grade database-backed persistence
- report export
- archive integration

## Scope Discipline

V1 stays bounded to FFDM-only mammography and excludes DBT, ultrasound, MRI, and autonomous diagnosis.

The current case-intake slice does not change that boundary: it creates draft-only review cases and does not produce autonomous clinical output.

## Technology Direction

- TypeScript control plane
- Python sidecar in later waves for imaging compute
- OHIF and Orthanc compatibility seams in later waves
- MONAI, nnU-Net, MedSAM, and task-specific imaging pipelines on the compute path
- vLLM only where text or multimodal model serving becomes necessary
