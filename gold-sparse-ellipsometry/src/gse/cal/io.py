from __future__ import annotations

import json
from pathlib import Path

from gse.models.types import CalibrationBundle


def load_calibration(path: Path) -> CalibrationBundle:
    with path.open(encoding="utf-8") as f:
        return CalibrationBundle.from_dict(json.load(f))


def save_calibration(bundle: CalibrationBundle, path: Path) -> None:
    payload = {
        "schema_version": bundle.schema_version,
        "device_id": bundle.device_id,
        "created_at": bundle.created_at,
        "geometry": {"camera_flash_angle_deg": bundle.camera_flash_angle_deg},
        "radiometric": {
            "hdr_response": bundle.hdr_response.tolist(),
            "flash_intensity_scale": bundle.flash_intensity_scale,
        },
        "stokes_matrix": bundle.stokes_matrix.tolist(),
        "gold_reference_offsets": bundle.gold_reference_offsets,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
