"""
Backend-side dashboard analytics generator (demo).

Purpose:
- Provide the same data-shapes as your frontend expects (series, barZones, pie, multi, kpis)
- Keep deterministic outputs for a given filter combination (period|zone|pollutant)
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

ZONES = [
    {"id": "all", "label": "Toutes"},
    {"id": "centre", "label": "Centre-ville"},
    {"id": "industrie", "label": "Zone Industrielle"},
    {"id": "nord", "label": "Résidentiel Nord"},
]

POLLUTANTS = ["PM25", "PM10", "NO2", "O3", "SO2"]


def aqi_label(aqi: int) -> Dict[str, str]:
    if aqi <= 50:
        return {"label": "Bon", "tone": "ok"}
    if aqi <= 100:
        return {"label": "Modéré", "tone": "warn"}
    if aqi <= 150:
        return {"label": "Mauvais", "tone": "danger"}
    return {"label": "Très mauvais", "tone": "danger"}


def _hash(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _rng(seed: int):
    # mulberry32
    def r():
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = (seed ^ (seed >> 15)) * (1 | seed)
        t &= 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t))) ^ t
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return r


def _clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def _build_axis(period: str) -> List[str]:
    now = datetime.now()
    out: List[str] = []
    if period == "1h":
        for i in range(11, -1, -1):
            t = now - timedelta(minutes=i * 5)
            out.append(t.strftime("%H:%M"))
        return out
    if period == "6h":
        for i in range(23, -1, -1):
            t = now - timedelta(minutes=i * 15)
            out.append(t.strftime("%H:%M"))
        return out
    if period == "7d":
        for i in range(6, -1, -1):
            t = now - timedelta(days=i)
            out.append(t.strftime("%a"))
        return out
    # 24h default
    for i in range(47, -1, -1):
        t = now - timedelta(minutes=i * 30)
        out.append(t.strftime("%H:%M"))
    return out


def _pollutant_base(p: str) -> int:
    return {"PM25": 38, "PM10": 58, "NO2": 50, "O3": 42, "SO2": 30}.get(p, 35)


def _zone_factor(z: str) -> float:
    return {"industrie": 1.18, "centre": 1.0, "nord": 0.85}.get(z, 1.0)


def get_dashboard_data(filters: Dict[str, Any]) -> Dict[str, Any]:
    period = filters.get("period") or "24h"
    zone = filters.get("zone") or "all"
    pollutant = filters.get("pollutant") or "PM25"

    seed = _hash(f"{period}|{zone}|{pollutant}")
    r = _rng(seed)

    axis = _build_axis(period)
    z_for_series = "centre" if zone == "all" else zone
    base = _pollutant_base(pollutant) * _zone_factor(z_for_series)

    series = []
    for idx, t in enumerate(axis):
        wave = math.sin(idx / 2.2) * 6 + math.cos(idx / 5.5) * 3
        noise = (r() - 0.5) * 5
        v = int(round(_clamp(base + wave + noise, 5, 140)))
        series.append({"t": t, "value": v})

    def make_multi(p: str, amp: float, idx: int) -> int:
        b = _pollutant_base(p) * _zone_factor(z_for_series)
        wave = math.sin(idx / (2.3 + amp)) * (5 + amp) + math.cos(idx / (6.5 - amp / 5)) * 2
        noise = (r() - 0.5) * (3 + amp / 3)
        return int(round(_clamp(b + wave + noise, 4, 200)))

    multi = []
    for idx, t in enumerate(axis):
        multi.append({
            "t": t,
            "NO2": make_multi("NO2", 2.5, idx),
            "O3": make_multi("O3", 2.0, idx),
            "PM10": make_multi("PM10", 3.0, idx),
            "PM25": make_multi("PM25", 2.0, idx),
        })

    bar_zones = [
        {"name": "Centre-ville", "aqi": int(round(70 + r() * 20))},
        {"name": "Zone Industrielle", "aqi": int(round(95 + r() * 25))},
        {"name": "Résidentiel Nord", "aqi": int(round(55 + r() * 18))},
    ]

    weights = [
        {"name": "PM25", "w": 0.15 + r() * 0.2},
        {"name": "PM10", "w": 0.2 + r() * 0.25},
        {"name": "NO2", "w": 0.15 + r() * 0.25},
        {"name": "O3", "w": 0.15 + r() * 0.25},
    ]
    s = sum(w["w"] for w in weights)
    pie = [{"name": w["name"], "value": int(round((w["w"] / s) * 100))} for w in weights]
    drift = 100 - sum(p["value"] for p in pie)
    pie[0]["value"] += drift

    last = series[-1]["value"] if series else int(round(base))
    prev = int(_clamp(last + round((r() - 0.5) * 10), 5, 200))
    delta_pct = 0.0 if prev == 0 else round(((last - prev) / prev) * 1000) / 10
    delta_str = f"{'+' if delta_pct >= 0 else ''}{delta_pct}% vs précédent"

    aqi_global = int(round(_clamp(last * 1.7, 10, 200)))
    aqi_prev = int(round(_clamp(prev * 1.7, 10, 200)))
    aqi_delta_pct = 0.0 if aqi_prev == 0 else round(((aqi_global - aqi_prev) / aqi_prev) * 1000) / 10
    aqi_delta_str = f"{'+' if aqi_delta_pct >= 0 else ''}{aqi_delta_pct}% vs précédent"

    def kpi(p: str, scale: float, cap: int) -> Dict[str, Any]:
        v = int(round(_clamp(_pollutant_base(p) * _zone_factor(z_for_series) + (r() - 0.5) * scale, 5, cap)))
        return {"title": p, "value": v, "unit": "µg/m³", "delta": delta_str}

    kpis = {
        "PM25": kpi("PM25", 8, 120),
        "PM10": kpi("PM10", 10, 160),
        "NO2": kpi("NO2", 10, 220),
        "AQI": {"title": "AQI", "value": aqi_global, "unit": "", "delta": aqi_delta_str, "tone": aqi_label(aqi_global)["tone"]},
    }

    return {
        "period": period,
        "zone": zone,
        "pollutant": pollutant,
        "series": series,
        "multi": multi,
        "barZones": bar_zones,
        "pie": pie,
        "kpis": kpis,
    }
