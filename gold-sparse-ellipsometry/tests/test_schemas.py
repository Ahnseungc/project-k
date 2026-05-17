import json
from pathlib import Path

import pytest

from gse.harness.validators import SchemaValidator
from gse.pipeline.factory import run_process_pipeline
from gse.acq.synthetic import generate_synthetic_session
from gse.models.types import CalibrationBundle

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "docs" / "schemas"


def test_measurement_result_schema():
    session = generate_synthetic_session(session_id="schema-test", karat=18.0, n_views=4)
    result = run_process_pipeline(
        session,
        CalibrationBundle.default(),
        ROOT / "tests" / "_work_schema",
    )
    validator = SchemaValidator(SCHEMAS / "measurement_result.schema.json")
    errors = validator.validate(result.to_dict())
    assert errors == [], errors


def test_calibration_bundle_schema():
    from gse.cal.io import save_calibration
    import tempfile

    bundle = CalibrationBundle.default("t")
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "cal.json"
        save_calibration(bundle, path)
        data = json.loads(path.read_text())
        validator = SchemaValidator(SCHEMAS / "calibration_bundle.schema.json")
        assert validator.validate(data) == []
