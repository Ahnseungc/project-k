"""Harness stages wired to SPEC §5 pipeline."""

from __future__ import annotations

from gse.cal.hdr import merge_hdr_channels
from gse.geo.initialize import initialize_geometry
from gse.gold.features import extract_gold_features
from gse.gold.regressor import GoldRegressor
from gse.harness.context import RunContext
from gse.harness.stage import Stage, StageResult, StageStatus
from gse.models.types import MeasurementResult
from gse.obs.builder import build_observations
from gse.pbr.solver import optimize_svbrdf


class ValidateSessionStage(Stage):
    def run(self, ctx: RunContext) -> StageResult:
        if len(ctx.session.views) < ctx.config.get("geometry", {}).get("min_views", 1):
            return StageResult(StageStatus.FAILED, "insufficient views")
        for v in ctx.session.views:
            if not all(k in v.channels for k in ("I0", "I90", "I45", "I135")):
                return StageResult(StageStatus.FAILED, f"view {v.view_index} missing channels")
        return StageResult(StageStatus.SUCCESS)


class BuildObservationsStage(Stage):
    def run(self, ctx: RunContext) -> StageResult:
        obs_list = []
        # Group by view_index, merge HDR across flash levels if multiple
        by_view: dict[int, list] = {}
        for v in ctx.session.views:
            by_view.setdefault(v.view_index, []).append(v)

        for view_idx, views in sorted(by_view.items()):
            if len(views) == 1:
                v = views[0]
                hdr = {k: v.channels[k] for k in ("I0", "I90", "I45", "I135")}
            else:
                groups = {"batch": views}
                hdr = {ch: merge_hdr_channels(groups, ch) for ch in ("I0", "I90", "I45", "I135")}
            obs_list.append(build_observations(views[0], hdr))

        ctx.observations = obs_list
        return StageResult(StageStatus.SUCCESS, f"{len(obs_list)} views")


class InitializeGeometryStage(Stage):
    def run(self, ctx: RunContext) -> StageResult:
        eta_init = ctx.config.get("optimization", {}).get("eta_init", 1.5)
        ctx.svbrdf = initialize_geometry(ctx.observations, eta_init=eta_init)
        return StageResult(StageStatus.SUCCESS)


class OptimizeSVBRDFStage(Stage):
    def run(self, ctx: RunContext) -> StageResult:
        if ctx.svbrdf is None:
            return StageResult(StageStatus.FAILED, "svbrdf not initialized")
        opt_cfg = ctx.config.get("optimization", {})
        ctx.svbrdf, metrics = optimize_svbrdf(
            ctx.svbrdf,
            ctx.observations,
            max_iters=opt_cfg.get("max_iters", 20),
            lambdas=opt_cfg.get("lambdas"),
        )
        ctx.artifacts["optimization_metrics"] = metrics
        return StageResult(StageStatus.SUCCESS)


class ExtractFeaturesStage(Stage):
    def run(self, ctx: RunContext) -> StageResult:
        if ctx.svbrdf is None:
            return StageResult(StageStatus.FAILED, "svbrdf missing")
        ctx.features = extract_gold_features(ctx.svbrdf)
        return StageResult(StageStatus.SUCCESS)


class PredictGoldStage(Stage):
    def __init__(self, regressor: GoldRegressor | None = None) -> None:
        super().__init__("PredictGold")
        self._regressor = regressor

    def run(self, ctx: RunContext) -> StageResult:
        if ctx.svbrdf is None:
            return StageResult(StageStatus.FAILED, "svbrdf missing")
        reg_path = ctx.work_dir / "models" / "gold_regressor.pkl"
        if self._regressor is not None:
            reg = self._regressor
        elif reg_path.exists():
            reg = GoldRegressor.load(reg_path)
        else:
            from gse.gold.regressor import train_default_regressor

            reg = train_default_regressor()
            reg.save(reg_path)

        gf, karat, conf = reg.predict(ctx.svbrdf)
        flags: list[str] = []
        threshold = ctx.config.get("gold_regressor", {}).get("confidence_threshold", 0.6)
        if conf < threshold:
            flags.append("low_confidence")

        metrics = ctx.artifacts.get("optimization_metrics", {})
        ctx.result = MeasurementResult(
            session_id=ctx.session.session_id,
            gold_fraction=gf,
            karat=karat,
            confidence=conf,
            optical_features=ctx.features,
            flags=flags,
            pipeline={
                "spec_version": "0.1.0",
                "regressor_version": reg.version,
                "view_count": len(ctx.observations),
                "optimization_iters": int(metrics.get("iteration", 0)) + 1,
            },
            quality_metrics={
                "diffuse_loss_final": float(metrics.get("diffuse_loss_final", 0)),
                "refractive_index_loss_final": float(metrics.get("refractive_index_loss_final", 0)),
            },
        )
        return StageResult(StageStatus.SUCCESS, f"karat={karat:.2f}")


class WriteResultStage(Stage):
    def run(self, ctx: RunContext) -> StageResult:
        if ctx.result is None:
            return StageResult(StageStatus.FAILED, "no result")
        out = ctx.work_dir / "result.json"
        import json

        with out.open("w", encoding="utf-8") as f:
            json.dump(ctx.result.to_dict(), f, indent=2)
        ctx.artifacts["result_path"] = str(out)
        return StageResult(StageStatus.SUCCESS, str(out))
