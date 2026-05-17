export type FlashIntensity = "quarter" | "eighth" | "sixteenth";

export type PolChannel = "I0" | "I90" | "I45" | "I135";

export const POL_CHANNELS: { key: PolChannel; label: string; angle: string }[] = [
  { key: "I0", label: "I₀", angle: "0°" },
  { key: "I90", label: "I₉₀", angle: "90°" },
  { key: "I45", label: "I₄₅", angle: "45°" },
  { key: "I135", label: "I₁₃₅", angle: "135°" },
];

export interface ViewChannels {
  I0: number[][][];
  I90: number[][][];
  I45: number[][][];
  I135: number[][][];
}

export interface ViewCapture {
  viewIndex: number;
  flashIntensity: FlashIntensity;
  channels: ViewChannels;
}

/** Client → API: JPEG data URLs per polarization channel */
export interface UploadViewPayload {
  viewIndex: number;
  flashIntensity: FlashIntensity;
  channels: Record<PolChannel, string>;
}

export interface PolarimetricObservations {
  viewIndex: number;
  I_d: number[][][];
  I_alpha: number[][][];
  I_s: number[][][];
}

export interface SVBRDFState {
  eta: number;
  rho_d: [number, number, number];
  rho_s: number;
  sigma_s: number;
  rho_ss: number;
  sigma_ss: number;
  normals: [number, number, number];
  dop_mean: number;
}

export interface OpticalFeatures {
  eta_mean: number;
  eta_std: number;
  rho_d_R: number;
  rho_d_G: number;
  rho_d_B: number;
  dop_mean: number;
  psi_mean: number;
  kappa_s_mean: number;
  surface_roughness_est: number;
}

export interface MeasurementResult {
  schema_version: string;
  session_id: string;
  processed_at: string;
  gold_fraction: number;
  karat: number;
  confidence: number;
  flags: string[];
  optical_features: OpticalFeatures;
  reference_method: string;
  pipeline: {
    spec_version: string;
    regressor_version: string;
    view_count: number;
    optimization_iters: number;
  };
  quality_metrics: {
    diffuse_loss_final: number;
    refractive_index_loss_final: number;
  };
  stage_log: { stage: string; status: string; detail: string }[];
}

export interface MeasureRequest {
  mode: "synthetic" | "upload";
  nominal_karat?: number;
  n_views?: number;
  /** Multi-view smartphone capture (min 4 views, 4 pol channels each) */
  views?: UploadViewPayload[];
}
