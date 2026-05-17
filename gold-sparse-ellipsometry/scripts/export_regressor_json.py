#!/usr/bin/env python3
"""Export sklearn Ridge weights to web/lib/regressor.json for Vercel TS runtime."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from gse.gold.regressor import FEATURE_ORDER, train_default_regressor  # noqa: E402

def main() -> None:
    reg = train_default_regressor()
    model = reg._model
    scaler = reg._scaler
    out = {
        "version": reg.version,
        "feature_order": FEATURE_ORDER,
        "coef": model.coef_.tolist(),
        "intercept": float(model.intercept_),
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
    }
    path = ROOT / "web" / "lib" / "regressor.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
