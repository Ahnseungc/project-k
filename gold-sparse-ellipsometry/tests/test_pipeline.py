from pathlib import Path

from gse.acq.synthetic import generate_synthetic_session
from gse.models.types import CalibrationBundle
from gse.pipeline.factory import build_process_harness, run_process_pipeline

ROOT = Path(__file__).resolve().parents[1]


def test_harness_stages_all_succeed():
    session = generate_synthetic_session(session_id="pipe-1", karat=22.0, n_views=8)
    result = run_process_pipeline(
        session,
        CalibrationBundle.default(),
        ROOT / "tests" / "_work_pipe",
    )
    assert 0 <= result.gold_fraction <= 1
    assert 0 <= result.karat <= 24
    assert result.confidence > 0
    assert result.pipeline["view_count"] == 8


def test_karat_monotonic_trend_synthetic():
    """Higher karat synthetic samples should trend to higher predicted karat."""
    preds = []
    for k in (10, 14, 18, 22, 24):
        session = generate_synthetic_session(session_id=f"k-{k}", karat=float(k), n_views=6)
        r = run_process_pipeline(session, CalibrationBundle.default(), ROOT / "tests" / f"_work_{k}")
        preds.append(r.karat)
    assert preds[-1] > preds[0]
