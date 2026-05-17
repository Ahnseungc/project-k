import regressorData from "./regressor.json";
import type { OpticalFeatures, SVBRDFState } from "./types";

interface RegressorJson {
  version: string;
  feature_order: string[];
  coef: number[];
  intercept: number;
  scaler_mean: number[];
  scaler_scale: number[];
}

const reg = regressorData as RegressorJson;

export function extractGoldFeatures(state: SVBRDFState): OpticalFeatures {
  return {
    eta_mean: state.eta,
    eta_std: 0,
    rho_d_R: state.rho_d[0],
    rho_d_G: state.rho_d[1],
    rho_d_B: state.rho_d[2],
    dop_mean: state.dop_mean,
    psi_mean: state.dop_mean,
    kappa_s_mean: state.rho_s,
    surface_roughness_est: state.sigma_s,
  };
}

export function predictGold(state: SVBRDFState): {
  gold_fraction: number;
  karat: number;
  confidence: number;
  features: OpticalFeatures;
} {
  const features = extractGoldFeatures(state);
  const row = reg.feature_order.map((k) => features[k as keyof OpticalFeatures]);
  const scaled = row.map((v, i) => (v - reg.scaler_mean[i]) / Math.max(reg.scaler_scale[i], 1e-12));
  let karat = reg.intercept;
  for (let i = 0; i < reg.coef.length; i++) {
    karat += reg.coef[i] * scaled[i];
  }
  karat = Math.min(24, Math.max(0, karat));
  const gold_fraction = karat / 24;
  const confidence = Math.min(0.99, Math.max(0.4, 1 - Math.abs(karat - 18) / 24));
  return { gold_fraction, karat, confidence, features };
}

export function regressorVersion(): string {
  return reg.version;
}
