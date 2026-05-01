# Mammography Second Opinion

[English](README.md) | Русский

`OpenMammo` — clinician-in-the-loop контур второго мнения для полноформатной цифровой маммографии (FFDM). Репозиторий сознательно ограничен узким и проверяемым scope: рабочий процесс вокруг кейса, safety boundary, контроль маршрута и инженерная готовность к публикации, а не автономная интерпретация снимков.

## Текущая область реализации

- только FFDM;
- один двусторонний четырёхпроекционный экзамен на кейс;
- machine-readable manifest с миссией, границами и non-goals;
- валидированный intake contract для FFDM кейса;
- QC summary по полноте metadata;
- базовая генерация черновика для врача;
- сохранение orchestration summary с временем этапов и provenance модели;
- clinician review и finalization workflow с фиксируемым reviewer decision;
- рендеринг и текстовый экспорт финализированного clinician report;
- SHA-256 sealing и integrity verification для итогового отчёта;
- delivery tracking для финализированных кейсов;
- OHIF-compatible review seam и Orthanc/DICOMweb archive seam;
- opt-in file или SQLite persistence;
- paginated case listing, lifecycle event history, rate limiting, bearer protection и correlation headers.

## Что проект не заявляет

- DBT;
- ultrasound;
- breast MRI;
- автономную диагностику;
- замену PACS;
- платформу обучения модели.

## Быстрый старт

```bash
npm install
npm test
npm run build
npm run test:coverage
npm run smoke:health
npm run sbom:cyclonedx:file
npm run dev
```

Порт по умолчанию: `4030`

## Проверка качества

Удобные локальные проверки:

- `npm test` — основной `node:test` suite;
- `npm run test:coverage` — тот же suite с coverage;
- `npm run smoke:health` — запуск собранного приложения и проверка `/healthz`/`/readyz`;
- `npm run sbom:cyclonedx:file` — запись нормализованного CycloneDX SBOM;
- `npm run validate:public-export` — публикационный baseline;
- `python -m unittest python_sidecar.tests.test_app` — проверка sidecar scaffold.

## Контейнер и поставка

Локальный контейнерный baseline:

```bash
docker build --tag mammography-second-opinion:local .
docker run -d --rm --name mammography-second-opinion-local -p 18080:4030 mammography-second-opinion:local
node scripts/smoke-health.mjs --skip-start --base-url http://127.0.0.1:18080
docker stop mammography-second-opinion-local
```

Репозиторий уже содержит выделенный workflow provenance и SBOM-аттестаций, а GitHub Actions настроены с pin по commit SHA.

## Persistence modes

- `CASE_STORE_BACKEND=file` — текущее JSON snapshot store behavior;
- `CASE_STORE_BACKEND=sqlite` — file-backed SQLite через встроенный `node:sqlite`;
- `CASE_STORE_BACKEND=memory` — эпизодический режим для тестов и коротких прогонов.

## Защита API

- `AUTH_BEARER_TOKEN` включает opt-in Bearer boundary для `/api/v1/cases` и вложенных case routes;
- `AUTH_BEARER_ACTOR_ID` и `AUTH_BEARER_ACTOR_ROLE` описывают доверенную service identity;
- `/healthz`, `/readyz`, `/metrics`, `/api/v1/manifest` и integration seams остаются открытыми.

Это не полноценная IAM-система: здесь пока нет делегированных scope, per-user identity, rotation policy и интеграции с внешним identity provider.

## Trust surfaces

- [README.md](README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [SUPPORT.md](SUPPORT.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [CITATION.cff](CITATION.cff)
- [docs/verification/release-validation-packet.md](docs/verification/release-validation-packet.md)
- [docs/verification/launch-evidence-index.md](docs/verification/launch-evidence-index.md)
- [docs/verification/hazard-analysis.md](docs/verification/hazard-analysis.md)
- [docs/verification/traceability-matrix.md](docs/verification/traceability-matrix.md)

## Safety posture

Репозиторий не является диагностическим устройством. Даже будущие модельные outputs остаются только draft-only материалом и требуют обязательного review квалифицированным врачом до финализации и доставки результата.

## Лицензия

См. [LICENSE](LICENSE).
