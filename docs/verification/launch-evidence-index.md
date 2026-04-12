# Launch Evidence Index

This file tracks the current local and hosted evidence state for Mammography Second Opinion.

## Repository Status

- Current verdict: `LOCAL_VALIDATION_GREEN_HOSTED_STANDALONE_CI_PENDING`
- Last reviewed: 2026-04-12
- Current boundary note: the standalone is locally validated and truthful about its FFDM-only clinician-in-the-loop scope. The current public head now includes workflow hardening and an opt-in SQLite persistence seam that are green locally, but hosted workflow evidence still lags behind and is anchored to the previous public head. The current working theory remains hosted-CI drift rather than a reproduced product regression.
- Current public head: `98ff80714a9ddfa42e718d0706939baf24d32d5f`
- Current local validation snapshot: `npm run validate:public-export` green at 54 tests, 54 pass, 0 fail, 0 skipped; `npm run smoke:health` green; `npm audit --omit=dev --audit-level=high` green with 0 vulnerabilities; `python -m unittest python_sidecar.tests.test_app` green at 3 tests, 0 failures; and a fresh local `npm ci` + `python -m pip install -r python_sidecar/requirements.txt` + build/test/smoke rerun is also green.
- Public repository: `https://github.com/KonkovaElena/OpenMammo`
- Current evidence packet: `docs/verification/release-validation-packet.md`

## Hosted Workflow Snapshot

Recorded hosted evidence for the most recently verified previous public head:

1. `CodeQL` succeeded on `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24009630266`
2. `Supply Chain Provenance` succeeded on `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24009630263`
3. `standalone-ci` failed on `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24009630264`
4. The `container-smoke` job was skipped because the matrix `validate` job in `standalone-ci` failed on both `ubuntu-latest` and `windows-latest`.

## Interpretation

The current public repository proves strong local validation on the new head and previously proved hosted static-analysis and supply-chain surfaces on the preceding head, but it does not yet prove a green hosted runtime-validation lane for the new current public head.

Local reruns on the new repository head are green, so the current open evidence question is not product-scope honesty but hosted-CI closure. Until a successful rerun of `standalone-ci` exists on `main` for `98ff80714a9ddfa42e718d0706939baf24d32d5f`, the release packet should be treated as the primary current runtime evidence and the hosted workflow state as partially reconciled. The current public head already includes the workflow hardening changes for that rerun.

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
- `docs/verification/hosted-evidence-capture-template.md`