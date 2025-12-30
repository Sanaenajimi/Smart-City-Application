# backend/init_db.py
import sqlite3
import os
from datetime import datetime

def init_database(db_path="/tmp/smartcity.db"):
    """
    Initialise la base de données SQLite avec toutes les tables nécessaires.
    Cette fonction crée les tables si elles n'existent pas déjà.
    """
    print(f"📦 Initialisation de la base de données: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Table 1: air_quality - Données de qualité de l'air collectées
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS air_quality (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            city TEXT NOT NULL,
            aqi INTEGER,
            pm25 REAL,
            pm10 REAL,
            no2 REAL,
            o3 REAL,
            so2 REAL,
            co REAL,
            temperature REAL,
            humidity REAL,
            wind_speed REAL,
            source TEXT,
            raw_data TEXT
        )
    ''')
    
    # Index pour optimiser les requêtes par date
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_air_quality_timestamp 
        ON air_quality(timestamp DESC)
    ''')
    
    # Table 2: alerts - Alertes de pollution
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            title TEXT NOT NULL,
            message TEXT,
            zone TEXT,
            pollutant TEXT,
            value REAL,
            unit TEXT DEFAULT 'µg/m³',
            threshold REAL,
            critical BOOLEAN DEFAULT 0,
            read BOOLEAN DEFAULT 0,
            people_affected INTEGER
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_alerts_timestamp 
        ON alerts(timestamp DESC)
    ''')
    
    # Table 3: sensors - Configuration des capteurs IoT
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id TEXT UNIQUE NOT NULL,
            name TEXT,
            zone TEXT,
            latitude REAL,
            longitude REAL,
            status TEXT DEFAULT 'active',
            last_update DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table 4: iot_data - Données brutes des capteurs IoT
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS iot_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            sensor_id TEXT NOT NULL,
            pm25 REAL,
            pm10 REAL,
            temperature REAL,
            humidity REAL,
            battery_level INTEGER,
            FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_iot_data_timestamp 
        ON iot_data(timestamp DESC)
    ''')
    
    # Table 5: predictions - Prédictions IA
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            prediction_date DATE NOT NULL,
            hour INTEGER,
            zone TEXT,
            pollutant TEXT,
            predicted_value REAL,
            confidence REAL,
            model_version TEXT
        )
    ''')
    
    # Table 6: collecte_logs - Logs de collecte
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS collecte_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            source TEXT,
            status TEXT,
            records_collected INTEGER,
            error_message TEXT
        )
    ''')
    
    conn.commit()
    
    # Vérifier que toutes les tables sont créées
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print(f"✅ Base de données initialisée avec {len(tables)} tables:")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"   - {table[0]}: {count} enregistrements")
    
    conn.close()
    return db_path


def get_db_connection(db_path="/tmp/smartcity.db"):
    """Retourne une connexion à la base de données"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Pour avoir des résultats en dict
    return conn


def insert_air_quality_data(data, db_path="/tmp/smartcity.db"):
    """
    Insère des données de qualité de l'air dans la DB
    
    Args:
        data: dict avec les clés city, aqi, pm25, pm10, etc.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO air_quality 
        (city, aqi, pm25, pm10, no2, o3, so2, co, temperature, humidity, wind_speed, source, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('city'),
        data.get('aqi'),
        data.get('pm25'),
        data.get('pm10'),
        data.get('no2'),
        data.get('o3'),
        data.get('so2'),
        data.get('co'),
        data.get('temperature'),
        data.get('humidity'),
        data.get('wind_speed'),
        data.get('source'),
        data.get('raw_data', '')
    ))
    
    conn.commit()
    conn.close()


def insert_alert(alert_data, db_path="/tmp/smartcity.db"):
    """Insère une alerte dans la DB"""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO alerts 
        (title, message, zone, pollutant, value, unit, threshold, critical, people_affected)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        alert_data.get('title'),
        alert_data.get('message'),
        alert_data.get('zone'),
        alert_data.get('pollutant'),
        alert_data.get('value'),
        alert_data.get('unit', 'µg/m³'),
        alert_data.get('threshold'),
        alert_data.get('critical', False),
        alert_data.get('people_affected', 0)
    ))
    
    conn.commit()
    conn.close()


def get_latest_air_quality(limit=10, db_path="/tmp/smartcity.db"):
    """Récupère les dernières données de qualité de l'air"""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM air_quality 
        ORDER BY timestamp DESC 
        LIMIT ?
    ''', (limit,))
    
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return results


def log_collecte(source, status, records=0, error=None, db_path="/tmp/smartcity.db"):
    """Enregistre un log de collecte"""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO collecte_logs (source, status, records_collected, error_message)
        VALUES (?, ?, ?, ?)
    ''', (source, status, records, error))
    
    conn.commit()
    conn.close()


# Initialiser la DB au démarrage du module
if __name__ == "__main__":
    init_database()
    print("\n🧪 Test d'insertion de données...")
    
    # Test
    test_data = {
        'city': 'Paris',
        'aqi': 45,
        'pm25': 22.5,
        'pm10': 38.2,
        'no2': 42.1,
        'o3': 35.8,
        'source': 'TEST'
    }
    
    insert_air_quality_data(test_data)
    print("✅ Données de test insérées")
    
    latest = get_latest_air_quality(limit=5)
    print(f"📊 {len(latest)} enregistrements trouvés")