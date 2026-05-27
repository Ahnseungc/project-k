import type {
  ConfidenceLevel,
  MaterialClass,
  SingleImageEstimate,
  SingleImageFeatures,
} from "./types";

type KaratRange = SingleImageEstimate["karat_range"];

const RANGE_KEYS: KaratRange[] = ["10-14K", "14-18K", "18-24K"];
const MATERIAL_KEYS: MaterialClass[] = ["gold", "non_precious", "plated", "plastic", "unknown"];

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function normalizeScores(scores: Record<KaratRange, number>): Record<KaratRange, number> {
  const safe = RANGE_KEYS.map((k) => Math.max(0.0001, scores[k]));
  const sum = safe.reduce((a, b) => a + b, 0);
  return {
    "10-14K": safe[0]! / sum,
    "14-18K": safe[1]! / sum,
    "18-24K": safe[2]! / sum,
  };
}

function normalizeMaterialScores(
  scores: Record<MaterialClass, number>,
): Record<MaterialClass, number> {
  const safe = MATERIAL_KEYS.map((k) => Math.max(0.0001, scores[k]));
  const sum = safe.reduce((a, b) => a + b, 0);
  return {
    gold: safe[0]! / sum,
    non_precious: safe[1]! / sum,
    plated: safe[2]! / sum,
    plastic: safe[3]! / sum,
    unknown: safe[4]! / sum,
  };
}

function hslFromRgb(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h / 6) * 360, s, l };
}

function estimateConfidenceLevel(maxProb: number, needsRetake: boolean): ConfidenceLevel {
  if (needsRetake || maxProb < 0.48) return "low";
  if (maxProb < 0.62) return "medium";
  return "high";
}

function pickRange(probabilities: Record<KaratRange, number>): KaratRange {
  let winner: KaratRange = "14-18K";
  let max = -1;
  for (const k of RANGE_KEYS) {
    if (probabilities[k] > max) {
      max = probabilities[k];
      winner = k;
    }
  }
  return winner;
}

function pickMaterial(probabilities: Record<MaterialClass, number>): MaterialClass {
  let winner: MaterialClass = "unknown";
  let max = -1;
  for (const k of MATERIAL_KEYS) {
    if (probabilities[k] > max) {
      max = probabilities[k];
      winner = k;
    }
  }
  return winner;
}

function buildReasons(features: SingleImageFeatures): string[] {
  const reasons: string[] = [];
  if (features.highlight_ratio > 0.38) reasons.push("하이라이트가 과다하여 색 정보가 손실되었습니다.");
  if (features.shadow_ratio > 0.42) reasons.push("그림자가 강해 실제 금속 색 추정이 어렵습니다.");
  if (features.background_complexity > 0.25) reasons.push("배경이 복잡해 피사체 분리가 불안정합니다.");
  if (features.object_fill_ratio < 0.12) reasons.push("피사체 비율이 작아 파츠·배경 영향이 큽니다.");
  return reasons;
}

function buildGuidance(): string[] {
  return [
    "흰 배경 위에서 촬영해 주세요.",
    "직사광/강한 반사를 피하고 그림자를 약하게 유지해 주세요.",
    "정면 1장 + 약간 기울인 사진 1장을 권장합니다.",
  ];
}

export function scoreSingleImage(features: SingleImageFeatures): SingleImageEstimate {
  const flags: SingleImageEstimate["flags"] = [];
  const warm = features.warm_ratio;
  const sat = features.mean_saturation;
  const highlightPenalty = clamp01((features.highlight_ratio - 0.3) * 1.4);
  const shadowPenalty = clamp01((features.shadow_ratio - 0.35) * 1.2);
  const noisePenalty = clamp01((features.background_complexity - 0.2) * 1.5);
  const qualityPenalty = clamp01((highlightPenalty + shadowPenalty + noisePenalty) / 2.5);

  const lowScore = 0.35 + (1 - warm) * 0.5 + sat * 0.2 + qualityPenalty * 0.15;
  const midScore = 0.55 + (1 - Math.abs(warm - 0.58) * 2.2) * 0.45 + (1 - qualityPenalty) * 0.2;
  const highScore = 0.35 + warm * 0.55 + (1 - sat) * 0.15 - qualityPenalty * 0.2;

  const probabilities = normalizeScores({
    "10-14K": lowScore,
    "14-18K": midScore,
    "18-24K": highScore,
  });
  const materialProbabilities = normalizeMaterialScores({
    gold: 0.45 + warm * 0.5 + features.gold_pixel_ratio * 0.4 - features.background_complexity * 0.2,
    non_precious: 0.3 + sat * 0.45 + (1 - warm) * 0.35 + features.shadow_ratio * 0.2,
    plated:
      0.25 +
      features.gold_pixel_ratio * 0.3 +
      features.background_complexity * 0.35 +
      (1 - features.object_fill_ratio) * 0.3,
    plastic: 0.2 + sat * 0.5 + (1 - features.gold_pixel_ratio) * 0.35 + (1 - warm) * 0.2,
    unknown: 0.2 + qualityPenalty * 0.5 + (1 - features.object_fill_ratio) * 0.4,
  });
  const materialClass = pickMaterial(materialProbabilities);
  const isGoldLike = materialProbabilities.gold >= 0.45 && materialClass !== "plastic";

  if (!isGoldLike) flags.push("non_gold_candidate");
  if (features.object_fill_ratio < 0.14 || materialProbabilities.plated > 0.32) {
    flags.push("mixed_material_suspected");
  }
  if (features.background_complexity > 0.25) flags.push("background_too_complex");

  const karatRange = pickRange(probabilities);
  const maxProb = Math.max(...Object.values(probabilities));
  const reasons = buildReasons(features);
  const needsRetake = reasons.length > 0 || flags.includes("background_too_complex");
  const resultUsable = !flags.includes("non_gold_candidate") && !flags.includes("mixed_material_suspected");

  return {
    mode: "single_image",
    is_gold_like: isGoldLike,
    material_class: materialClass,
    material_probabilities: materialProbabilities,
    karat_range: karatRange,
    probabilities,
    flags,
    result_usable: resultUsable,
    confidence: estimateConfidenceLevel(maxProb, needsRetake),
    needs_retake: needsRetake,
    reasons,
    guidance: buildGuidance(),
    disclaimer: resultUsable
      ? "간편 모드 추정값은 참고용이며 거래/가격 결정에 사용할 수 없습니다."
      : "비금속/복합 소재 가능성이 높아 참고 불가입니다. 오프라인 전문 측정을 권장합니다.",
    features,
  };
}

export async function estimateFromImageDataUrls(images: string[]): Promise<SingleImageEstimate> {
  if (!images.length) throw new Error("single_image 모드에는 최소 1장 이미지가 필요합니다.");
  const sharp = (await import("sharp")).default;

  const accum = {
    luma: 0,
    sat: 0,
    highlight: 0,
    shadow: 0,
    warm: 0,
    complexity: 0,
    goldLikePixels: 0,
    objectPixels: 0,
    pixels: 0,
  };

  for (const image of images.slice(0, 2)) {
    const base64 = image.includes(",") ? image.split(",")[1]! : image;
    const buf = Buffer.from(base64, "base64");
    const { data, info } = await sharp(buf)
      .rotate()
      .resize(256, 256, { fit: "inside", withoutEnlargement: false })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    let edgeSum = 0;
    const lumGrid: number[][] = Array.from({ length: height }, () => Array<number>(width).fill(0));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        const r = data[i]! / 255;
        const g = data[i + 1]! / 255;
        const b = data[i + 2]! / 255;
        const { h, s, l } = hslFromRgb(r, g, b);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const warm = r / Math.max(0.001, (g + b) * 0.5);
        const isObjectPixel = s > 0.07 || l < 0.92;
        const isGoldTone = h >= 18 && h <= 62 && s > 0.12 && l > 0.12 && l < 0.9;
        lumGrid[y]![x] = luma;
        accum.luma += l;
        accum.sat += s;
        accum.warm += Math.min(2, warm) / 2;
        accum.highlight += luma > 0.9 ? 1 : 0;
        accum.shadow += luma < 0.1 ? 1 : 0;
        accum.objectPixels += isObjectPixel ? 1 : 0;
        accum.goldLikePixels += isGoldTone ? 1 : 0;
        accum.pixels += 1;
      }
    }

    for (let y = 1; y < height; y++) {
      for (let x = 1; x < width; x++) {
        edgeSum += Math.abs(lumGrid[y]![x]! - lumGrid[y]![x - 1]!) + Math.abs(lumGrid[y]![x]! - lumGrid[y - 1]![x]!);
      }
    }
    const edgeNorm = edgeSum / Math.max(1, (width - 1) * (height - 1) * 2);
    accum.complexity += clamp01(edgeNorm);
  }

  const imgCount = Math.min(images.length, 2);
  const features: SingleImageFeatures = {
    mean_luma: accum.luma / accum.pixels,
    mean_saturation: accum.sat / accum.pixels,
    highlight_ratio: accum.highlight / accum.pixels,
    shadow_ratio: accum.shadow / accum.pixels,
    warm_ratio: accum.warm / accum.pixels,
    background_complexity: accum.complexity / imgCount,
    gold_pixel_ratio: accum.goldLikePixels / Math.max(1, accum.objectPixels),
    object_fill_ratio: accum.objectPixels / Math.max(1, accum.pixels),
  };

  return scoreSingleImage(features);
}
