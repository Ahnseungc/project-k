import type { PolarimetricObservations, SVBRDFState } from "./types";
import { scalarMeans } from "./obs";

function fresnelTransmission(theta: number, eta: number): [number, number] {
  const cosI = Math.cos(theta);
  const sinT = Math.sin(theta) / eta;
  const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
  const rs = ((cosI - eta * cosT) / (cosI + eta * cosT + 1e-12)) ** 2;
  const rp = ((eta * cosI - cosT) / (eta * cosI + cosT + 1e-12)) ** 2;
  const tPlus = 0.5 * (1 - rs + 1 - rp);
  const tMinus = 0.5 * (Math.abs(1 - rs - (1 - rp)));
  return [tPlus, tMinus];
}

export function predictDop(theta: number, eta: number): number {
  const [tPlus, tMinus] = fresnelTransmission(theta, eta);
  return Math.abs(tMinus / Math.max(tPlus, 1e-12));
}

function dopFromObs(Id: number, Ialpha: number): number {
  return Math.abs(Ialpha) / Math.max(Id, 1e-12);
}

function optimizeEta(
  state: SVBRDFState,
  observations: PolarimetricObservations[],
  weight: number,
): [SVBRDFState, number] {
  const measured: number[] = [];
  const thetas: number[] = [];
  for (const obs of observations) {
    const { Id, Ialpha } = scalarMeans(obs);
    measured.push(dopFromObs(Id, Ialpha));
    thetas.push(Math.acos(Math.min(1, Math.max(0, Math.abs(state.normals[2])))));
  }

  let bestEta = state.eta;
  let bestLoss = Infinity;
  for (let eta = 1.2; eta <= 2.5; eta += 0.01) {
    let loss = 0;
    for (let i = 0; i < measured.length; i++) {
      const d = predictDop(thetas[i], eta) - measured[i];
      loss += d * d;
    }
    if (loss < bestLoss) {
      bestLoss = loss;
      bestEta = eta;
    }
  }
  state.eta = bestEta;
  state.dop_mean = measured.reduce((a, b) => a + b, 0) / measured.length;
  return [state, weight * bestLoss];
}

export function optimizeSvbrdf(
  state: SVBRDFState,
  observations: PolarimetricObservations[],
  maxIters = 20,
  lambdas = { psi: 1, diffuse: 100, specular: 1 },
): [SVBRDFState, Record<string, number>] {
  let metrics: Record<string, number> = {};
  for (let it = 0; it < maxIters; it++) {
    let lossPsi = 0,
      lossD = 0,
      lossS = 0;
    [state, lossPsi] = optimizeEta(state, observations, lambdas.psi);

    const preds: number[] = [];
    for (const obs of observations) {
      preds.push(scalarMeans(obs).Id);
    }
    const target = preds.reduce((a, b) => a + b, 0) / preds.length;
    state.rho_d = state.rho_d.map((v) => Math.max(0, v * 0.7 + target * 0.3)) as [
      number,
      number,
      number,
    ];
    lossD =
      lambdas.diffuse *
      (preds.reduce((s, p) => s + (p - target) ** 2, 0) / preds.length);

    const isVals = observations.map((o) => scalarMeans(o).Is);
    const meanIs = isVals.reduce((a, b) => a + b, 0) / isVals.length;
    const varIs =
      isVals.reduce((s, v) => s + (v - meanIs) ** 2, 0) / isVals.length;
    state.rho_s = Math.min(1, Math.max(0.001, state.rho_s * 0.8 + Math.max(meanIs, 0) * 0.2));
    lossS = lambdas.specular * varIs;

    const total = lossPsi + lossD + lossS;
    metrics = {
      iteration: it,
      loss_psi: lossPsi,
      loss_diffuse: lossD,
      loss_specular: lossS,
      loss_total: total,
      refractive_index_loss_final: lossPsi,
      diffuse_loss_final: lossD,
    };
    if (total < 1e-4) break;
  }
  return [state, metrics];
}
