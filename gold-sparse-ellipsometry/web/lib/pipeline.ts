import { predictGold, regressorVersion } from "./gold";
import { initializeGeometry } from "./geo";
import { buildObservations } from "./obs";
import { optimizeSvbrdf } from "./pbr";
import { generateSyntheticSession } from "./synthetic";
import { buildViewsFromUpload } from "./upload";
import type { MeasurementResult, MeasureRequest } from "./types";

function uuid(): string {
  return crypto.randomUUID();
}

function pushIfAbsent(flags: string[], flag: string): void {
  if (!flags.includes(flag)) flags.push(flag);
}

export async function runPipeline(req: MeasureRequest): Promise<MeasurementResult> {
  const stageLog: MeasurementResult["stage_log"] = [];
  const log = (stage: string, status: string, detail = "") => {
    stageLog.push({ stage, status, detail });
  };

  let views;
  let referenceMethod = "synthetic";

  if (req.mode === "synthetic") {
    const karat = req.nominal_karat ?? 18;
    const nViews = Math.max(4, req.n_views ?? 12);
    views = generateSyntheticSession(karat, nViews);
    log("ValidateSession", "success", `${views.length} synthetic views`);
  } else if (req.mode === "upload") {
    if (!req.views?.length) {
      throw new Error("upload 모드에는 views 배열이 필요합니다.");
    }
    views = await buildViewsFromUpload(req.views);
    referenceMethod = "upload";
    log("ValidateSession", "success", `${views.length} uploaded views`);
    log("DecodeImages", "success", `decoded 4ch × ${views.length} views`);
  } else {
    throw new Error(`unknown mode: ${req.mode}`);
  }

  if (views.length < 4) {
    throw new Error("insufficient views (min 4)");
  }

  const observations = views.map((v) => buildObservations(v, v.channels));
  log("BuildObservations", "success", `${observations.length} views`);

  let svbrdf = initializeGeometry(observations, 1.5);
  log("InitializeGeometry", "success");

  const [optimized, metrics] = optimizeSvbrdf(svbrdf, observations, 20);
  svbrdf = optimized;
  log("OptimizeSVBRDF", "success", `loss=${metrics.loss_total?.toFixed(6) ?? "?"}`);

  const { gold_fraction, karat, confidence, features } = predictGold(svbrdf);
  log("PredictGold", "success", `karat=${karat.toFixed(2)}`);

  const flags: string[] = [];
  if (confidence < 0.6) flags.push("low_confidence");
  if (req.mode === "synthetic") flags.push("synthetic_input");
  if (req.mode === "upload") {
    flags.push("smartphone_capture");
    const { eta_mean, dop_mean, rho_d_R, rho_d_G, rho_d_B } = features;
    const chromaSpread = Math.max(rho_d_R, rho_d_G, rho_d_B) - Math.min(rho_d_R, rho_d_G, rho_d_B);
    const diffuseLoss = metrics.diffuse_loss_final ?? 0;
    const refractiveLoss = metrics.refractive_index_loss_final ?? 0;

    const nonGoldLikeOptics =
      eta_mean < 1.18 || eta_mean > 2.55 || dop_mean < 0.004 || (rho_d_B > rho_d_R && dop_mean < 0.02);
    const mixedMaterialSignal = chromaSpread > 0.28 || diffuseLoss > 0.085 || refractiveLoss > 0.015;
    const backgroundTooComplex = diffuseLoss > 0.12;

    if (nonGoldLikeOptics) pushIfAbsent(flags, "non_gold_candidate");
    if (mixedMaterialSignal) pushIfAbsent(flags, "mixed_material_suspected");
    if (backgroundTooComplex) pushIfAbsent(flags, "background_too_complex");
  }

  return {
    schema_version: "1.0.0",
    session_id: uuid(),
    processed_at: new Date().toISOString(),
    gold_fraction,
    karat,
    confidence,
    flags,
    optical_features: features,
    reference_method: referenceMethod,
    pipeline: {
      spec_version: "0.1.0",
      regressor_version: regressorVersion(),
      view_count: views.length,
      optimization_iters: Math.floor(metrics.iteration ?? 0) + 1,
    },
    quality_metrics: {
      diffuse_loss_final: metrics.diffuse_loss_final ?? 0,
      refractive_index_loss_final: metrics.refractive_index_loss_final ?? 0,
    },
    stage_log: stageLog,
  };
}
