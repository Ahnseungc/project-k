from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from gse.models.types import CaptureSession, FlashIntensity, ViewCapture


def load_session_from_dir(session_dir: Path) -> CaptureSession:
    meta_path = session_dir / "session.json"
    with meta_path.open(encoding="utf-8") as f:
        meta = json.load(f)
    session = CaptureSession.from_dict(meta)
    views_loaded: list[ViewCapture] = []
    for v in meta["views"]:
        idx = v["view_index"]
        flash = FlashIntensity(v["flash_intensity"])
        channels = {}
        for ch in ("I0", "I90", "I45", "I135"):
            path = session_dir / f"view_{idx:03d}" / f"{ch}.png"
            if path.exists():
                channels[ch] = load_view_channels(path)
        views_loaded.append(ViewCapture(view_index=idx, flash_intensity=flash, channels=channels))
    session.views = views_loaded
    return session


def load_view_channels(path: Path) -> np.ndarray:
    img = Image.open(path)
    arr = np.asarray(img, dtype=np.float64) / 65535.0 if img.mode == "I;16" else np.asarray(img) / 255.0
    if arr.ndim == 2:
        arr = np.stack([arr, arr, arr], axis=-1)
    return arr
