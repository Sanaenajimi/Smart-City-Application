import os
import requests

def fetch_weather(lat: float, lon: float) -> dict:
    key = os.getenv("OPENWEATHER_KEY", "")
    if not key:
        # fallback demo
        return {"temp": 18, "humidity": 52, "wind": 7}

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": key, "units": "metric"}
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    d = r.json()

    return {
        "temp": round(d["main"]["temp"]),
        "humidity": int(d["main"]["humidity"]),
        "wind": round(d["wind"]["speed"] * 3.6),  # m/s -> km/h
    }
