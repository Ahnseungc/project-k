# Gold Sparse Ellipsometry

휴대형 편광 플래시 촬영(Sparse Ellipsometry) 기반 **금 함량 측정** 프로젝트.

## 문서

- **[시스템 스펙](docs/SPEC.md)** — 요구사항, 파이프라인, API, 마일스톤
- [JSON Schema](docs/schemas/) — `capture_session`, `measurement_result`, `calibration_bundle`
- [OpenAPI](docs/api/openapi.yaml)

## 기준 논문

Hwang et al., *Sparse Ellipsometry: Portable Acquisition of Polarimetric SVBRDF and Shape with Unstructured Flash Photography*, SIGGRAPH 2022. [arXiv:2207.04236](https://arxiv.org/abs/2207.04236)

## 웹 데모 (Vercel)

[`web/`](web/) — Next.js UI + `/api/measure` 서버리스 API. 배포 방법은 [web/README.md](web/README.md).

```bash
cd web && npm install && npm run dev
```

## 빠른 시작 (Python CLI)

```bash
cd gold-sparse-ellipsometry
pip install -e ".[dev]"
gse calibrate --device demo --out data/calibrations/demo.json
gse synthetic-demo --karat 18 --out out/result.json
pytest -q
```

## Harness 파이프라인

- **실행 하네스**: `gse.harness.PipelineHarness` — 스테이지·게이트·감사 로그
- **CI**: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`harness/pipeline.yaml`](harness/pipeline.yaml) (Harness v1)

## 상태

v0.1 — 스펙·스키마·파이프라인·CLI·API·테스트 구현 완료. 실측 RAW/COLMAP은 Phase 2.
