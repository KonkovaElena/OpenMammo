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
  - wires the app with runtime dependencies, including the configured case repository

- `src/application/createApp.ts`
  - creates the Express app
  - sets correlation headers
  - exposes `/healthz`, `/readyz`, `/metrics`, and `/api/v1/manifest`

- `src/domain/manifest.ts`
  - declares machine-readable mission, modality boundary, safety posture, and non-goals

## Operational Rule

There is one listener entrypoint and one composition root. Future ingestion, persistence, inference, review, and delivery modules must be wired through `src/bootstrap.ts` rather than creating secondary boot chains.