"""Polarimetric inverse rendering — simplified L_psi + L_d + L_s loop."""

from __future__ import annotations

import numpy as np
from scipy.optimize import minimize

from gse.models.types import PolarimetricObservations, SVBRDFState
from gse.pbr.fresnel import dop_from_observations, predict_dop


def optimize_svbrdf(
    state: SVBRDFState,
    observations: list[PolarimetricObservations],
    *,
    max_iters: int = 20,
    lambdas: dict[str, float] | None = None,
) -> tuple[SVBRDFState, dict[str, float]]:
    lam = lambdas or {"psi": 1.0, "diffuse": 100.0, "specular": 1.0, "normal": 100.0}
    metrics: dict[str, float] = {}

    for it in range(max_iters):
        state, loss_psi = _step_eta(state, observations, lam["psi"])
        state, loss_d = _step_diffuse(state, observations, lam["diffuse"])
        state, loss_s = _step_specular(state, observations, lam["specular"])
        total = loss_psi + loss_d + loss_s
        metrics = {
            "iteration": float(it),
            "loss_psi": loss_psi,
            "loss_diffuse": loss_d,
            "loss_specular": loss_s,
            "loss_total": total,
        }
        if total < 1e-4:
            break

    metrics["refractive_index_loss_final"] = metrics.get("loss_psi", 0.0)
    metrics["diffuse_loss_final"] = metrics.get("loss_diffuse", 0.0)
    return state, metrics


def _scalar_obs(obs: PolarimetricObservations) -> tuple[float, float, float]:
    def m(x: np.ndarray) -> float:
        return float(np.mean(x))

    return m(obs.I_d), m(obs.I_alpha), m(obs.I_s)


def _step_eta(
    state: SVBRDFState,
    observations: list[PolarimetricObservations],
    weight: float,
) -> tuple[SVBRDFState, float]:
    measured = []
    thetas = []
    for obs in observations:
        Id, Ialpha, _ = _scalar_obs(obs)
        measured.append(dop_from_observations(Id, Ialpha))
        cos_n = abs(state.normals[2])
        thetas.append(float(np.arccos(np.clip(cos_n, 0, 1))))

    def objective(eta_arr: np.ndarray) -> float:
        eta = float(eta_arr[0])
        loss = 0.0
        for psi_m, theta in zip(measured, thetas):
            psi_p = predict_dop(theta, eta)
            loss += (psi_p - psi_m) ** 2
        return weight * loss

    res = minimize(objective, [state.eta], bounds=[(1.2, 2.5)], method="L-BFGS-B")
    state.eta = float(res.x[0])
    state.dop_mean = float(np.mean(measured))
    return state, float(res.fun)


def _step_diffuse(
    state: SVBRDFState,
    observations: list[PolarimetricObservations],
    weight: float,
) -> tuple[SVBRDFState, float]:
    preds = []
    for obs in observations:
        Id, _, _ = _scalar_obs(obs)
        preds.append(Id)
    target = np.mean(preds)
    state.rho_d = np.clip(state.rho_d * 0.7 + target * 0.3, 0, None)
    loss = weight * float(np.mean([(p - target) ** 2 for p in preds]))
    return state, loss


def _step_specular(
    state: SVBRDFState,
    observations: list[PolarimetricObservations],
    weight: float,
) -> tuple[SVBRDFState, float]:
    Is_vals = [_scalar_obs(o)[2] for o in observations]
    mean_is = float(np.mean(Is_vals))
    state.rho_s = float(np.clip(0.8 * state.rho_s + 0.2 * max(mean_is, 0), 0.001, 1.0))
    loss = weight * float(np.var(Is_vals))
    return state, loss
