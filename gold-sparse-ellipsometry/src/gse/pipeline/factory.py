from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from gse.harness.pipeline import PipelineHarness
from gse.harness.validators import SchemaValidator, StageGate
from gse.models.types import CalibrationBundle, CaptureSession, MeasurementResult
from gse.pipeline.stages import (
    BuildObservationsStage,
    ExtractFeaturesStage,
    InitializeGeometryStage,
    OptimizeSVBRDFStage,
    PredictGoldStage,
    ValidateSessionStage,
    WriteResultStage,
)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def load_config(path: Path | None = None) -> dict[str, Any]:
    if path is None:
        path = _project_root() / "configs" / "pipeline_default.yaml"
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_process_harness(schema_dir: Path) -> PipelineHarness:
    result_schema = SchemaValidator(schema_dir / "measurement_result.schema.json")

    stages = [
        ValidateSessionStage("ValidateSession"),
        BuildObservationsStage("BuildObservations"),
        InitializeGeometryStage("InitializeGeometry"),
        OptimizeSVBRDFStage("OptimizeSVBRDF"),
        ExtractFeaturesStage("ExtractFeatures"),
        PredictGoldStage(),
        StageGate(
            "ValidateResult",
            result_schema,
            lambda ctx: ctx.result.to_dict() if ctx.result else None,
        ),
        WriteResultStage("WriteResult"),
    ]
    return PipelineHarness(stages=stages, name="gse-process")


def run_process_pipeline(
    session: CaptureSession,
    calibration: CalibrationBundle,
    work_dir: Path,
    config: dict[str, Any] | None = None,
) -> MeasurementResult:
    from gse.harness.context import RunContext

    work_dir.mkdir(parents=True, exist_ok=True)
    cfg = config or load_config()
    schema_dir = _project_root() / "docs" / "schemas"
    harness = build_process_harness(schema_dir)
    ctx = RunContext(
        session=session,
        calibration=calibration,
        config=cfg,
        work_dir=work_dir,
    )
    harness.execute(ctx)
    assert ctx.result is not None
    return ctx.result
