from __future__ import annotations

from dataclasses import dataclass

from gse.harness.context import RunContext
from gse.harness.stage import Stage, StageResult, StageStatus


@dataclass
class PipelineHarness:
    """
    Orchestrates ordered stages with fail-fast semantics and audit log.
    Mirrors Harness pipeline stage/step execution model.
    """

    stages: list[Stage]
    name: str = "gse-process"

    def execute(self, ctx: RunContext) -> RunContext:
        for stage in self.stages:
            result = stage.run(ctx)
            ctx.log_stage(stage.name, result.status.value, result.message)
            if result.status == StageStatus.FAILED:
                raise RuntimeError(f"Stage '{stage.name}' failed: {result.message}")
        return ctx

    def dry_run(self, ctx: RunContext) -> list[StageResult]:
        results: list[StageResult] = []
        for stage in self.stages:
            results.append(StageResult(StageStatus.SKIPPED, f"would run {stage.name}"))
        return results
