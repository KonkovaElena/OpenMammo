# Release-Linked Validation Packet

Date: 2026-04-12

## Purpose

This document links the current standalone repository head to the latest local validation results.

It exists to keep the public-export story honest: README and authority docs should be able to point to a specific verified repository state rather than to a vague claim that the standalone is "tested".

## Version Linkage

| Dimension | Value |
|-----------|-------|
| Repository | mammography-second-opinion |
| Repository base head | `98ff80714a9ddfa42e718d0706939baf24d32d5f` |
| Node.js target | 24+ |
| TypeScript target | 6.x |
| Primary validation command | `npm run validate:public-export` |
| Runtime smoke command | `npm run smoke:health` |
| Python sidecar scaffold command | `python -m unittest python_sidecar.tests.test_app` |
| Fresh-install local rerun | `npm ci` + `python -m pip install -r python_sidecar/requirements.txt` + `npm run build` + `npm test` + `npm run smoke:health` |

## Test Evidence

| Metric | Value |
|--------|-------|
| Total node tests | 54 |
| Passing | 54 |
| Failing | 0 |
| Skipped | 0 |
| Duration | ~4.44 s |
| Runner | `node --import tsx --test tests/**/*.test.ts` via `npm run validate:public-export` |

## Build Evidence

Status: clean (`npm run build` -> `tsc -p tsconfig.json`)

## Runtime Smoke Evidence

`npm run smoke:health` returned:

- `health.status = ok`
- `ready.status = ready`
- product name `mammography-second-opinion`
- scope `FFDM`, `bilateral-four-view`
- safety posture `reviewRequired=true`, `outputMode=draft-only`, `autonomousDiagnosis=false`

## Python Sidecar Scaffold Evidence

`python -m unittest python_sidecar.tests.test_app` returned:

- 3 tests run
- 0 failures
- status `OK`

This verifies the sidecar scaffold routes without claiming live imaging inference.

## Persistence Evidence

The standalone now proves three persistence modes locally:

- in-memory repository for narrow tests and ephemeral runs
- file-backed JSON snapshot repository across runtime restarts
- opt-in SQLite-backed repository using Node built-in `node:sqlite` across runtime restarts

The SQLite path is a local durability improvement, not yet a claim of final multi-instance production persistence.

## Fresh-Install Reproduction Evidence

On 2026-04-09 the standalone also passed a fresh local install path that mirrors the critical parts of the GitHub Actions `standalone-ci` job:

- `npm ci` succeeded
- `python -m pip install -r python_sidecar/requirements.txt` succeeded
- `npm run build` succeeded
- `npm test` succeeded
- `npm run smoke:health` succeeded

This matters because the latest recorded public `standalone-ci` evidence still points to the previous public head, and that hosted failure does not currently reproduce on the fresh local install path.

## Documentation Inventory

Authority docs for this validation snapshot:

- `README.md`
- `design.md`
- `EXPORT_PROFILE.md`
- `docs/evidence-register.md`
- `docs/roadmap-and-validation.md`
- `docs/bootstrap-map.md`
- `docs/env-contract.md`
- `docs/verification/release-validation-packet.md`

## Validation Completeness Matrix

| Validation dimension | Artifact | Status |
|---------------------|----------|--------|
| Functional correctness | 54 node tests, 54 pass, 0 fail | Complete |
| Type safety | `npm run build` clean | Complete |
| Public-export baseline | `npm run validate:public-export` | Complete |
| Runtime smoke | `npm run smoke:health` | Complete |
| Runtime dependency audit | `npm audit --omit=dev --audit-level=high` clean | Complete |
| Python scaffold truth | `python -m unittest python_sidecar.tests.test_app` | Complete |
| Report integrity sealing | 11 seal/integrity tests, 11 pass | Complete |
| Case listing | 5 listing tests, 5 pass | Complete |
| SQLite persistence seam | 2 sqlite persistence tests, 2 pass | Complete |
| Scope honesty | manifest and authority docs align on FFDM-only clinician-in-the-loop posture | Complete |

## Known Gaps

1. The Python sidecar is still a scaffold, not a live inference runtime.
2. The standalone does not yet prove final multi-instance production persistence.
3. Archive and OHIF seams are compatibility surfaces, not a full DICOM ingest or PACS closure.
4. Hosted runtime-validation evidence is still stale relative to the new public head `98ff80714a9ddfa42e718d0706939baf24d32d5f`.
5. The latest hosted `standalone-ci` failure remains attached to the previous public head `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`, so the new workflow-hardening commit still needs a fresh hosted rerun.

## Interpretation

The current standalone is locally verified as a truthful public export.

It boots, builds, passes its node:test suite, passes a runtime health smoke, proves the separate Python sidecar scaffold contract, and now also proves an opt-in SQLite persistence path across runtime restarts. The remaining gaps are split in two categories: product-depth gaps (live imaging inference, deeper archive closure, multi-instance production persistence) and one control-plane gap (a fresh hosted `standalone-ci` rerun is still needed on the new public head).