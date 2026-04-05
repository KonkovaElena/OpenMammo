---
title: "Mammography Second Opinion Standalone Design"
status: active
version: "0.1.0"
last_updated: "2026-04-05"
tags: [mammography, ffdm, standalone, control-plane]
---

# Design: Mammography Second Opinion Standalone

## Goal

Build a truthful standalone clinician-in-the-loop FFDM mammography workflow rather than a speculative autonomous breast-imaging AI product.

## Runtime Thesis

The first standalone slice must prove workflow integrity, scope discipline, and independent bootability before it grows into ingestion, inference, review workbench, reporting, or delivery depth.

## Current Wave

Implemented in wave 1:
- independent Node and TypeScript runtime
- explicit bootstrap chain
- health, readiness, metrics, and manifest routes
- correlation headers for every response
- authority docs for mission, evidence, and roadmap

Implemented in the first wave 2 slice:
- FFDM case intake route
- request validation for the bounded intake contract
- mammography case aggregate and application use case
- in-memory persistence seam
- baseline draft-generation service for clinician review only

Implemented in the second wave 2 slice:
- file-backed persistence seam for draft mammography cases
- readback route for persisted draft retrieval after restart

Not implemented yet:
- image QC
- inference orchestration
- radiologist review workflow
- production-grade persistence
- report export
- archive integration

## Scope Discipline

V1 stays bounded to FFDM-only mammography and excludes DBT, ultrasound, MRI, and autonomous diagnosis.

The current case-intake slice does not change that boundary: it creates draft-only review cases and does not produce autonomous clinical output.

## Technology Direction

- TypeScript control plane
- Python sidecar in later waves for imaging compute
- OHIF and Orthanc compatibility seams in later waves
- MONAI, nnU-Net, MedSAM, and task-specific imaging pipelines on the compute path
- vLLM only where text or multimodal model serving becomes necessary
