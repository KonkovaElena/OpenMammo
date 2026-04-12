# Release-Linked Validation Packet

Date: 2026-04-12

## Purpose

This document links the latest pushed standalone repository head to the latest local validation results.

It exists to keep the public-export story honest: README and authority docs should be able to point to a specific verified repository state rather than to a vague claim that the standalone is "tested".

## Version Linkage

| Dimension | Value |
|-----------|-------|
| Repository | mammography-second-opinion |
| Repository validation base | pushed head `c1669711d10b95e6ae0c50d234140ff1c77312ed` |
| Node.js target | 24+ |
| TypeScript target | 6.x |
| Primary validation command | `npm run validate:public-export` |
| Runtime smoke command | `npm run smoke:health` |
| Python sidecar scaffold command | `python -m unittest python_sidecar.tests.test_app` |
| Fresh-install local rerun | `npm ci` + `python -m pip install -r python_sidecar/requirements.txt` + `npm run build` + `npm test` + `npm run smoke:health` |

## Test Evidence

| Metric | Value |
|--------|-------|
| Total node tests | 58 |
| Passing | 58 |
| Failing | 0 |
| Skipped | 0 |
| Duration | ~1.35 s |
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

This matters because the latest public `standalone-ci` evidence for the current head now exists and still fails, but the failure does not currently reproduce on the fresh local install path.

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
- `docs/verification/safety-invariants.md`

## Validation Completeness Matrix

| Validation dimension | Artifact | Status |
|---------------------|----------|--------|
| Functional correctness | 58 node tests, 58 pass, 0 fail | Complete |
| Type safety | `npm run build` clean | Complete |
| Public-export baseline | `npm run validate:public-export` | Complete |
| Runtime smoke | `npm run smoke:health` | Complete |
| Runtime dependency audit | `npm audit --omit=dev --audit-level=high` clean | Complete |
| Python scaffold truth | `python -m unittest python_sidecar.tests.test_app` | Complete |
| Report integrity sealing | 11 seal/integrity tests, 11 pass | Complete |
| Case listing | 5 listing tests, 5 pass | Complete |
| SQLite persistence seam | 2 sqlite persistence tests, 2 pass | Complete |
| Safety invariants | 4 invariant tests, 4 pass | Complete |
| Scope honesty | manifest and authority docs align on FFDM-only clinician-in-the-loop posture | Complete |

## Known Gaps

1. The Python sidecar is still a scaffold, not a live inference runtime.
2. The standalone does not yet prove final multi-instance production persistence.
3. Archive and OHIF seams are compatibility surfaces, not a full DICOM ingest or PACS closure.
4. Hosted runtime-validation still fails on the current public head `c1669711d10b95e6ae0c50d234140ff1c77312ed`: `standalone-ci` run `24304513781` fails in the `Test` step on both `ubuntu-latest` and `windows-latest`, so `container-smoke` is skipped.
5. Hosted `Scorecards` also fails on the current public head: run `24304513778` fails during `Run analysis`, while `CodeQL` run `24304513780` and `Supply Chain Provenance` run `24304513789` succeed.

## Interpretation

The current standalone is locally verified as a truthful public export.

It boots, builds, passes its node:test suite, passes a runtime health smoke, proves the separate Python sidecar scaffold contract, and now also proves an opt-in SQLite persistence path across runtime restarts. The remaining gaps are split in two categories: product-depth gaps (live imaging inference, deeper archive closure, multi-instance production persistence) and control-plane gaps (hosted `standalone-ci` still fails in the test phase despite local green reruns, and the new Scorecards lane is also red).