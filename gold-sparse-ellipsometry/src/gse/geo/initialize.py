"""
Geometry init — Phase 1 planar gold sample (SfM substitute).
Multi-view diffuse observations drive a dominant normal via structure-from-polarization proxy.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

from gse.models.types import PolarimetricObservations, SVBRDFState


def initialize_geometry(
    observations: list[PolarimetricObservations],
    eta_init: float = 1.5,
) -> SVBRDFState:
    rho_d_acc = []
    dop_samples = []

    for obs in observations:
        Id = obs.I_d
        Ialpha = obs.I_alpha
        if Id.ndim == 3:
            Id_mean = Id.mean(axis=(0, 1))
            gamma = np.sqrt(np.mean(Ialpha**2, axis=(0, 1)))
            Id_scalar = float(np.mean(Id_mean))
            gamma_scalar = float(np.mean(gamma))
        else:
            Id_scalar = float(np.mean(Id))
            gamma_scalar = float(np.mean(np.abs(Ialpha)))

        dop = gamma_scalar / max(Id_scalar, 1e-8)
        dop_samples.append(dop)
        if Id.ndim == 3:
            rho_d_acc.append(Id_mean / max(Id_scalar, 1e-8) * Id_scalar)
        else:
            rgb = np.array([Id_scalar, Id_scalar, Id_scalar])
            rho_d_acc.append(rgb)

    rho_d = np.mean(rho_d_acc, axis=0)
    if rho_d.ndim == 0 or rho_d.size == 1:
        rho_d = np.array([float(rho_d)] * 3)

    # Normal from average alpha gradient direction (simplified SfP)
    normal = _estimate_normal_from_observations(observations)

    plane_z = _planar_mesh_grid(size=1.0, res=32)

    return SVBRDFState(
        eta=eta_init,
        rho_d=rho_d[:3],
        rho_s=0.05,
        sigma_s=0.15,
        rho_ss=0.02,
        sigma_ss=0.25,
        normals=normal,
        dop_mean=float(np.mean(dop_samples)),
        mesh_vertices=plane_z,
    )


def _estimate_normal_from_observations(observations: list[PolarimetricObservations]) -> NDArray[np.float64]:
    # Use I_alpha / I_d ratio map gradient as azimuth cue
    obs0 = observations[0]
    alpha = obs0.I_alpha
    if alpha.ndim == 3:
        alpha = alpha.mean(axis=2)
    gy, gx = np.gradient(alpha)
    az = np.arctan2(np.mean(gy), np.mean(gx) + 1e-8)
    tilt = 0.15
    nx = np.sin(tilt) * np.cos(az)
    ny = np.sin(tilt) * np.sin(az)
    nz = np.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))
    n = np.array([nx, ny, nz], dtype=np.float64)
    return n / np.linalg.norm(n)


def _planar_mesh_grid(size: float, res: int) -> NDArray[np.float64]:
    lin = np.linspace(-size / 2, size / 2, res)
    xx, yy = np.meshgrid(lin, lin)
    zz = np.zeros_like(xx)
    verts = np.stack([xx, yy, zz], axis=-1).reshape(-1, 3)
    return verts
