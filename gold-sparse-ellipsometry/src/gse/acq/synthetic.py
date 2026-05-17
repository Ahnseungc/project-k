"""Synthetic polarimetric captures for harness integration tests."""

from __future__ import annotations

import numpy as np

from gse.models.types import CaptureSession, FlashIntensity, ViewCapture
from gse.obs.stokes import diffuse_obs, diffuse_pol_alpha, specular_dominant


def generate_synthetic_session(
    *,
    session_id: str,
    karat: float = 18.0,
    n_views: int = 12,
    size: int = 64,
) -> CaptureSession:
    rng = np.random.default_rng(int(karat * 100))
    eta = 1.4 + (karat / 24) * 0.85
    rho = 0.35 + (karat / 24) * 0.45
    dop_scale = 0.1 + (24 - karat) / 24 * 0.1

    views: list[ViewCapture] = []
    for k in range(n_views):
        flash = [FlashIntensity.QUARTER, FlashIntensity.EIGHTH, FlashIntensity.SIXTEENTH][k % 3]
        scale = {FlashIntensity.QUARTER: 0.25, FlashIntensity.EIGHTH: 0.125, FlashIntensity.SIXTEENTH: 0.0625}[
            flash
        ]
        base = rho * scale * (0.9 + 0.1 * rng.random((size, size, 3)))
        I90 = base * (0.5 + 0.02 * rng.random((size, size, 3)))
        I_alpha_amp = dop_scale * scale
        I45 = base * 0.5 - I_alpha_amp * 0.5
        I135 = base * 0.5 + I_alpha_amp * 0.5
        I0 = I90 + 0.05 * scale * (1 + 0.1 * rng.random((size, size, 3)))
        views.append(
            ViewCapture(
                view_index=k,
                flash_intensity=flash,
                channels={
                    "I0": I0,
                    "I90": I90,
                    "I45": I45,
                    "I135": I135,
                },
            )
        )

    return CaptureSession(
        session_id=session_id,
        device_id="synthetic",
        sample_id=f"au-{int(karat)}k",
        views=views,
        nominal_karat=karat,
        material_label=f"Au alloy {karat}K",
    )


def render_observations_from_params(
    karat: float, size: int = 32
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Ground-truth Id, Ialpha, Is for unit tests."""
    session = generate_synthetic_session(session_id="t", karat=karat, n_views=1, size=size)
    v = session.views[0]
    I0, I90, I45, I135 = v.channels["I0"], v.channels["I90"], v.channels["I45"], v.channels["I135"]
    return diffuse_obs(I90), diffuse_pol_alpha(I45, I135), specular_dominant(I0, I90)
