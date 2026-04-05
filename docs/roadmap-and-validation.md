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

- Python imaging sidecar: not started
- exam consistency and QC: implemented as persisted QC summaries and `mammography.exam-qc-evaluated.v1` lifecycle events
- initial draft-generation orchestration: baseline rule-engine only

## Wave 4

- radiologist review and finalization workflow
- report rendering
- delivery tracking

## Wave 5

- OHIF-compatible review seam
- Orthanc and DICOMweb-compatible archive seam

## Validation Boundary

- public datasets are acceptable for early experimentation only
- strong product claims require private or held-out validation
- any future model outputs remain draft-only until clinician-reviewed
