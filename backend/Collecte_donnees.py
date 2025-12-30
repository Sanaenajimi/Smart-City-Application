# backend/Collecte_donnees.py
"""
Script de collecte de données de qualité de l'air.
Collecte depuis AQICN et OpenWeather, puis sauvegarde dans SQLite.
"""

import os
import requests
from datetime import datetime
import json

# Importer les fonctions de base de données
from init_db import (
    insert_air_quality_data, 
    insert_alert, 
    log_collecte,
    get_db_connection
)


def main():
    """
    Fonction principale de collecte.
    Appelée automatiquement par app.py toutes les X minutes.
    """
    db_path = os.getenv("DATABASE_PATH", "/tmp/smartcity.db")
    
    # Récupérer les clés API
    AQICN_TOKEN = os.getenv("AQICN_TOKEN", "")
    OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY", "")
    CITY = os.getenv("CITY", "Paris")
    
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🌍 COLLECTE - {CITY}")
    print(f"{'='*60}\n")
    
    total_collected = 0
    errors = []
    
    # ========================================
    # 1. COLLECTE AQICN
    # ========================================
    if AQICN_TOKEN:
        try:
            print("📡 Collecte AQICN...")
            url = f"https://api.waqi.info/feed/{CITY}/?token={AQICN_TOKEN}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "ok":
                    aqi_data = data.get("data", {})
                    iaqi = aqi_data.get("iaqi", {})
                    
                    # Préparer les données pour insertion
                    air_quality_data = {
                        'city': CITY,
                        'aqi': aqi_data.get("aqi"),
                        'pm25': iaqi.get("pm25", {}).get("v"),
                        'pm10': iaqi.get("pm10", {}).get("v"),
                        'no2': iaqi.get("no2", {}).get("v"),
                        'o3': iaqi.get("o3", {}).get("v"),
                        'so2': iaqi.get("so2", {}).get("v"),
                        'co': iaqi.get("co", {}).get("v"),
                        'temperature': iaqi.get("t", {}).get("v"),
                        'humidity': iaqi.get("h", {}).get("v"),
                        'wind_speed': iaqi.get("w", {}).get("v"),
                        'source': 'AQICN',
                        'raw_data': json.dumps(aqi_data)
                    }
                    
                    # Insérer dans la base de données
                    insert_air_quality_data(air_quality_data, db_path)
                    total_collected += 1
                    
                    print(f"   ✅ AQI: {air_quality_data['aqi']} | PM2.5: {air_quality_data['pm25']} µg/m³")
                    
                    # Créer une alerte si AQI > 100
                    if air_quality_data['aqi'] and air_quality_data['aqi'] > 100:
                        alert_data = {
                            'title': f"Alerte Qualité de l'Air - {CITY}",
                            'message': f"AQI élevé: {air_quality_data['aqi']} (seuil: 100)",
                            'zone': CITY,
                            'pollutant': 'AQI',
                            'value': air_quality_data['aqi'],
                            'threshold': 100,
                            'critical': air_quality_data['aqi'] > 150,
                            'people_affected': 50000
                        }
                        insert_alert(alert_data, db_path)
                        print(f"   🚨 Alerte créée: AQI {air_quality_data['aqi']}")
                    
                    # Logger le succès
                    log_collecte('AQICN', 'SUCCESS', 1, None, db_path)
                    
                else:
                    error_msg = f"AQICN status: {data.get('data')}"
                    print(f"   ⚠️ {error_msg}")
                    errors.append(error_msg)
                    log_collecte('AQICN', 'ERROR', 0, error_msg, db_path)
            else:
                error_msg = f"AQICN HTTP {response.status_code}"
                print(f"   ❌ {error_msg}")
                errors.append(error_msg)
                log_collecte('AQICN', 'ERROR', 0, error_msg, db_path)
                
        except Exception as e:
            error_msg = f"Erreur AQICN: {str(e)}"
            print(f"   ❌ {error_msg}")
            errors.append(error_msg)
            log_collecte('AQICN', 'ERROR', 0, error_msg, db_path)
    else:
        print("   ⚠️ AQICN_TOKEN non configuré - ignoré")
    
    # ========================================
    # 2. COLLECTE OPENWEATHER
    # ========================================
    if OPENWEATHER_KEY:
        try:
            print("\n📡 Collecte OpenWeather...")
            
            # Étape 1: Géocodage
            geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={CITY}&limit=1&appid={OPENWEATHER_KEY}"
            geo_response = requests.get(geo_url, timeout=10)
            
            if geo_response.status_code == 200 and geo_response.json():
                coords = geo_response.json()[0]
                lat, lon = coords["lat"], coords["lon"]
                
                # Étape 2: Air Pollution API
                air_url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}"
                air_response = requests.get(air_url, timeout=10)
                
                if air_response.status_code == 200:
                    air_data = air_response.json()
                    components = air_data["list"][0]["components"]
                    aqi_ow = air_data["list"][0]["main"]["aqi"]
                    
                    # Étape 3: Weather API pour température/humidité
                    weather_url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}&units=metric"
                    weather_response = requests.get(weather_url, timeout=10)
                    
                    weather_data = {}
                    if weather_response.status_code == 200:
                        w = weather_response.json()
                        weather_data = {
                            'temperature': w["main"]["temp"],
                            'humidity': w["main"]["humidity"],
                            'wind_speed': w["wind"]["speed"]
                        }
                    
                    # Préparer les données
                    air_quality_data = {
                        'city': CITY,
                        'aqi': aqi_ow * 50,  # Convertir échelle OpenWeather (1-5) en AQI approximatif
                        'pm25': components.get("pm2_5"),
                        'pm10': components.get("pm10"),
                        'no2': components.get("no2"),
                        'o3': components.get("o3"),
                        'so2': components.get("so2"),
                        'co': components.get("co"),
                        'temperature': weather_data.get('temperature'),
                        'humidity': weather_data.get('humidity'),
                        'wind_speed': weather_data.get('wind_speed'),
                        'source': 'OpenWeather',
                        'raw_data': json.dumps(air_data)
                    }
                    
                    # Insérer dans la base
                    insert_air_quality_data(air_quality_data, db_path)
                    total_collected += 1
                    
                    print(f"   ✅ AQI: {aqi_ow} ({air_quality_data['aqi']}) | PM2.5: {air_quality_data['pm25']} µg/m³")
                    print(f"   🌡️ Temp: {weather_data.get('temperature')}°C | Humidité: {weather_data.get('humidity')}%")
                    
                    log_collecte('OpenWeather', 'SUCCESS', 1, None, db_path)
                else:
                    error_msg = f"OpenWeather Air HTTP {air_response.status_code}"
                    print(f"   ❌ {error_msg}")
                    errors.append(error_msg)
                    log_collecte('OpenWeather', 'ERROR', 0, error_msg, db_path)
            else:
                error_msg = "OpenWeather Geocoding échoué"
                print(f"   ❌ {error_msg}")
                errors.append(error_msg)
                log_collecte('OpenWeather', 'ERROR', 0, error_msg, db_path)
                
        except Exception as e:
            error_msg = f"Erreur OpenWeather: {str(e)}"
            print(f"   ❌ {error_msg}")
            errors.append(error_msg)
            log_collecte('OpenWeather', 'ERROR', 0, error_msg, db_path)
    else:
        print("   ⚠️ OPENWEATHER_KEY non configuré - ignoré")
    
    # ========================================
    # 3. RÉSUMÉ
    # ========================================
    print(f"\n{'='*60}")
    print(f"📊 RÉSUMÉ DE LA COLLECTE")
    print(f"{'='*60}")
    print(f"   ✅ Enregistrements collectés: {total_collected}")
    print(f"   ❌ Erreurs: {len(errors)}")
    
    if errors:
        print(f"\n   Détails des erreurs:")
        for error in errors:
            print(f"      - {error}")
    
    # Afficher les dernières données en DB
    try:
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM air_quality")
        total_records = cursor.fetchone()[0]
        conn.close()
        print(f"   💾 Total en base: {total_records} enregistrements")
    except Exception as e:
        print(f"   ⚠️ Impossible de compter les enregistrements: {e}")
    
    print(f"{'='*60}\n")
    
    return {
        'collected': total_collected,
        'errors': len(errors),
        'timestamp': datetime.now().isoformat()
    }


# Si le script est exécuté directement
if __name__ == "__main__":
    result = main()
    print(f"\n✨ Collecte terminée: {result}")