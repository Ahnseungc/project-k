import type { PolarimetricObservations, ViewCapture, ViewChannels } from "./types";

function mean3(img: number[][][]): number {
  let s = 0;
  let n = 0;
  for (const row of img) {
    for (const px of row) {
      s += (px[0] + px[1] + px[2]) / 3;
      n++;
    }
  }
  return s / Math.max(n, 1);
}

export function diffuseObs(I90: number[][][]): number[][][] {
  return I90.map((row) => row.map((px) => px.map((v) => 2 * v)));
}

export function diffusePolAlpha(I45: number[][][], I135: number[][][]): number[][][] {
  return I45.map((row, y) =>
    row.map((px, x) => px.map((v, c) => I135[y][x][c] - v)),
  );
}

export function specularDominant(I0: number[][][], I90: number[][][]): number[][][] {
  return I0.map((row, y) =>
    row.map((px, x) => px.map((v, c) => v - I90[y][x][c])),
  );
}

export function buildObservations(view: ViewCapture, hdr: ViewChannels): PolarimetricObservations {
  return {
    viewIndex: view.viewIndex,
    I_d: diffuseObs(hdr.I90),
    I_alpha: diffusePolAlpha(hdr.I45, hdr.I135),
    I_s: specularDominant(hdr.I0, hdr.I90),
  };
}

export function scalarMeans(obs: PolarimetricObservations) {
  return {
    Id: mean3(obs.I_d),
    Ialpha: mean3(obs.I_alpha),
    Is: mean3(obs.I_s),
  };
}
