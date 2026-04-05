# Roadmap And Validation

Date: 2026-04-05

## Wave 1

- standalone runtime kernel
- health, readiness, metrics, manifest
- request correlation
- authority docs

## Wave 2

- domain aggregate
- event schemas
- case intake workflow
- persistence seam

Current status:

- domain aggregate: started
- case intake workflow: implemented as `POST /api/v1/cases`
- persistence seam: file-backed snapshot store with `GET /api/v1/cases/:caseId` retrieval
- event schemas: implemented as typed persisted lifecycle events with `GET /api/v1/cases/:caseId/events`

## Wave 3

- Python imaging sidecar
- exam consistency and QC
- initial draft-generation orchestration

Current status:

- Python imaging sidecar: implemented as a separate FastAPI and Uvicorn scaffold with health, readiness, manifest, and capability routes
- exam consistency and QC: implemented as persisted QC summaries and `mammography.exam-qc-evaluated.v1` lifecycle events
- initial draft-generation orchestration: implemented as persisted stage summaries and `mammography.draft-orchestration-completed.v1` lifecycle events

## Wave 4

- radiologist review and finalization workflow
- report rendering
- delivery tracking

Current status:

- radiologist review and finalization workflow: implemented as persisted clinician review summaries and `mammography.case-review-finalized.v1` lifecycle events
- report rendering: implemented as deterministic finalized case reports via `GET /api/v1/cases/:caseId/report` plus plain-text export via `GET /api/v1/cases/:caseId/report/export`
- delivery tracking: implemented as persisted delivery metadata and `mammography.case-delivered.v1` lifecycle events

## Wave 5

- OHIF-compatible review seam
- Orthanc and DICOMweb-compatible archive seam

Current status:

- OHIF-compatible review seam: implemented as a read-only OHIF launch manifest using `StudyInstanceUIDs` and DICOMweb-style datasource placeholders
- Orthanc and DICOMweb-compatible archive seam: implemented as an env-backed handoff manifest that derives `dicom-web` and `wado` roots from `ORTHANC_BASE_URL`

## Validation Boundary

- public datasets are acceptable for early experimentation only
- strong product claims require private or held-out validation
- any future model outputs remain draft-only until clinician-reviewed
