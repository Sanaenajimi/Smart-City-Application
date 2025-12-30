import os
import requests

def fetch_aqi_by_geo(lat: float, lon: float) -> dict:
    token = os.getenv("AQICN_TOKEN", "")
    if not token:
        # fallback demo if no token
        return {"aqi": 77, "iaqi": {"pm25": 36, "pm10": 54, "no2": 51, "o3": 42, "so2": 15}}

    url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={token}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    data = r.json()

    if data.get("status") != "ok":
        # fallback if API returns error
        return {"aqi": 77, "iaqi": {"pm25": 36, "pm10": 54, "no2": 51, "o3": 42, "so2": 15}}

    d = data["data"]
    aqi = int(d.get("aqi", 77) or 77)

    iaqi = d.get("iaqi", {})
    def v(key, default):
        obj = iaqi.get(key, {})
        return int(obj.get("v", default) or default)

    return {
        "aqi": aqi,
        "iaqi": {
            "pm25": v("pm25", 36),
            "pm10": v("pm10", 54),
            "no2": v("no2", 51),
            "o3": v("o3", 42),
            "so2": v("so2", 15),
        },
    }
