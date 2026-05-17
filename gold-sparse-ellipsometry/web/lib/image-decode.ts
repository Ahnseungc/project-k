import type { PolChannel, ViewChannels } from "./types";

const MAX_SIDE = 128;

/** Decode JPEG/PNG data URL to H×W×3 tensor in [0,1] using sharp (Node only). */
export async function decodeDataUrlToTensor(dataUrl: string): Promise<number[][][]> {
  const sharp = (await import("sharp")).default;
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
  const buf = Buffer.from(base64, "base64");

  const { data, info } = await sharp(buf)
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: false })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out: number[][][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[][] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i]! / 255;
      const g = (channels > 1 ? data[i + 1]! : r) / 255;
      const b = (channels > 2 ? data[i + 2]! : r) / 255;
      row.push([r, g, b]);
    }
    out.push(row);
  }
  return out;
}

export async function decodeViewChannels(
  channels: Record<PolChannel, string>,
): Promise<ViewChannels> {
  const keys: PolChannel[] = ["I0", "I90", "I45", "I135"];
  const decoded = await Promise.all(keys.map((k) => decodeDataUrlToTensor(channels[k])));
  return {
    I0: decoded[0]!,
    I90: decoded[1]!,
    I45: decoded[2]!,
    I135: decoded[3]!,
  };
}
