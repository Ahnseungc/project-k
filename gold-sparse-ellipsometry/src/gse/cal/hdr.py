"""HDR merge across flash intensities (Debevec-Malik simplified)."""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from gse.models.types import FLASH_SCALE, FlashIntensity, ViewCapture


def merge_hdr_channels(
    exposure_groups: dict[str, list[ViewCapture]],
    channel: str,
) -> NDArray[np.float64]:
    """
    Weighted radiance merge: L = sum(w_i * I_i) / sum(w_i) with w = 1 for mid-range pixels.
    Groups keyed by polarization channel name; each list is views at different flash levels.
    """
    accum: NDArray[np.float64] | None = None
    weight_sum: NDArray[np.float64] | None = None

    for views in exposure_groups.values():
        for view in views:
            img = view.channels.get(channel)
            if img is None:
                continue
            scale = FLASH_SCALE[view.flash_intensity]
            radiance = np.asarray(img, dtype=np.float64) / max(scale, 1e-6)
            w = _triangular_weights(radiance)
            if accum is None:
                accum = radiance * w
                weight_sum = w.copy()
            else:
                accum += radiance * w
                weight_sum += w

    if accum is None or weight_sum is None:
        raise ValueError(f"No exposures for channel {channel}")
    return accum / np.maximum(weight_sum, 1e-8)


def _triangular_weights(img: NDArray[np.float64]) -> NDArray[np.float64]:
    """Favor mid-tones for HDR stability."""
    peak = np.percentile(img, 99) + 1e-6
    x = np.clip(img / peak, 0, 1)
    return np.minimum(x, 1 - x) + 1e-3
