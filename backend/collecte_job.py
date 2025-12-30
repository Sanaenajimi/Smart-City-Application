"""
Collector job for Smart City demo.

Runs once, fetches (if keys provided) and ingests into backend store.

Env:
  API_BASE
  AQICN_TOKEN        optional
  OPENWEATHER_KEY    optional
  CITY               optional (default Marseille)
"""
from __future__ import annotations

import os
import math
from datetime import datetime
from typing import Any, Dict, Optional

import requests


API_BASE = os.getenv("API_BASE", "http://localhost:5000").rstrip("/")
AQICN_TOKEN = os.getenv("AQICN_TOKEN", "")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY", "")
CITY = os.getenv("CITY", "Marseille")


def _safe_get(url: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        r = requests.get(url, params=params, timeout=20)
        if r.status_code >= 400:
            return None
        return r.json()
    except Exception:
        return None


def _simulate() -> Dict[str, Any]:
    # fallback if no API keys
    t = int(datetime.now().strftime("%Y%m%d%H%M"))
    pm25 = int(30 + (t % 10) * 2)
    pm10 = int(55 + (t % 7) * 3)
    no2 = int(45 + (t % 9) * 4)
    o3 = int(38 + (t % 6) * 3)
    aqi = int(min(180, max(10, round(pm25 * 1.7))))
    return {
        "zone": "centre",
        "kpis": {"pm25": pm25, "pm10": pm10, "no2": no2, "o3": o3, "aqi": aqi, "sensors": {"active": 3, "total": 3}},
        "alerts": [],
        "source": "simulated",
    }


def _fetch_openweather() -> Dict[str, Any]:
    if not OPENWEATHER_KEY:
        return {}
    data = _safe_get("https://api.openweathermap.org/data/2.5/weather", {"q": CITY, "appid": OPENWEATHER_KEY, "units": "metric"})
    if not data:
        return {}
    main = data.get("main", {})
    wind = data.get("wind", {})
    return {
        "temperature": int(round(main.get("temp"))) if "temp" in main else None,
        "humidity": int(round(main.get("humidity"))) if "humidity" in main else None,
        "wind": int(round(wind.get("speed", 0) * 3.6)),  # m/s -> km/h
    }


def _fetch_aqicn() -> Dict[str, Any]:
    if not AQICN_TOKEN:
        return {}
    data = _safe_get(f"https://api.waqi.info/feed/{CITY}/", {"token": AQICN_TOKEN})
    if not data or data.get("status") != "ok":
        return {}
    iaqi = (data.get("data") or {}).get("iaqi") or {}
    # AQICN fields are often in ug/m3 for pm25/pm10/no2
    def val(key: str) -> Optional[int]:
        v = iaqi.get(key, {}).get("v")
        try:
            return int(round(float(v)))
        except Exception:
            return None
    return {
        "pm25": val("pm25"),
        "pm10": val("pm10"),
        "no2": val("no2"),
        "o3": val("o3"),
        "aqi": int((data.get("data") or {}).get("aqi") or 0) or None,
    }


def run_once() -> None:
    base = _simulate()
    ow = _fetch_openweather()
    aq = _fetch_aqicn()

    kpis = dict(base["kpis"])
    # merge pollutants
    for k in ("pm25", "pm10", "no2", "o3", "aqi"):
        if aq.get(k) is not None:
            kpis[k] = aq[k]
    # merge weather
    for k in ("temperature", "humidity", "wind"):
        if ow.get(k) is not None:
            kpis[k] = ow[k]

    payload = {"zone": "centre", "kpis": kpis, "alerts": []}

    print(f"[collecte] ingest -> {API_BASE}/api/iot/ingest (CITY={CITY})")
    r = requests.post(f"{API_BASE}/api/iot/ingest", json=payload, timeout=20)
    print(f"[collecte] status={r.status_code} body={r.text[:200]}")


if __name__ == "__main__":
    run_once()
