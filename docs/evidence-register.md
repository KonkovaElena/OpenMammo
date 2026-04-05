# Evidence Register

Date: 2026-04-05

## Current External Evidence Anchors

- DICOM current edition confirms the active standards boundary, including Part 18 web services and Part 20 imaging reports.
- OHIF is an actively maintained extensible imaging viewer suited for browser-based workflow integration.
- Orthanc remains the lightweight open-source DICOM server and archive reference point.
- MONAI and MONAI Model Zoo provide reusable medical imaging workflow and model-packaging patterns.
- nnU-Net remains a strong open medical imaging baseline and framework for dataset-specific segmentation pipelines.
- MedSAM demonstrates reusable promptable medical segmentation patterns but does not replace a control plane.
- vLLM is positioned as a production-grade, OpenAI-compatible serving engine for open models.
- VinDr-Mammo, CBIS-DDSM, and CMMD are the primary public mammography dataset anchors for the v1 scope.
- MedGemma is a useful downstream healthcare model starting point, but its model card explicitly says outputs are not for direct clinical decision-making and that it has not been optimized for multi-image workflows.

## Decision Consequences

- FFDM-only is the correct v1 modality boundary.
- Specialist imaging pipelines stay on the critical path.
- Generative medical LLMs can assist later but do not anchor diagnostic truth.
