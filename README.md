# Mammography Second Opinion

Clinician-in-the-loop full-field digital mammography control plane.

This standalone is intentionally narrow. The first implemented wave is a bootable control-plane kernel for FFDM-only mammography workflows. It exposes health, readiness, metrics, and a machine-readable manifest that declares the product boundary and safety posture.

## Current Scope

- FFDM only
- one bilateral four-view exam per case
- machine-readable mission and non-goals
- validated FFDM case intake contract
- exam consistency and QC summary for intake metadata completeness
- baseline draft generation for clinician review
- persisted draft-generation orchestration summary with stage timings and model provenance
- clinician review and finalization workflow with persisted reviewer decision
- finalized report rendering route for clinician-approved cases
- downloadable text export for finalized clinician reports
- SHA-256 report sealing and integrity verification for finalized reports
- delivery tracking for finalized reports with persisted delivery metadata
- OHIF-compatible review seam as a launch manifest with StudyInstanceUID handoff
- Orthanc and DICOMweb-compatible archive seam with env-backed roots
- Node-to-sidecar integration seam with optional live health and capability probe
- separate Python imaging sidecar scaffold for future compute workloads
- file-backed persistence seam for draft case retrieval
- opt-in SQLite-backed persistence seam using built-in `node:sqlite` for stronger single-node durability
- paginated case-listing workflow for lightweight operator overviews
- typed lifecycle event history for submitted, QC-evaluated, drafted, safety-evaluated, orchestrated, finalized, delivered, and report-sealed cases
- per-IP staging-grade case-intake rate limiting with request-aware `429` responses and `Retry-After`
- opt-in static Bearer protection for `/api/v1/cases` and all nested case routes
- request correlation headers
- structured request logging for completed and failed requests
- request-aware error envelopes for invalid and unexpected intake or retrieval failures
- health, readiness, and metrics endpoints

## Current Non-Goals

- DBT
- ultrasound
- breast MRI
- autonomous diagnosis
- PACS replacement
- model training platform

## Quick Start

```bash
npm install
npm test
npm run build
npm run test:coverage
npm run smoke:health
npm run sbom:cyclonedx:file
npm run dev
```

Default bind address: `0.0.0.0`

Default port: 4030

## Validation Shortcuts

- `npm test` runs the node:test standalone suite
- `npm run test:coverage` runs the same suite with Node test coverage enabled
- `npm run smoke:health` boots the built app and verifies `/healthz` and `/readyz`
- `npm run sbom:cyclonedx:file` writes a normalized CycloneDX SBOM file for attestations
- `npm run validate:public-export` keeps the public-export baseline honest
- `python -m unittest python_sidecar.tests.test_app` verifies the Python sidecar scaffold routes

## Container Baseline

Build the standalone container locally:

```bash
docker build --tag mammography-second-opinion:local .
docker run -d --rm --name mammography-second-opinion-local -p 18080:4030 mammography-second-opinion:local
node scripts/smoke-health.mjs --skip-start --base-url http://127.0.0.1:18080
docker stop mammography-second-opinion-local
```

The container exposes the standalone on port `4030` internally. The CI workflow also runs a Linux-only container smoke job against `/healthz` and `/readyz`.

## Persistence Modes

- `CASE_STORE_BACKEND=file` keeps the current JSON snapshot store behavior.
- `CASE_STORE_BACKEND=sqlite` enables a file-backed SQLite store via Node 24+ built-in `node:sqlite`.
- `CASE_STORE_BACKEND=memory` keeps the ephemeral in-memory seam used by narrow tests and throwaway runs.

The SQLite path is the smallest sound durability upgrade for the current standalone, but it is still a single-node local persistence surface rather than a final multi-instance production database architecture.

## Protected API Auth

- `AUTH_BEARER_TOKEN` enables an opt-in shared Bearer boundary for `/api/v1/cases` and all nested case routes.
- `AUTH_BEARER_ACTOR_ID` and `AUTH_BEARER_ACTOR_ROLE` define the trusted service identity that is written into lifecycle event audit metadata when bearer auth is enabled.
- Public kernel routes such as `/healthz`, `/readyz`, `/metrics`, `/api/v1/manifest`, and `/api/v1/integration-seams/python-sidecar` stay unauthenticated.

This is a machine-to-machine hardening step, not a full IAM system. It does not yet provide delegated scopes, per-user identity, token rotation, or external identity-provider integration.

## Supply Chain Baseline

Generate a file-backed CycloneDX SBOM locally:

```bash
npm run sbom:cyclonedx:file
```

The repository now includes a dedicated provenance workflow at `.github/workflows/supply-chain-provenance.yml`. It builds the standalone bundle, writes a normalized CycloneDX SBOM JSON file, uploads the bundle/SBOM/checksums as artifacts, and uses `actions/attest@v4` for build provenance and SBOM attestations.

Workflow security posture:

- GitHub Actions are pinned to full commit SHAs with inline version comments for Dependabot-friendly updates
- checkout steps disable persisted Git credentials for read-only CI jobs
- `.github/workflows/*` changes are owned through `.github/CODEOWNERS`

## Implemented Routes

- GET /healthz
- GET /readyz
- GET /metrics
- GET /api/v1/manifest
- GET /api/v1/integration-seams/python-sidecar
- GET /api/v1/cases
- POST /api/v1/cases
- POST /api/v1/cases/:caseId/review
- GET /api/v1/cases/:caseId/report
- GET /api/v1/cases/:caseId/report/export
- POST /api/v1/cases/:caseId/report/seal
- GET /api/v1/cases/:caseId/report/integrity
- POST /api/v1/cases/:caseId/deliver
- GET /api/v1/cases/:caseId/review-seams/ohif
- GET /api/v1/cases/:caseId/archive-seams/dicomweb
- GET /api/v1/cases/:caseId
- GET /api/v1/cases/:caseId/events

`/readyz` returns product and runtime status. `GET /api/v1/cases` returns paginated workflow summaries and rejects invalid `limit` or `offset` values with a request-aware 400 response. Retrieval can return `status="Submitted"` with `assessment=null`, `qc=null`, `generation=null`, `review=null`, and `delivery=null` for persisted cases that exist before QC, draft completion, clinician finalization, or tracked delivery. Case responses now include QC, generation, review, and delivery summaries across the workflow. Finalized cases can also render a deterministic text report artifact via `/api/v1/cases/:caseId/report`, download the same artifact as a plain-text attachment via `/api/v1/cases/:caseId/report/export`, create a SHA-256 provenance seal via `/api/v1/cases/:caseId/report/seal`, and verify that seal via `/api/v1/cases/:caseId/report/integrity`. Cases at any persisted state can expose an OHIF-compatible launch manifest via `/api/v1/cases/:caseId/review-seams/ohif`, and that manifest switches from placeholder roots to real DICOMweb roots when `ORTHANC_BASE_URL` is configured. The dedicated archive seam at `/api/v1/cases/:caseId/archive-seams/dicomweb` exposes the same Orthanc-compatible handoff contract directly. The global seam `/api/v1/integration-seams/python-sidecar` probes the current FastAPI sidecar scaffold when `PYTHON_SIDECAR_BASE_URL` is configured, but it does not claim that imaging inference jobs are implemented yet. Error responses for case intake, case listing, case retrieval, case review finalization, case report rendering, case report export, case report sealing, case report integrity verification, case delivery tracking, OHIF seam rendering, DICOMweb archive seam rendering, and case event retrieval include request and correlation identifiers to simplify operator debugging. When static bearer auth is enabled, case routes also return RFC-6750-style `WWW-Authenticate: Bearer` challenges for missing or invalid credentials. The intake route can also return a request-aware `429` with `Retry-After` when the per-IP staging limiter is exceeded.

## Python Sidecar Scaffold

The repository now also includes [python_sidecar/README.md](python_sidecar/README.md), a separate FastAPI and Uvicorn-based imaging sidecar scaffold for future FFDM compute workloads.

Current sidecar scope:

- separate process, not yet wired into the Node control-plane runtime
- `GET /healthz`, `GET /readyz`, `GET /api/v1/manifest`, and `GET /api/v1/capabilities`
- explicit scaffold-mode contract with no live imaging inference yet

## Repository Governance

The repository now ships a minimal public-export governance layer:

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `CODE_OF_CONDUCT.md`
- `CITATION.cff`
- `.github/CODEOWNERS` for workflow-review ownership
- GitHub issue templates and pull request template
- Dependabot, CodeQL, dependency-review, and Scorecards workflows

## Safety Posture

This repository is not a diagnostic device. Any future model outputs are intended to remain draft-only and require qualified clinician review before finalization or delivery.

The current standalone safety boundary is also captured as explicit invariant statements in [docs/verification/safety-invariants.md](docs/verification/safety-invariants.md).

The initial risk-management and proof-chain surfaces now also live in [docs/verification/hazard-analysis.md](docs/verification/hazard-analysis.md) and [docs/verification/traceability-matrix.md](docs/verification/traceability-matrix.md).

## Authority Docs

- design.md
- EXPORT_PROFILE.md
- docs/evidence-register.md
- docs/roadmap-and-validation.md
- docs/bootstrap-map.md
- docs/env-contract.md
- docs/verification/release-validation-packet.md
- docs/verification/launch-evidence-index.md
- docs/verification/hazard-analysis.md
- docs/verification/traceability-matrix.md
- docs/verification/safety-invariants.md
- docs/verification/hosted-evidence-capture-template.md
