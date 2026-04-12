# Launch Evidence Index

This file tracks the current local and hosted evidence state for Mammography Second Opinion.

## Repository Status

- Current verdict: `LOCAL_VALIDATION_GREEN_HOSTED_CAPTURE_PENDING`
- Last reviewed: 2026-04-12
- Current boundary note: the standalone is locally validated and truthful about its FFDM-only clinician-in-the-loop scope. The latest validated implementation slice now also protects `/api/v1/cases*` with an opt-in static Bearer boundary and derives trusted actor identity from server-side config. The latest fully visible hosted-green workflow set still belongs to an older head, so the current remaining question is evidence freshness rather than reproduced CI breakage.
- Latest validated implementation slice: `39046e0`
- Latest fully hosted-validated head: `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`
- Current local validation snapshot: `npm test` green at 65 tests, 65 pass, 0 fail, 0 skipped; `npm run build` green; `npm run smoke:health` green; the targeted bearer-auth and runtime-envelope suites are green; `npm audit --omit=dev --audit-level=high` was previously green with 0 vulnerabilities on the hosted-closure head; `python -m unittest python_sidecar.tests.test_app` remains green at 3 tests, 0 failures; and a fresh local `npm ci` + `python -m pip install -r python_sidecar/requirements.txt` + build/test/smoke rerun was already green on the preceding CI-closure pass.
- Public repository: `https://github.com/KonkovaElena/OpenMammo`
- Current evidence packet: `docs/verification/release-validation-packet.md`

## Hosted Workflow Snapshot

Recorded hosted evidence for the latest fully hosted-validated head `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:

1. `standalone-ci` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996328`
2. `Scorecards` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996323`
3. `CodeQL` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996321`
4. `Supply Chain Provenance` succeeded on `14abeb9ae7b9f80635e45853bf10a2bbbf4406e2`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24307996325`
5. The immediately preceding `6751f1c` commit fixed the hosted `standalone-ci` test-phase blocker, and `14abeb9` then closed the hosted `Scorecards` failure by aligning the workflow with the current upstream pattern.
6. Hosted workflow capture for the validated bearer-auth slice `39046e0` was not yet visible in the public unauthenticated Actions snapshot during this evidence pass.

## Interpretation

The current repository proves strong local validation on the newest bearer-auth slice and already has one earlier head with a fully green hosted workflow set.

The hosted-CI closure problem is resolved in substance, but the evidence surface has a normal timing lag because the newest validated auth hardening slice is ahead of the public workflow snapshot available to this audit pass. The primary open work is therefore no longer CI triage but moving the product from a strongly engineered control-plane prototype toward a more formal risk, security, interoperability, identity, and validation posture.

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