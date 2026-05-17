"""Fresnel transmission and DoP (paper Eq. 20–21)."""

from __future__ import annotations

import numpy as np


def fresnel_transmission(theta: float, eta: float) -> tuple[float, float]:
    """T+ and T- for unpolarized transmission (simplified dielectric)."""
    cos_t = np.sqrt(max(0.0, 1.0 - (np.sin(theta) / eta) ** 2))
    cos_i = np.cos(theta)
    rs = ((cos_i - eta * cos_t) / (cos_i + eta * cos_t + 1e-12)) ** 2
    rp = ((eta * cos_i - cos_t) / (eta * cos_i + cos_t + 1e-12)) ** 2
    t_s = 1.0 - rs
    t_p = 1.0 - rp
    t_plus = 0.5 * (t_s + t_p)
    t_minus = 0.5 * abs(t_s - t_p)
    return float(t_plus), float(t_minus)


def predict_dop(theta: float, eta: float) -> float:
    t_plus, t_minus = fresnel_transmission(theta, eta)
    return abs(t_minus / max(t_plus, 1e-12))


def dop_from_observations(Id: float, Ialpha: float, Ibeta: float | None = None) -> float:
    """Eq. (21): psi = Gamma / I_d"""
    if Ibeta is not None:
        gamma = np.sqrt(Ialpha**2 + Ibeta**2)
    else:
        gamma = abs(Ialpha)
    return float(gamma / max(Id, 1e-12))
