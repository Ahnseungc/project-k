"""FastAPI — SPEC §6 REST surface."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from gse.acq.synthetic import generate_synthetic_session
from gse.cal.io import save_calibration
from gse.models.types import CalibrationBundle
from gse.pipeline.factory import run_process_pipeline

app = FastAPI(title="Gold Sparse Ellipsometry", version="0.1.0")

_JOBS: dict[str, dict[str, Any]] = {}
_SESSIONS: dict[str, Any] = {}
_DATA_ROOT = Path("/tmp/gse-data")
_DATA_ROOT.mkdir(exist_ok=True)


class CreateSessionBody(BaseModel):
    device_id: str
    sample: dict[str, Any]


class ProcessBody(BaseModel):
    karat_hint: float | None = None


@app.post("/v1/sessions", status_code=201)
def create_session(body: CreateSessionBody) -> dict[str, str]:
    sid = str(uuid.uuid4())
    _SESSIONS[sid] = {"device_id": body.device_id, "sample": body.sample}
    ( _DATA_ROOT / sid).mkdir(exist_ok=True)
    cal_path = _DATA_ROOT / "cal" / f"{body.device_id}.json"
    if not cal_path.exists():
        cal_path.parent.mkdir(parents=True, exist_ok=True)
        save_calibration(CalibrationBundle.default(body.device_id), cal_path)
    return {"session_id": sid}


@app.post("/v1/sessions/{session_id}/process", status_code=202)
def start_process(session_id: str, body: ProcessBody | None = None) -> dict[str, str]:
    if session_id not in _SESSIONS:
        raise HTTPException(404, "session not found")
    job_id = str(uuid.uuid4())
    _JOBS[job_id] = {"status": "running", "session_id": session_id}
    meta = _SESSIONS[session_id]
    karat = (body.karat_hint if body else None) or meta["sample"].get("nominal_karat", 18.0)
    session = generate_synthetic_session(session_id=session_id, karat=float(karat))
    cal = CalibrationBundle.default(meta["device_id"])
    work = _DATA_ROOT / session_id / "work"
    result = run_process_pipeline(session, cal, work)
    out_path = _DATA_ROOT / session_id / "result.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f)
    _JOBS[job_id] = {"status": "done", "session_id": session_id, "result_path": str(out_path)}
    return {"job_id": job_id}


@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    if job_id not in _JOBS:
        raise HTTPException(404, "job not found")
    j = _JOBS[job_id]
    return {"status": j["status"], "progress_pct": 100 if j["status"] == "done" else 50}


@app.get("/v1/sessions/{session_id}/result")
def get_result(session_id: str) -> dict[str, Any]:
    path = _DATA_ROOT / session_id / "result.json"
    if not path.exists():
        raise HTTPException(404, "result not ready")
    with path.open(encoding="utf-8") as f:
        return json.load(f)
