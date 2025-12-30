# backend/routes/dashboard.py
from __future__ import annotations

from flask import Blueprint, jsonify, request
from datetime import datetime, timezone, timedelta
import math
import os
import random

# Importer les fonctions de base de données
try:
    from init_db import get_db_connection
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    print("⚠️ init_db non disponible, utilisation de données simulées")


dashboard_bp = Blueprint("dashboard", __name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_string(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _mulberry32(seed: int):
    def rand() -> float:
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = seed
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF) & 0xFFFFFFFF
        t ^= t >> 14
        return (t & 0xFFFFFFFF) / 4294967296
    return rand


def _clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def _aqi_label(aqi: int):
    if aqi <= 50:
        return {"label": "Bon", "tone": "ok"}
    if aqi <= 100:
        return {"label": "Modéré", "tone": "warn"}
    if aqi <= 150:
        return {"label": "Mauvais", "tone": "danger"}
    return {"label": "Très mauvais", "tone": "danger"}


def _get_real_data_from_db():
    """Récupère les vraies données de la base de données"""
    db_path = os.getenv("DATABASE_PATH", "/tmp/smartcity.db")
    
    try:
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        
        # Récupérer les dernières données de qualité de l'air
        cursor.execute('''
            SELECT * FROM air_quality 
            ORDER BY timestamp DESC 
            LIMIT 1
        ''')
        latest = cursor.fetchone()
        
        if latest:
            return dict(latest)
        
        conn.close()
    except Exception as e:
        print(f"⚠️ Erreur lecture DB: {e}")
    
    return None


def _get_real_alerts_from_db():
    """Récupère les vraies alertes de la base de données"""
    db_path = os.getenv("DATABASE_PATH", "/tmp/smartcity.db")
    
    try:
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        
        # Récupérer les alertes récentes (dernières 24h)
        cursor.execute('''
            SELECT * FROM alerts 
            WHERE timestamp > datetime('now', '-1 day')
            ORDER BY timestamp DESC 
            LIMIT 10
        ''')
        alerts_rows = cursor.fetchall()
        
        alerts = []
        for row in alerts_rows:
            alert = dict(row)
            # Formater pour le frontend
            alerts.append({
                "id": f"alert_{alert['id']}",
                "title": alert['title'],
                "message": alert['message'],
                "zone": alert['zone'],
                "time": alert['timestamp'].split(' ')[1] if ' ' in alert['timestamp'] else alert['timestamp'],
                "people": alert.get('people_affected', 0),
                "pollutant": alert['pollutant'],
                "value": alert['value'],
                "unit": alert.get('unit', 'µg/m³'),
                "threshold": alert['threshold'],
                "critical": bool(alert['critical']),
                "read": bool(alert.get('read', False))
            })
        
        conn.close()
        return alerts
    except Exception as e:
        print(f"⚠️ Erreur lecture alertes DB: {e}")
    
    return []


def _demo_weather(seed: int):
    r = _mulberry32(seed)
    return {
        "temperature": round(14 + r() * 14),
        "wind": round(5 + r() * 18),
        "humidity": round(45 + r() * 35),
    }


def _demo_alerts():
    """Alertes de secours si DB vide"""
    seed = _hash_string("alerts|" + datetime.now().strftime("%Y-%m-%d %H:%M"))
    r = _mulberry32(seed)

    pm10 = round(72 + r() * 20)
    pm25 = round(45 + r() * 12)

    def _time():
        return datetime.now().strftime("%H:%M:%S")

    alerts = [
        {
            "id": "demo1",
            "title": "Alerte PM10 – Données de démonstration",
            "message": f"Niveau PM10: {pm10}µg/m³ (données simulées)",
            "zone": "Zone de démonstration",
            "time": _time(),
            "people": 15000,
            "pollutant": "PM10",
            "value": pm10,
            "unit": "µg/m³",
            "threshold": 80,
            "critical": pm10 >= 80,
            "read": False,
        }
    ]
    return alerts


@dashboard_bp.get("/api/snapshot")
def snapshot():
    """
    Snapshot avec VRAIES données de la DB si disponibles,
    sinon données simulées
    """
    
    # Essayer de récupérer les vraies données
    real_data = None
    if DB_AVAILABLE:
        real_data = _get_real_data_from_db()
    
    # Récupérer les vraies alertes
    alerts = []
    if DB_AVAILABLE:
        alerts = _get_real_alerts_from_db()
    
    # Si pas d'alertes réelles, utiliser les démo
    if not alerts:
        alerts = _demo_alerts()
    
    # Calculer les KPIs à partir des vraies données ou simuler
    if real_data:
        # VRAIES DONNÉES de la DB !
        aqi = real_data.get('aqi') or 50
        temperature = real_data.get('temperature') or 20
        humidity = real_data.get('humidity') or 60
        wind = real_data.get('wind_speed') or 10
        
        kpis = {
            "aqi": int(aqi),
            "temperature": int(temperature) if temperature else 20,
            "wind": int(wind) if wind else 10,
            "humidity": int(humidity) if humidity else 60,
            "sensors": {"active": 3, "total": 3},
        }
        
        print(f"✅ Snapshot avec VRAIES données - AQI: {aqi}, Source: {real_data.get('source')}")
    else:
        # Données simulées
        minute_seed = _hash_string("snapshot|" + datetime.now().strftime("%Y-%m-%d %H:%M"))
        weather = _demo_weather(minute_seed)
        
        pm25 = next((a["value"] for a in alerts if a.get("pollutant") == "PM25"), 40)
        aqi = int(_clamp(pm25 * 1.6, 10, 180))
        
        kpis = {
            "aqi": aqi,
            "temperature": weather["temperature"],
            "wind": weather["wind"],
            "humidity": weather["humidity"],
            "sensors": {"active": 3, "total": 3},
        }
        
        print(f"⚠️ Snapshot avec données SIMULÉES - AQI: {aqi}")

    return jsonify({
        "updatedAt": datetime.now().strftime("%H:%M:%S"),
        "kpis": kpis,
        "alerts": alerts,
        "iot": {
            "last_update": real_data.get('timestamp') if real_data else None,
            "sensors": [],
            "source": real_data.get('source') if real_data else "DEMO"
        },
    })


def _build_time_axis(period: str):
    """Génère l'axe temporel pour les graphiques"""
    now = datetime.now()
    out = []
    if period == "1h":
        for i in range(11, -1, -1):
            t = now.timestamp() - i * 5 * 60
            out.append(datetime.fromtimestamp(t).strftime("%H:%M"))
        return out
    if period == "6h":
        for i in range(23, -1, -1):
            t = now.timestamp() - i * 15 * 60
            out.append(datetime.fromtimestamp(t).strftime("%H:%M"))
        return out
    if period == "7d":
        for i in range(6, -1, -1):
            t = now.timestamp() - i * 24 * 3600
            out.append(datetime.fromtimestamp(t).strftime("%a"))
        return out

    # default 24h
    for i in range(47, -1, -1):
        t = now.timestamp() - i * 30 * 60
        out.append(datetime.fromtimestamp(t).strftime("%H:%M"))
    return out


def _get_historical_data_from_db(period: str, pollutant: str):
    """Récupère les données historiques depuis la DB"""
    db_path = os.getenv("DATABASE_PATH", "/tmp/smartcity.db")
    
    try:
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        
        # Calculer la période
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168}
        hours = hours_map.get(period, 24)
        
        # Requête pour obtenir les données
        cursor.execute(f'''
            SELECT timestamp, aqi, pm25, pm10, no2, o3
            FROM air_quality
            WHERE timestamp > datetime('now', '-{hours} hours')
            ORDER BY timestamp ASC
        ''', ())
        
        rows = cursor.fetchall()
        conn.close()
        
        if rows:
            series = []
            for row in rows:
                data = dict(row)
                # Extraire la valeur du polluant demandé
                value_map = {
                    "PM25": data.get('pm25'),
                    "PM10": data.get('pm10'),
                    "NO2": data.get('no2'),
                    "O3": data.get('o3'),
                }
                value = value_map.get(pollutant, data.get('aqi'))
                
                if value:
                    series.append({
                        "t": data['timestamp'].split(' ')[1][:5] if ' ' in data['timestamp'] else data['timestamp'],
                        "value": int(value)
                    })
            
            if series:
                print(f"✅ {len(series)} points de données RÉELLES récupérés pour {pollutant}")
                return series
        
    except Exception as e:
        print(f"⚠️ Erreur lecture historique DB: {e}")
    
    return None


@dashboard_bp.get("/api/dashboard")
def dashboard():
    """Dashboard principal avec VRAIES données si disponibles"""
    period = request.args.get("period", "24h")
    zone = request.args.get("zone", "all")
    pollutant = request.args.get("pollutant", "PM25")
    
    # Essayer de récupérer les vraies données historiques
    real_series = None
    if DB_AVAILABLE:
        real_series = _get_historical_data_from_db(period, pollutant)
    
    # Si on a des vraies données, les utiliser
    if real_series and len(real_series) > 0:
        series = real_series
        print(f"✅ Dashboard avec {len(series)} points RÉELS")
    else:
        # Sinon, générer des données simulées (fallback)
        print(f"⚠️ Dashboard avec données SIMULÉES")
        seed = _hash_string(f"{period}|{zone}|{pollutant}|{datetime.now().strftime('%Y-%m-%d %H:%M')}")
        r = _mulberry32(seed)
        
        axis = _build_time_axis(period)
        base = {"PM25": 38, "PM10": 58, "NO2": 50, "O3": 42}.get(pollutant, 35)
        
        series = []
        for idx, t in enumerate(axis):
            wave = math.sin(idx / 2.2) * 6 + math.cos(idx / 5.5) * 3
            noise = (r() - 0.5) * 5
            v = int(_clamp(round(base + wave + noise), 5, 140))
            series.append({"t": t, "value": v})
    
    # Multi-series (simulé pour le moment)
    axis = _build_time_axis(period)
    seed = _hash_string(f"{period}|{zone}|{datetime.now().strftime('%Y-%m-%d %H:%M')}")
    r = _mulberry32(seed)
    
    def make(p: str, amp: float, idx: int) -> int:
        b = {"PM25": 38, "PM10": 58, "NO2": 50, "O3": 42}.get(p, 35)
        wave = math.sin(idx / (2.3 + amp)) * (5 + amp) + math.cos(idx / (6.5 - amp / 5)) * 2
        noise = (r() - 0.5) * (3 + amp / 3)
        return int(_clamp(round(b + wave + noise), 4, 160))

    multi = []
    for idx, t in enumerate(axis):
        multi.append({
            "t": t,
            "PM25": make("PM25", 2, idx),
            "PM10": make("PM10", 3, idx),
            "NO2": make("NO2", 2.5, idx),
            "O3": make("O3", 2, idx),
        })

    barZones = [
        {"name": "Centre-ville", "aqi": int(70 + r() * 20)},
        {"name": "Zone Industrielle", "aqi": int(95 + r() * 25)},
        {"name": "Résidentiel Nord", "aqi": int(55 + r() * 18)},
    ]

    weights = [
        {"name": "PM25", "w": 0.15 + r() * 0.2},
        {"name": "PM10", "w": 0.2 + r() * 0.25},
        {"name": "NO2", "w": 0.15 + r() * 0.25},
        {"name": "O3", "w": 0.15 + r() * 0.25},
    ]
    s = sum(x["w"] for x in weights)
    pie = [{"name": x["name"], "value": int(round((x["w"] / s) * 100))} for x in weights]
    drift = 100 - sum(x["value"] for x in pie)
    pie[0]["value"] += drift

    last = series[-1]["value"] if series else 50
    prev = int(_clamp(last + round((r() - 0.5) * 10), 5, 160))
    delta_pct = 0.0 if prev == 0 else round(((last - prev) / prev) * 1000) / 10
    delta_str = f"{'+' if delta_pct >= 0 else ''}{delta_pct}% vs précédent"

    aqi_global = int(_clamp(last * 1.7, 10, 180))
    aqi_prev = int(_clamp(prev * 1.7, 10, 180))
    aqi_delta_pct = 0.0 if aqi_prev == 0 else round(((aqi_global - aqi_prev) / aqi_prev) * 1000) / 10
    aqi_delta_str = f"{'+' if aqi_delta_pct >= 0 else ''}{aqi_delta_pct}% vs précédent"

    kpis = {
        "PM25": {"title": "PM2.5 Moyen", "value": last, "unit": "µg/m³", "delta": delta_str},
        "PM10": {"title": "PM10 Moyen", "value": int(last * 1.5), "unit": "µg/m³", "delta": delta_str},
        "NO2": {"title": "NO2 Moyen", "value": int(last * 1.3), "unit": "µg/m³", "delta": delta_str},
        "AQI": {"title": "AQI Global", "value": aqi_global, "unit": "", "delta": aqi_delta_str, "tone": _aqi_label(aqi_global)["tone"]},
    }

    return jsonify({
        "period": period,
        "zone": zone,
        "pollutant": pollutant,
        "series": series,
        "multi": multi,
        "barZones": barZones,
        "pie": pie,
        "kpis": kpis,
        "updatedAt": _now_iso(),
    })


@dashboard_bp.get("/api/dashboard/overview")
def dashboard_overview():
    """Alias pour /api/dashboard"""
    return dashboard()