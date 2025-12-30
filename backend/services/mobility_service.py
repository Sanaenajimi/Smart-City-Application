import math
import time

def mobility_index(zone_id: str) -> dict:
    # Simu stable + “rythme jour/nuit”
    t = time.time()
    base = 55 if zone_id == "centre" else 45 if zone_id == "nord" else 65
    wave = 15 * (math.sin(t / 1800) + 1) / 2  # 0..15
    traffic = round(min(100, base + wave))
    pt_load = round(min(100, 40 + wave))
    incidents = 1 if traffic > 75 else 0

    return {
        "trafficIndex": traffic,
        "publicTransportLoad": pt_load,
        "incidentsCount": incidents,
    }
