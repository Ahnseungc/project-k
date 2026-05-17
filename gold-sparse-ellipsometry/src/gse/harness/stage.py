from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Callable

from gse.harness.context import RunContext


class StageStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class StageResult:
    status: StageStatus
    message: str = ""


class Stage(ABC):
    """Single pipeline stage — Harness-style unit of work with explicit I/O contract."""

    name: str

    def __init__(self, name: str | None = None) -> None:
        self.name = name or self.__class__.__name__

    @abstractmethod
    def run(self, ctx: RunContext) -> StageResult:
        ...

    def __call__(self, ctx: RunContext) -> StageResult:
        return self.run(ctx)


class LambdaStage(Stage):
    def __init__(self, name: str, fn: Callable[[RunContext], StageResult]) -> None:
        super().__init__(name)
        self._fn = fn

    def run(self, ctx: RunContext) -> StageResult:
        return self._fn(ctx)
