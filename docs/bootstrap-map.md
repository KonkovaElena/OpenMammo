# Bootstrap Map

Date: 2026-04-05

## Entry Chain

1. `src/index.ts`
2. `src/config.ts`
3. `src/bootstrap.ts`
4. `src/application/createApp.ts`
5. `src/domain/manifest.ts`

## Runtime Responsibilities

- `src/index.ts`
  - loads environment configuration
  - owns the process-level shutdown flag
  - starts the HTTP listener
  - handles `SIGINT` and `SIGTERM`

- `src/config.ts`
  - validates `NODE_ENV`, `HOST`, `PORT`, `CASE_STORE_PATH`, and `METRICS_ENABLED`

- `src/bootstrap.ts`
  - acts as the composition root
  - creates the Prometheus registry
  - creates the request counter
  - wires the app with runtime dependencies, including the configured case repository, QC policy, baseline draft orchestrator path, clinician review finalization use case, and report rendering use case

- `src/application/createApp.ts`
  - creates the Express app
  - sets correlation headers
  - exposes `/healthz`, `/readyz`, `/metrics`, `/api/v1/manifest`, `/api/v1/cases`, `/api/v1/cases/:caseId/review`, `/api/v1/cases/:caseId/report`, `/api/v1/cases/:caseId`, and `/api/v1/cases/:caseId/events`
  - returns persisted QC, generation, and review summaries alongside case retrieval responses

- `src/domain/manifest.ts`
  - declares machine-readable mission, modality boundary, safety posture, and non-goals

## Operational Rule

There is one listener entrypoint and one composition root. Future ingestion, persistence, inference, review, and delivery modules must be wired through `src/bootstrap.ts` rather than creating secondary boot chains.

Current exception boundary:

- `python_sidecar/` is a separate future compute process scaffold. It is intentionally not wired into the Node listener chain yet and does not replace the single Node composition root for the public standalone.