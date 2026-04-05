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
- separate Python imaging sidecar scaffold for future compute workloads
- file-backed persistence seam for draft case retrieval
- typed lifecycle event history for submitted, QC-evaluated, drafted, safety-evaluated, orchestrated, and finalized cases
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

## Supply Chain Baseline

Generate a file-backed CycloneDX SBOM locally:

```bash
npm run sbom:cyclonedx:file
```

The repository now includes a dedicated provenance workflow at `.github/workflows/supply-chain-provenance.yml`. It builds the standalone bundle, writes a normalized CycloneDX SBOM JSON file, uploads the bundle/SBOM/checksums as artifacts, and uses `actions/attest@v4` for build provenance and SBOM attestations.

## Implemented Routes

- GET /healthz
- GET /readyz
- GET /metrics
- GET /api/v1/manifest
- POST /api/v1/cases
- POST /api/v1/cases/:caseId/review
- GET /api/v1/cases/:caseId
- GET /api/v1/cases/:caseId/events

`/readyz` returns product and runtime status. Retrieval can return `status="Submitted"` with `assessment=null`, `qc=null`, `generation=null`, and `review=null` for persisted cases that exist before QC, draft completion, or clinician finalization. Case responses now include QC, generation, and review summaries across the workflow. Error responses for case intake, case retrieval, case review finalization, and case event retrieval include request and correlation identifiers to simplify operator debugging.

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
- `CODE_OF_CONDUCT.md`
- GitHub issue templates and pull request template
- Dependabot, CodeQL, and dependency-review workflows

## Safety Posture

This repository is not a diagnostic device. Any future model outputs are intended to remain draft-only and require qualified clinician review before finalization or delivery.

## Authority Docs

- design.md
- EXPORT_PROFILE.md
- docs/evidence-register.md
- docs/roadmap-and-validation.md
- docs/bootstrap-map.md
- docs/env-contract.md
