"""Gold karat regressor — Ridge on optical features (synthetic prior for MVP)."""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

from gse.gold.features import extract_gold_features
from gse.models.types import SVBRDFState

FEATURE_ORDER = [
    "eta_mean",
    "eta_std",
    "rho_d_R",
    "rho_d_G",
    "rho_d_B",
    "dop_mean",
    "psi_mean",
    "kappa_s_mean",
    "surface_roughness_est",
]


class GoldRegressor:
    def __init__(self, model: Ridge, scaler: StandardScaler, version: str = "0.1.0") -> None:
        self._model = model
        self._scaler = scaler
        self.version = version

    def predict(self, state: SVBRDFState) -> tuple[float, float, float]:
        features = extract_gold_features(state)
        x = np.array([[features[k] for k in FEATURE_ORDER]], dtype=np.float64)
        x_s = self._scaler.transform(np.nan_to_num(x, nan=0.0, posinf=1e6, neginf=-1e6))
        karat = float(self._model.predict(x_s)[0])
        karat = float(np.clip(karat, 0, 24))
        gold_fraction = karat / 24.0
        # Confidence from distance to training hull (simplified)
        confidence = float(np.clip(1.0 - abs(karat - 18) / 24.0, 0.4, 0.99))
        return gold_fraction, karat, confidence

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as f:
            pickle.dump({"model": self._model, "scaler": self._scaler, "version": self.version}, f)

    @staticmethod
    def load(path: Path) -> GoldRegressor:
        with path.open("rb") as f:
            data = pickle.load(f)
        return GoldRegressor(data["model"], data["scaler"], data.get("version", "0.1.0"))


def _synthetic_training_data(n: int = 200, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    X, y = [], []
    for karat in (10, 14, 18, 22, 24):
        for _ in range(n // 5):
            eta = 1.35 + (karat / 24) * 0.9 + rng.normal(0, 0.03)
            rho = 0.3 + (karat / 24) * 0.5 + rng.normal(0, 0.02, 3)
            dop = 0.08 + (24 - karat) / 24 * 0.12 + rng.normal(0, 0.01)
            row = {
                "eta_mean": eta,
                "eta_std": abs(rng.normal(0, 0.01)),
                "rho_d_R": rho[0],
                "rho_d_G": rho[1],
                "rho_d_B": rho[2],
                "dop_mean": dop,
                "psi_mean": dop,
                "kappa_s_mean": 0.04 + rng.uniform(0, 0.06),
                "surface_roughness_est": 0.1 + rng.uniform(0, 0.15),
            }
            X.append([row[k] for k in FEATURE_ORDER])
            y.append(karat)
    return np.array(X), np.array(y)


def train_default_regressor() -> GoldRegressor:
    X, y = _synthetic_training_data()
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    model = Ridge(alpha=0.5)
    model.fit(Xs, y)
    return GoldRegressor(model, scaler)
