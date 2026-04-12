# Launch Evidence Index

This file tracks the current local and hosted evidence state for Mammography Second Opinion.

## Repository Status

- Current verdict: `LOCAL_VALIDATION_GREEN_HOSTED_STANDALONE_CI_PENDING`
- Last reviewed: 2026-04-12
- Current boundary note: the standalone is locally validated and truthful about its FFDM-only clinician-in-the-loop scope. The latest pushed public head now includes workflow hardening, an opt-in SQLite persistence seam, and explicit safety-invariants coverage. Hosted workflow evidence has caught up to that head and is mixed rather than stale: `CodeQL` and `Supply Chain Provenance` are green, but `standalone-ci` and `Scorecards` are red. The current working theory remains hosted-CI drift or hosted-only workflow behavior rather than a reproduced local product regression.
- Current public head: `c1669711d10b95e6ae0c50d234140ff1c77312ed`
- Current local validation snapshot: `npm run validate:public-export` green at 58 tests, 58 pass, 0 fail, 0 skipped; `npm run smoke:health` green; `npm audit --omit=dev --audit-level=high` green with 0 vulnerabilities; `python -m unittest python_sidecar.tests.test_app` green at 3 tests, 0 failures; and a fresh local `npm ci` + `python -m pip install -r python_sidecar/requirements.txt` + build/test/smoke rerun is also green.
- Public repository: `https://github.com/KonkovaElena/OpenMammo`
- Current evidence packet: `docs/verification/release-validation-packet.md`

## Hosted Workflow Snapshot

Recorded hosted evidence for the current public head `c1669711d10b95e6ae0c50d234140ff1c77312ed`:

1. `CodeQL` succeeded on `c1669711d10b95e6ae0c50d234140ff1c77312ed`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24304513780`
2. `Supply Chain Provenance` succeeded on `c1669711d10b95e6ae0c50d234140ff1c77312ed`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24304513789`
3. `standalone-ci` failed on `c1669711d10b95e6ae0c50d234140ff1c77312ed`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24304513781`
4. Within `standalone-ci`, both `Validate (ubuntu-latest)` and `Validate (windows-latest)` reached the `Test` step before failing with exit code `1`, so `Container smoke` was skipped.
5. `Scorecards` failed on `c1669711d10b95e6ae0c50d234140ff1c77312ed`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24304513778`
6. The public workflow summaries expose Node 20 deprecation warnings for JavaScript actions, but those warnings alone do not explain the current `standalone-ci` test-step failure.

## Interpretation

The current public repository proves strong local validation on the new head and also proves green hosted static-analysis and provenance lanes on that same head, but it still does not prove a green hosted runtime-validation lane for the current public head.

Local reruns on the new repository head are green, so the current open evidence question is not product-scope honesty but hosted-CI closure. Until a successful rerun of `standalone-ci` exists on `main` for `c1669711d10b95e6ae0c50d234140ff1c77312ed`, the release packet should be treated as the primary current runtime evidence and the hosted workflow state as partially reconciled. The best public signal available today is that hosted failure now concentrates in the matrix `Test` phase rather than in setup or build, which narrows the remaining investigation surface.

## Primary Evidence Links

- `README.md`
- `design.md`
- `EXPORT_PROFILE.md`
- `docs/evidence-register.md`
- `docs/roadmap-and-validation.md`
- `docs/bootstrap-map.md`
- `docs/env-contract.md`
- `docs/verification/release-validation-packet.md`
- `docs/verification/launch-evidence-index.md`
- `docs/verification/safety-invariants.md`
- `docs/verification/hosted-evidence-capture-template.md`