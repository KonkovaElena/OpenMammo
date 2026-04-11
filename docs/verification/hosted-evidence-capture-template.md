# Hosted Evidence Capture Template

Use this template after a fresh GitHub Actions rerun on `main`.

## Head

- Commit SHA:
- Date:
- Trigger type:

## Workflow Results

1. `standalone-ci`
   - Run URL:
   - Verdict:
   - Notes:
2. `container-smoke`
   - Run URL:
   - Verdict:
   - Notes:
3. `Supply Chain Provenance`
   - Run URL:
   - Verdict:
   - Notes:
4. `CodeQL`
   - Run URL:
   - Verdict:
   - Notes:

## Local Comparison

- Local `npm run validate:public-export` status:
- Local `npm run smoke:health` status:
- Local `python -m unittest python_sidecar.tests.test_app` status:

## Delta Assessment

- Hosted-only failures:
- Local-only failures:
- Final interpretation: