"""
IoT simulator for Smart City demo.

- Simulates 3 sensors (centre, industrie, nord)
- Every INTERVAL seconds, pushes a measurement to the backend /api/iot/ingest
- Designed to run as a Render "worker" service.

Env:
  API_BASE        e.g. https://<your-backend>.onrender.com
  INTERVAL        seconds, default 900 (15 minutes)
"""
from __future__ import annotations

import os
import time
import json
import math
from datetime import datetime
from typing import Dict, Any, List

import requests


API_BASE = os.getenv("API_BASE", "http://localhost:5000").rstrip("/")
INTERVAL = int(os.getenv("INTERVAL", "900"))

ZONES = ["centre", "industrie", "nord"]


def _clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def _tick(zone: str, t: int) -> Dict[str, Any]:
    zf = 1.0
    if zone == "industrie":
        zf = 1.18
    elif zone == "nord":
        zf = 0.85

    # simple deterministic pseudo-signal
    pm25 = int(_clamp(round((30 + 12 * math.sin(t / 18) + 4 * math.cos(t / 9)) * zf), 5, 120))
    pm10 = int(_clamp(round((55 + 18 * math.sin(t / 22) + 5 * math.cos(t / 11)) * zf), 5, 160))
    no2 = int(_clamp(round((48 + 22 * math.sin(t / 20) + 6 * math.cos(t / 13)) * zf), 5, 240))
    o3 = int(_clamp(round((40 + 15 * math.sin(t / 26) + 4 * math.cos(t / 15)) * zf), 5, 200))

    aqi = int(_clamp(round(pm25 * 1.7), 10, 180))

    alerts: List[Dict[str, Any]] = []
    if pm25 > 50:
        alerts.append({
            "id": f"iot-pm25-{zone}-{t}",
            "title": "Alerte PM2.5",
            "message": f"Niveau PM2.5 élevé : {pm25} µg/m³ (seuil : 50 µg/m³).",
            "zone": zone,
            "time": datetime.now().strftime("%H:%M:%S"),
            "pollutant": "PM25",
            "value": pm25,
            "unit": "µg/m³",
            "threshold": 50,
            "critical": True,
            "read": False,
        })
    if pm10 > 80:
        alerts.append({
            "id": f"iot-pm10-{zone}-{t}",
            "title": "Alerte PM10",
            "message": f"Niveau PM10 élevé : {pm10} µg/m³ (seuil : 80 µg/m³).",
            "zone": zone,
            "time": datetime.now().strftime("%H:%M:%S"),
            "pollutant": "PM10",
            "value": pm10,
            "unit": "µg/m³",
            "threshold": 80,
            "critical": True,
            "read": False,
        })

    return {
        "zone": zone,
        "kpis": {
            "pm25": pm25,
            "pm10": pm10,
            "no2": no2,
            "o3": o3,
            "aqi": aqi,
            "temperature": int(_clamp(round(14 + 10 * math.sin(t / 30)), -5, 45)),
            "wind": int(_clamp(round(6 + 8 * math.cos(t / 25)), 0, 60)),
            "humidity": int(_clamp(round(50 + 20 * math.sin(t / 28)), 10, 95)),
            "sensors": {"active": 3, "total": 3},
        },
        "alerts": alerts,
    }


def main() -> None:
    print(f"[iot] starting — API_BASE={API_BASE} INTERVAL={INTERVAL}s")
    tick = 0
    while True:
        for zone in ZONES:
            payload = _tick(zone, tick)
            try:
                r = requests.post(f"{API_BASE}/api/iot/ingest", json=payload, timeout=15)
                print(f"[iot] pushed zone={zone} status={r.status_code}")
            except Exception as e:
                print(f"[iot] push failed zone={zone}: {e}")
        tick += 1
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
