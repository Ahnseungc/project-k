import type { FlashIntensity, ViewCapture } from "./types";

const FLASH_SCALE: Record<FlashIntensity, number> = {
  quarter: 0.25,
  eighth: 0.125,
  sixteenth: 0.0625,
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cube(size: number, value: number): number[][][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [value, value, value]),
  );
}

function cubeRand(size: number, rand: () => number, scale: number): number[][][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => {
      const v = scale * (0.9 + 0.1 * rand());
      return [v, v, v];
    }),
  );
}

export function generateSyntheticSession(
  karat: number,
  nViews: number,
  size = 48,
): ViewCapture[] {
  const rand = mulberry32(Math.floor(karat * 1000));
  const rho = 0.35 + (karat / 24) * 0.45;
  const dopScale = 0.1 + ((24 - karat) / 24) * 0.1;
  const flashes: FlashIntensity[] = ["quarter", "eighth", "sixteenth"];
  const views: ViewCapture[] = [];

  for (let k = 0; k < nViews; k++) {
    const flash = flashes[k % 3];
    const scale = FLASH_SCALE[flash];
    const I90 = cubeRand(size, rand, rho * scale * 0.5);
    const amp = dopScale * scale;
    const half = rho * scale * 0.5;
    const I45 = cube(size, half - amp * 0.5);
    const I135 = cube(size, half + amp * 0.5);
    const I0: number[][][] = Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => {
        const v = I90[y][x][0] + 0.05 * scale * (1 + 0.1 * rand());
        return [v, v, v];
      }),
    );

    views.push({
      viewIndex: k,
      flashIntensity: flash,
      channels: { I0, I90, I45, I135 },
    });
  }
  return views;
}
