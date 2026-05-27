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
  mode: "synthetic" | "upload" | "single_image";
  nominal_karat?: number;
  n_views?: number;
  /** Multi-view smartphone capture (min 4 views, 4 pol channels each) */
  views?: UploadViewPayload[];
  /** One or two standard photos for simple estimate mode */
  images?: string[];
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface SingleImageFeatures {
  mean_luma: number;
  mean_saturation: number;
  highlight_ratio: number;
  shadow_ratio: number;
  warm_ratio: number;
  background_complexity: number;
  gold_pixel_ratio: number;
  object_fill_ratio: number;
}

export type MaterialClass = "gold" | "non_precious" | "plated" | "plastic" | "unknown";

export interface SingleImageEstimate {
  mode: "single_image";
  is_gold_like: boolean;
  material_class: MaterialClass;
  material_probabilities: Record<MaterialClass, number>;
  karat_range: "10-14K" | "14-18K" | "18-24K";
  probabilities: Record<"10-14K" | "14-18K" | "18-24K", number>;
  confidence: ConfidenceLevel;
  flags: Array<"non_gold_candidate" | "mixed_material_suspected" | "background_too_complex">;
  result_usable: boolean;
  needs_retake: boolean;
  reasons: string[];
  guidance: string[];
  disclaimer: string;
  features: SingleImageFeatures;
}
