"""Paper §3.4 — Stokes observations from four polarization channels."""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

STOKES_ANALYSIS = np.array(
    [
        [1, 1, 0, 0],
        [1, -1, 0, 0],
        [1, 0, 1, 0],
        [1, 0, -1, 0],
    ],
    dtype=np.float64,
)


def _as_float(arr: NDArray) -> NDArray[np.float64]:
    return np.asarray(arr, dtype=np.float64)


def stokes_from_channels(
    I0: NDArray,
    I90: NDArray,
    I45: NDArray,
    I135: NDArray,
) -> NDArray[np.float64]:
    """Map four intensity images to Stokes vector field s_o (per pixel, per channel stack)."""
    s0 = _as_float(I0)
    s1 = _as_float(I90)
    s2 = _as_float(I45)
    s3 = _as_float(I135)
    if s0.ndim == 2:
        stack = np.stack([s0, s1, s2, s3], axis=0)
        h, w = s0.shape
        flat = stack.reshape(4, -1)
        solved = np.linalg.lstsq(STOKES_ANALYSIS, flat, rcond=None)[0]
        return solved.reshape(4, h, w)
    # HxWxC: solve per color
    h, w, c = s0.shape
    out = np.zeros((4, h, w, c), dtype=np.float64)
    for ch in range(c):
        stack = np.stack([s0[..., ch], s1[..., ch], s2[..., ch], s3[..., ch]], axis=0)
        out[..., ch] = np.linalg.solve(STOKES_ANALYSIS, stack.reshape(4, -1)).reshape(4, h, w)
    return out


def diffuse_obs(I90: NDArray) -> NDArray[np.float64]:
    """Eq. (16): I_d = 2 * I_90"""
    return 2.0 * _as_float(I90)


def diffuse_pol_alpha(I45: NDArray, I135: NDArray) -> NDArray[np.float64]:
    """Eq. (17): I_alpha = I_135 - I_45"""
    return _as_float(I135) - _as_float(I45)


def specular_dominant(I0: NDArray, I90: NDArray) -> NDArray[np.float64]:
    """Eq. (18): I_s = I_0 - I_90"""
    return _as_float(I0) - _as_float(I90)
