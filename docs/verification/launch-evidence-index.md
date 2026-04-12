# Launch Evidence Index

This file tracks the current local and hosted evidence state for Mammography Second Opinion.

## Repository Status

- Current verdict: `LOCAL_AND_HOSTED_VALIDATION_GREEN`
- Last reviewed: 2026-04-12
- Current boundary note: the standalone is locally validated and truthful about its FFDM-only clinician-in-the-loop scope. The latest pushed public head now includes workflow hardening, an opt-in SQLite persistence seam, explicit safety-invariants coverage, and a green hosted workflow set on `main`. The strongest remaining questions are now product-depth and governance questions rather than immediate hosted-CI closure.
- Current public head: `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`
- Current local validation snapshot: `npm run validate:public-export` green at 58 tests, 58 pass, 0 fail, 0 skipped; `npm run smoke:health` green; `npm audit --omit=dev --audit-level=high` green with 0 vulnerabilities; `python -m unittest python_sidecar.tests.test_app` green at 3 tests, 0 failures; and a fresh local `npm ci` + `python -m pip install -r python_sidecar/requirements.txt` + build/test/smoke rerun is also green.
- Public repository: `https://github.com/KonkovaElena/OpenMammo`
- Current evidence packet: `docs/verification/release-validation-packet.md`

## Hosted Workflow Snapshot

Recorded hosted evidence for the current public head `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:

1. `standalone-ci` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996328`
2. `Scorecards` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996323`
3. `CodeQL` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996321`
4. `Supply Chain Provenance` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996325`
5. The immediately preceding `6751f1c` commit fixed the hosted `standalone-ci` test-phase blocker, and `14abeb9` then closed the hosted `Scorecards` failure by aligning the workflow with the current upstream pattern.

## Interpretation

The current public repository now proves both strong local validation and a green hosted workflow set on the same head.

The hosted-CI closure problem is resolved for the latest public head. The primary open work is no longer CI triage but moving the product from a strongly engineered control-plane prototype toward a more formal risk, security, interoperability, and validation posture.

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
- `docs/verification/hazard-analysis.md`
- `docs/verification/traceability-matrix.md`
- `docs/verification/safety-invariants.md`
- `docs/verification/hosted-evidence-capture-template.md`