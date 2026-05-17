from __future__ import annotations

from gse.models.types import SVBRDFState


def extract_gold_features(state: SVBRDFState) -> dict[str, float]:
    rho = state.rho_d
    return {
        "eta_mean": state.eta,
        "eta_std": 0.0,
        "rho_d_R": float(rho[0]),
        "rho_d_G": float(rho[1]) if rho.size > 1 else float(rho[0]),
        "rho_d_B": float(rho[2]) if rho.size > 2 else float(rho[0]),
        "dop_mean": state.dop_mean,
        "psi_mean": state.dop_mean,
        "kappa_s_mean": state.rho_s,
        "surface_roughness_est": state.sigma_s,
    }
