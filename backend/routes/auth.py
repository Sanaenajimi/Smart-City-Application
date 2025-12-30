import os
import jwt
from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

DEMO_USERS = {
    "marie.env@smartcity.demo": {"password": "demo", "name": "Marie Dubois", "persona": "env", "role": "Responsable Environnement"},
    "paul.elu@smartcity.demo": {"password": "demo", "name": "Paul M.", "persona": "elected", "role": "Élu"},
    "citoyen@smartcity.demo": {"password": "demo", "name": "Citoyen", "persona": "citizen", "role": "Citoyen"},
}

@auth_bp.post("/login")
def login():
    body = request.get_json(force=True)
    email = (body.get("email") or "").lower().strip()
    password = body.get("password") or ""

    u = DEMO_USERS.get(email)
    if not u or u["password"] != password:
        return jsonify({"error": "Invalid credentials"}), 401

    payload = {
        "sub": email,
        "name": u["name"],
        "persona": u["persona"],
        "role": u["role"],
        "exp": datetime.utcnow() + timedelta(hours=12),
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")
    return jsonify({"token": token, "user": {"email": email, "name": u["name"], "persona": u["persona"], "role": u["role"]}})
