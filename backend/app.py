from flask import Flask, jsonify
from flask_cors import CORS
import os
import threading
import time
import logging

# Configuration du logging EN PREMIER
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========================================
# INITIALISATION DE LA BASE DE DONNÉES EN PREMIER !
# ========================================
logger.info("=" * 60)
logger.info("🚀 DÉMARRAGE DE SMART CITY BACKEND")
logger.info("=" * 60)

db_path = os.getenv("DATABASE_PATH", "/tmp/smartcity.db")
logger.info(f"📦 Chemin de la base de données: {db_path}")

try:
    logger.info("🔄 Import de init_db...")
    from init_db import init_database
    logger.info("✅ Module init_db importé")
    
    logger.info("🔄 Initialisation de la base de données...")
    init_database(db_path)
    logger.info(f"✅ Base de données initialisée: {db_path}")
except Exception as e:
    logger.error(f"❌ Erreur initialisation DB: {e}")
    import traceback
    logger.error(traceback.format_exc())
    # Ne pas crasher, continuer quand même
    logger.warning("⚠️ L'application démarre sans DB, les données seront simulées")

# Maintenant importer les blueprints
logger.info("🔄 Import des blueprints...")
from api_backend import api_bp
from routes.dashboard import dashboard_bp
logger.info("✅ Blueprints importés")

app = Flask(__name__)

# Configuration CORS complète
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False,
        "max_age": 3600
    }
})

app.register_blueprint(api_bp, url_prefix="/api")
app.register_blueprint(dashboard_bp)

@app.route("/ping")
def ping():
    return {"ok": True}

@app.route("/healthz")
def healthz():
    return jsonify({"ok": True})

@app.route("/")
def home():
    return jsonify({"status": "ok", "service": "Smart City Backend"})

@app.route("/db-status")
def db_status():
    """Route pour vérifier l'état de la DB"""
    try:
        from init_db import get_db_connection
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        status = {}
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            status[table] = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            "status": "ok",
            "db_path": db_path,
            "tables": status
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ========================================
# COLLECTE AUTOMATIQUE EN ARRIÈRE-PLAN
# ========================================

def run_collecte():
    """Lance la collecte de données en boucle"""
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    
    # Attendre 30 secondes au démarrage pour laisser le serveur se lancer
    logger.info("⏳ Attente de 30 secondes avant la première collecte...")
    time.sleep(30)
    
    while True:
        try:
            logger.info("🔄 Démarrage de la collecte de données...")
            
            # Importer et exécuter le script de collecte
            try:
                from Collecte_donnees import main as collecte_main
                collecte_main()
                logger.info("✅ Collecte terminée avec succès")
            except ImportError as e:
                logger.warning(f"⚠️ Collecte_donnees.py non trouvé ou erreur d'import: {e}")
                logger.info("💡 Utilisation de données simulées à la place")
            except Exception as e:
                logger.error(f"❌ Erreur lors de la collecte: {e}")
                import traceback
                logger.error(traceback.format_exc())
            
            # Attendre X minutes avant la prochaine collecte
            interval = int(os.getenv("COLLECTE_INTERVAL", "900"))
            logger.info(f"⏳ Prochaine collecte dans {interval} secondes ({interval//60} minutes)...")
            time.sleep(interval)
            
        except Exception as e:
            logger.error(f"❌ Erreur critique dans la boucle de collecte: {e}")
            time.sleep(60)  # Attendre 1 minute en cas d'erreur


# Démarrer le thread de collecte automatique
if os.getenv("ENABLE_AUTO_COLLECTE", "true").lower() == "true":
    collecte_thread = threading.Thread(target=run_collecte, daemon=True)
    collecte_thread.start()
    logger.info("🚀 Thread de collecte automatique démarré")
else:
    logger.info("ℹ️ Collecte automatique désactivée (ENABLE_AUTO_COLLECTE=false)")

logger.info("=" * 60)
logger.info("✅ BACKEND PRÊT")
logger.info("=" * 60)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    app.run(host="0.0.0.0", port=port)