from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import jsonschema
from jsonschema import Draft202012Validator

from gse.harness.context import RunContext
from gse.harness.stage import Stage, StageResult, StageStatus


class SchemaValidator:
    def __init__(self, schema_path: Path) -> None:
        with schema_path.open(encoding="utf-8") as f:
            self._schema = json.load(f)
        self._validator = Draft202012Validator(self._schema)

    def validate(self, instance: dict[str, Any]) -> list[str]:
        errors = sorted(self._validator.iter_errors(instance), key=lambda e: e.path)
        return [e.message for e in errors]


class StageGate(Stage):
    """Pre/post gate — blocks pipeline on validation failure (Harness policy hook analogue)."""

    def __init__(
        self,
        name: str,
        validator: SchemaValidator,
        payload_fn: Any,
        *,
        required: bool = True,
    ) -> None:
        super().__init__(name)
        self._validator = validator
        self._payload_fn = payload_fn
        self._required = required

    def run(self, ctx: RunContext) -> StageResult:
        payload = self._payload_fn(ctx)
        if payload is None:
            if self._required:
                return StageResult(StageStatus.FAILED, "gate payload missing")
            return StageResult(StageStatus.SKIPPED, "no payload")
        errors = self._validator.validate(payload)
        if errors:
            return StageResult(StageStatus.FAILED, "; ".join(errors[:5]))
        return StageResult(StageStatus.SUCCESS)
