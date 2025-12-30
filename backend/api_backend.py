from flask import Blueprint, request, jsonify, make_response
import jwt
import datetime
import os

api_bp = Blueprint("api", __name__)

@api_bp.route("/auth/login", methods=["POST", "OPTIONS"])
def login():
    # Réponse au preflight CORS
    if request.method == "OPTIONS":
        response = make_response("", 204)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({"message": "No JSON body"}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "")

    # Dictionnaire des utilisateurs
    users = {
        "marie.env@smartcity.demo": "Marie Dubois",
        "paul.elu@smartcity.demo": "Paul Martin",
        "citoyen@smartcity.demo": "Citoyen"
    }

    # Vérification email + password
    if email and password == "demo":
        token = jwt.encode(
            {
                "email": email,
                "role": "DEMO",
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
            },
            os.environ.get("JWT_SECRET", "dev_secret"),
            algorithm="HS256"
        )

        response = jsonify({
            "token": token,
            "user": {
                "email": email,
                "name": users.get(email, "Utilisateur"),
                "role": "DEMO"
            }
        })
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response, 200

    return jsonify({"message": "Invalid credentials"}), 401