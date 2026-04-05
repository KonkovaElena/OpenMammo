# Summary

## What changed?

- 

## Why was this change needed?

- 

## Validation

- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:coverage` when the blast radius was non-trivial
- [ ] `npm run smoke:health` when runtime or HTTP behavior changed
- [ ] `npm run validate:public-export`
- [ ] `npm run sbom:cyclonedx:file` when dependency, lockfile, or provenance surfaces changed
- [ ] `docker build --tag mammography-second-opinion:local .` when container surfaces changed
- [ ] `node scripts/smoke-health.mjs --skip-start --base-url http://127.0.0.1:18080` when container runtime reachability changed

## Claim Boundary

- [ ] documentation stays aligned with the implemented software surface
- [ ] no clinical, regulatory, or investor claim was widened without new evidence

## Risk Review

- [ ] no secrets, patient data, or exploit details are exposed in this pull request
- [ ] no unrelated dependency churn or refactor was mixed into the change without necessity

## Notes For Reviewers

- 