"""
MVP "ML" module.

For the Render demo we keep it light, deterministic and dependency-free:
- produces a plausible PM2.5 time series with seasonality + zone factor
- exposes a single helper used by api_backend
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Dict, List


def predict_pm25_series(*, base_pm25: int, hours: int, zone: str = "centre") -> List[Dict[str, int | str]]:
    zf = 1.0
    if zone == "industrie":
        zf = 1.12
    elif zone == "nord":
        zf = 0.92

    base = max(5, int(round(base_pm25 * zf)))

    now = datetime.now()
    out: List[Dict[str, int | str]] = []
    for i in range(0, hours + 1):
        t = now + timedelta(hours=i)
        # smooth wave + small deterministic "noise"
        wave = 6 * math.sin(i / 3.0) + 2 * math.cos(i / 5.5)
        bump = 2 if (i % 4 == 0) else 0
        v = int(round(base + wave + bump))
        v = max(5, v)
        out.append({"h": t.strftime("%H:%M"), "pm25": v})
    return out
