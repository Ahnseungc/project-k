from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from gse.models.types import (
    CalibrationBundle,
    CaptureSession,
    MeasurementResult,
    PolarimetricObservations,
    SVBRDFState,
)


@dataclass
class RunContext:
    """Shared state passed through harness stages (Harness-style execution context)."""

    session: CaptureSession
    calibration: CalibrationBundle
    config: dict[str, Any]
    work_dir: Path
    observations: list[PolarimetricObservations] = field(default_factory=list)
    svbrdf: SVBRDFState | None = None
    features: dict[str, float] = field(default_factory=dict)
    result: MeasurementResult | None = None
    artifacts: dict[str, Any] = field(default_factory=dict)
    stage_log: list[dict[str, Any]] = field(default_factory=list)

    def log_stage(self, name: str, status: str, detail: str = "") -> None:
        self.stage_log.append({"stage": name, "status": status, "detail": detail})
