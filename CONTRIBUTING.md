# Contributing

## Scope First

This repository is intentionally narrow. Contributions must preserve the active product boundary:

- FFDM only
- bilateral four-view exams only
- draft-only clinician-reviewed output
- no autonomous diagnosis

If a change widens those boundaries, it must land with explicit design and evidence updates in the same pull request.

## Development Flow

1. Open an issue or reference an existing issue before making non-trivial changes.
2. Keep changes small and directly tied to the stated problem.
3. Add or update tests before changing behavior.
4. Run the local validation lane before opening a pull request.

## Local Validation

```bash
npm test
npm run build
npm run test:coverage
npm run smoke:health
npm run validate:public-export
npm run sbom:cyclonedx:file
docker build --tag mammography-second-opinion:local .
docker run -d --rm --name mammography-second-opinion-local -p 18080:4030 mammography-second-opinion:local
node scripts/smoke-health.mjs --skip-start --base-url http://127.0.0.1:18080
```

## Pull Request Standard

- explain what changed and why
- list the validation you ran
- keep documentation aligned with implemented behavior
- do not widen clinical, regulatory, or investor claims without new evidence
- include SBOM/provenance validation when package or workflow supply-chain surfaces changed

## Safety and Privacy

- do not commit secrets, credentials, or patient data
- use de-identified or synthetic data only
- report security issues through the process in [SECURITY.md](SECURITY.md)