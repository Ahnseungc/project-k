import type { PolarimetricObservations, SVBRDFState } from "./types";
import { scalarMeans } from "./obs";

function meanChannel(img: number[][][]): [number, number, number] {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (const row of img) {
    for (const px of row) {
      r += px[0];
      g += px[1];
      b += px[2];
      n++;
    }
  }
  const d = Math.max(n, 1);
  return [r / d, g / d, b / d];
}

export function initializeGeometry(
  observations: PolarimetricObservations[],
  etaInit = 1.5,
): SVBRDFState {
  const dopSamples: number[] = [];
  const rhoAcc: [number, number, number][] = [];

  for (const obs of observations) {
    const { Id, Ialpha } = scalarMeans(obs);
    const gamma = Math.sqrt(meanChannel(obs.I_alpha).reduce((a, v) => a + v * v, 0) / 3);
    dopSamples.push(gamma / Math.max(Id, 1e-8));
    const rgb = meanChannel(obs.I_d);
    rhoAcc.push(rgb);
  }

  const rho_d = rhoAcc.reduce(
    (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
    [0, 0, 0],
  ).map((x) => x / rhoAcc.length) as [number, number, number];

  const alpha = observations[0].I_alpha;
  let sumGy = 0,
    sumGx = 0;
  for (let y = 1; y < alpha.length - 1; y++) {
    for (let x = 1; x < alpha[0].length - 1; x++) {
      const c = (alpha[y][x][0] + alpha[y][x][1] + alpha[y][x][2]) / 3;
      const cy =
        (alpha[y + 1][x][0] + alpha[y - 1][x][0]) / 2 - c;
      const cx =
        (alpha[y][x + 1][0] + alpha[y][x - 1][0]) / 2 - c;
      sumGy += cy;
      sumGx += cx;
    }
  }
  const az = Math.atan2(sumGy, sumGx + 1e-8);
  const tilt = 0.15;
  const nx = Math.sin(tilt) * Math.cos(az);
  const ny = Math.sin(tilt) * Math.sin(az);
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const len = Math.hypot(nx, ny, nz);

  return {
    eta: etaInit,
    rho_d,
    rho_s: 0.05,
    sigma_s: 0.15,
    rho_ss: 0.02,
    sigma_ss: 0.25,
    normals: [nx / len, ny / len, nz / len],
    dop_mean: dopSamples.reduce((a, b) => a + b, 0) / dopSamples.length,
  };
}
