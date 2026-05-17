from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

import numpy as np
from numpy.typing import NDArray


class FlashIntensity(str, Enum):
    QUARTER = "quarter"
    EIGHTH = "eighth"
    SIXTEENTH = "sixteenth"


FLASH_SCALE = {
    FlashIntensity.QUARTER: 0.25,
    FlashIntensity.EIGHTH: 0.125,
    FlashIntensity.SIXTEENTH: 0.0625,
}


@dataclass
class ViewCapture:
    view_index: int
    flash_intensity: FlashIntensity
    channels: dict[str, NDArray[np.float64]]  # I0, I90, I45, I135 -> HxW or HxWx3


@dataclass
class CaptureSession:
    session_id: str
    device_id: str
    sample_id: str
    views: list[ViewCapture]
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    nominal_karat: float | None = None
    material_label: str | None = None

    @staticmethod
    def from_dict(data: dict[str, Any]) -> CaptureSession:
        views = []
        for v in data["views"]:
            flash = FlashIntensity(v["flash_intensity"])
            views.append(
                ViewCapture(
                    view_index=v["view_index"],
                    flash_intensity=flash,
                    channels={},  # paths resolved by loader
                )
            )
        sample = data["sample"]
        return CaptureSession(
            session_id=data["session_id"],
            device_id=data["device_id"],
            sample_id=sample["id"],
            views=views,
            created_at=data.get("created_at", datetime.now(timezone.utc).isoformat()),
            nominal_karat=sample.get("nominal_karat"),
            material_label=sample.get("material_label"),
        )


@dataclass
class CalibrationBundle:
    device_id: str
    camera_flash_angle_deg: float
    stokes_matrix: NDArray[np.float64]  # 4x4
    hdr_response: NDArray[np.float64]
    flash_intensity_scale: dict[str, float]
    created_at: str
    schema_version: str = "1.0.0"
    gold_reference_offsets: dict[str, dict[str, float]] = field(default_factory=dict)

    @staticmethod
    def default(device_id: str = "default") -> CalibrationBundle:
        stokes = np.array(
            [
                [1, 1, 0, 0],
                [1, -1, 0, 0],
                [1, 0, 1, 0],
                [1, 0, -1, 0],
            ],
            dtype=np.float64,
        )
        return CalibrationBundle(
            device_id=device_id,
            camera_flash_angle_deg=3.5,
            stokes_matrix=stokes,
            hdr_response=np.linspace(0, 1, 256),
            flash_intensity_scale={"quarter": 0.25, "eighth": 0.125, "sixteenth": 0.0625},
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    @staticmethod
    def from_dict(data: dict[str, Any]) -> CalibrationBundle:
        return CalibrationBundle(
            device_id=data["device_id"],
            camera_flash_angle_deg=data["geometry"]["camera_flash_angle_deg"],
            stokes_matrix=np.array(data["stokes_matrix"], dtype=np.float64),
            hdr_response=np.array(data["radiometric"]["hdr_response"], dtype=np.float64),
            flash_intensity_scale=data["radiometric"].get("flash_intensity_scale", {}),
            created_at=data["created_at"],
            schema_version=data.get("schema_version", "1.0.0"),
            gold_reference_offsets=data.get("gold_reference_offsets", {}),
        )


@dataclass
class PolarimetricObservations:
    """Per-view observations (paper Eq. 16–18)."""

    view_index: int
    I_d: NDArray[np.float64]
    I_alpha: NDArray[np.float64]
    I_s: NDArray[np.float64]
    hdr_radiance: dict[str, NDArray[np.float64]]


@dataclass
class SVBRDFState:
    eta: float
    rho_d: NDArray[np.float64]  # (3,) RGB mean
    rho_s: float
    sigma_s: float
    rho_ss: float
    sigma_ss: float
    normals: NDArray[np.float64]  # (3,) unit
    dop_mean: float
    mesh_vertices: NDArray[np.float64] | None = None


@dataclass
class MeasurementResult:
    session_id: str
    gold_fraction: float
    karat: float
    confidence: float
    optical_features: dict[str, float]
    pipeline: dict[str, Any]
    flags: list[str] = field(default_factory=list)
    quality_metrics: dict[str, float] = field(default_factory=dict)
    schema_version: str = "1.0.0"
    processed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "session_id": self.session_id,
            "processed_at": self.processed_at,
            "gold_fraction": self.gold_fraction,
            "karat": self.karat,
            "confidence": self.confidence,
            "flags": self.flags,
            "optical_features": self.optical_features,
            "reference_method": "synthetic",
            "pipeline": self.pipeline,
            "quality_metrics": self.quality_metrics,
        }

    @staticmethod
    def new_session_id() -> str:
        return str(uuid4())
