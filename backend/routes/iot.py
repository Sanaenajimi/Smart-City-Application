from flask import Blueprint, jsonify, request

iot_bp = Blueprint("iot", __name__, url_prefix="/api/iot")

# MVP: on accepte la donnée, on renvoie OK.
# Plus tard: stocker en SQLite.
@iot_bp.post("/measurements")
def ingest():
    payload = request.get_json(force=True)
    return jsonify({"ok": True, "received": payload})
