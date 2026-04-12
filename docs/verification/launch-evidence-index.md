# Launch Evidence Index

This file tracks the current local and hosted evidence state for Mammography Second Opinion.

## Repository Status

- Current verdict: `LOCAL_VALIDATION_GREEN_HOSTED_STANDALONE_CI_PENDING`
- Last reviewed: 2026-04-12
- Current boundary note: the standalone is locally validated and truthful about its FFDM-only clinician-in-the-loop scope. Hosted GitHub evidence is mixed: CodeQL and supply-chain provenance are green on the current public head, but the public `standalone-ci` run on that same head is still red, so hosted CI closure is not yet complete. A fresh local `npm ci` plus Python dependency install rerun on 2026-04-09 is green, so the current working theory is hosted-CI drift rather than a reproduced product regression.
- Current public head: `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`
- Current local validation snapshot: `npm run validate:public-export` green at 48 tests, 48 pass, 0 fail, 0 skipped; `npm run smoke:health` green; `npm audit --omit=dev --audit-level=high` green with 0 vulnerabilities; `python -m unittest python_sidecar.tests.test_app` green at 3 tests, 0 failures; and a fresh local `npm ci` + `python -m pip install -r python_sidecar/requirements.txt` + build/test/smoke rerun is also green.
- Public repository: `https://github.com/KonkovaElena/OpenMammo`
- Current evidence packet: `docs/verification/release-validation-packet.md`

## Hosted Workflow Snapshot

Recorded hosted evidence for the current public head:

1. `CodeQL` succeeded on `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24009630266`
2. `Supply Chain Provenance` succeeded on `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24009630263`
3. `standalone-ci` failed on `07d1bd4db15cb89b99188dd659b4d8e5b9ef83a7`:
  `https://github.com/KonkovaElena/OpenMammo/actions/runs/24009630264`
4. The `container-smoke` job was skipped because the matrix `validate` job in `standalone-ci` failed on both `ubuntu-latest` and `windows-latest`.

## Interpretation

The current public repository proves hosted static-analysis and supply-chain surfaces, but it does not yet prove a green hosted runtime-validation lane for the current public head.

Local reruns on the same repository head are green, so the current open evidence question is not product-scope honesty but hosted-CI closure. Until a successful rerun of `standalone-ci` exists on `main`, the release packet should be treated as the primary current runtime evidence and the hosted workflow state as partially reconciled. The local workflow surfaces have already been hardened for the next hosted rerun by forcing JavaScript actions onto Node 24, moving `actions/setup-python` to v6, pinning workflow actions to immutable SHAs, disabling persisted checkout credentials in read-only jobs, adding `.github/CODEOWNERS` coverage for workflow files, and preparing a Scorecards code-scanning workflow.

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