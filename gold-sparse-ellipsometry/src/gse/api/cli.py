from __future__ import annotations

import json
from pathlib import Path

import click

from gse.acq.io import load_session_from_dir
from gse.acq.synthetic import generate_synthetic_session
from gse.cal.io import load_calibration, save_calibration
from gse.models.types import CalibrationBundle, MeasurementResult
from gse.pipeline.factory import load_config, run_process_pipeline


@click.group()
def main() -> None:
    """Gold Sparse Ellipsometry CLI (gse)."""


@main.command("process")
@click.option("--session", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--cal", type=click.Path(exists=True, path_type=Path), required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
@click.option("--config", type=click.Path(exists=True, path_type=Path), default=None)
@click.option("--synthetic-karat", type=float, default=None, help="Use synthetic data at given karat")
def process(
    session: Path,
    cal: Path,
    out: Path,
    config: Path | None,
    synthetic_karat: float | None,
) -> None:
    """Run harness pipeline on a capture session."""
    calibration = load_calibration(cal)
    cfg = load_config(config) if config else load_config()

    if synthetic_karat is not None:
        capture = generate_synthetic_session(
            session_id=MeasurementResult.new_session_id(),
            karat=synthetic_karat,
            n_views=cfg.get("geometry", {}).get("recommended_views", 12),
        )
    elif (session / "session.json").exists():
        capture = load_session_from_dir(session)
    else:
        raise click.ClickException("session dir must contain session.json or use --synthetic-karat")

    work_dir = out.parent / f"work_{capture.session_id[:8]}"
    result = run_process_pipeline(capture, calibration, work_dir, cfg)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2)
    click.echo(f"karat={result.karat:.2f} confidence={result.confidence:.3f} -> {out}")


@main.command("calibrate")
@click.option("--device", required=True)
@click.option("--out", type=click.Path(path_type=Path), required=True)
def calibrate(device: str, out: Path) -> None:
    """Write default calibration bundle for device."""
    bundle = CalibrationBundle.default(device)
    save_calibration(bundle, out)
    click.echo(f"calibration written to {out}")


@main.command("synthetic-demo")
@click.option("--karat", default=18.0)
@click.option("--out", type=click.Path(path_type=Path), default=Path("out/demo_result.json"))
def synthetic_demo(karat: float, out: Path) -> None:
    """End-to-end demo with synthetic 18K-like capture."""
    cal_path = out.parent / "demo_cal.json"
    if not cal_path.exists():
        save_calibration(CalibrationBundle.default("demo"), cal_path)
    ctx = click.get_current_context()
    ctx.invoke(
        process,
        session=out.parent,
        cal=cal_path,
        out=out,
        config=None,
        synthetic_karat=karat,
    )


if __name__ == "__main__":
    main()
