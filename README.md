#  Smart City Air Quality Platform

> Plateforme de prédiction en temps réel de la qualité de l'air urbain utilisant le Machine Learning

##  Aperçu

**Smart City Air Quality Platform** est une application full-stack de prédiction de la qualité de l'air en temps réel pour les villes intelligentes. Utilisant des algorithmes de Machine Learning avancés (XGBoost et Random Forest), la plateforme analyse les données de pollution, météorologiques et de trafic pour fournir des prédictions précises et actionnables.

###  Objectifs

-  **Environnement** : Surveiller et prédire la qualité de l'air urbain
-  **Santé publique** : Alerter les citoyens des pics de pollution
-  **Data-Driven** : Décisions basées sur des données temps réel
-  **IA Transparente** : Explications des prédictions ML
- **Accessibilité** : Interface web responsive et intuitive

###  Points Forts

-  Prédictions en temps réel (< 200ms)
-  Précision 73-90% selon indicateurs
-  Comparaison dual-model (XGBoost vs Random Forest)
-  Visualisations interactives (Recharts)
-  Intégration APIs temps réel (AQICN, OpenWeather)
-  Explications des prédictions (feature importance)
-  100% Responsive (Mobile-First)

---
##  Fonctionnalités

###  Machine Learning

-  **Dual-Model System** : XGBoost + Random Forest
-  **Multi-Target Prediction** :
  - Qualité de l'air (AQI, PM2.5, PM10, O3, NO2, CO)
  - Météo (Température, Humidité, Pression)
  - Trafic (Densité, Vitesse moyenne, Incidents)
-  **Feature Engineering** : 15+ features optimisées
-  **Hyperparameter Tuning** : Grid Search CV
-  **Model Explainability** : SHAP values, Feature importance
-  **Real-Time Predictions** : API REST < 200ms

###  Visualisations

-  **Graphiques Temps Réel** : Line charts, Bar charts, Area charts
-  **Heatmaps** : Corrélation des features
-  **Maps** : Qualité de l'air géolocalisée
-  **Trends** : Analyse historique et prédictions futures
-  **Comparaisons** : XGBoost vs Random Forest side-by-side

### Intégrations APIs

-  **OpenWeather API** : Données météo temps réel
-  **AQICN API** : Indice de qualité de l'air mondial
-  **Traffic API** : Données trafic urbain (optionnel)
-  **Geocoding API** : Localisation automatique

###  Interface Utilisateur

-  **Design Moderne** : Tailwind CSS + Glassmorphism
-  **Responsive** : Mobile, Tablette, Desktop
-  **Dark Mode** : Thème sombre par défaut
-  **Performance** : React optimisé, lazy loading
-  **Alertes** : Notifications push pour pics de pollution

---

##  Architecture

### Diagramme Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Dashboard  │  │ Predictions│  │ Comparison │            │
│  │ Component  │  │ Component  │  │ Component  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                         │                                    │
│                   Axios HTTP                                 │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                    Backend (Flask)                           │
│                         │                                    │
│         ┌───────────────┴───────────────┐                   │
│         │                                 │                   │
│   ┌─────▼─────┐                   ┌─────▼─────┐            │
│   │ API Routes│                   │  ML Models │            │
│   │  /predict │                   │  XGBoost   │            │
│   │  /compare │                   │  RF Model  │            │
│   │  /health  │                   └────────────┘            │
│   └───────────┘                                              │
│         │                                                    │
│         └──────────┬──────────┬──────────┐                  │
│                    │          │          │                   │
│            ┌───────▼──┐ ┌────▼────┐ ┌──▼─────┐            │
│            │ AQICN    │ │OpenWeather│ │ Cache  │            │
│            │ API      │ │    API    │ │ Redis  │            │
│            └──────────┘ └──────────┘ └────────┘            │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                    Data Layer                                │
│         ┌───────────────┴───────────────┐                   │
│   ┌─────▼─────┐                   ┌─────▼─────┐            │
│   │PostgreSQL │                   │  Training  │            │
│   │ Database  │                   │   Data     │            │
│   │(Historic) │                   │  (CSV)     │            │
│   └───────────┘                   └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Pattern

- **Frontend** : Single Page Application (SPA) - React
- **Backend** : RESTful API - Flask
- **ML Pipeline** : Offline training + Online inference
- **Data Flow** : Real-time + Historical data
- **Caching** : Redis pour performance API
- **Database** : PostgreSQL pour données historiques

---

##  Modèles ML

### XGBoost vs Random Forest

| Métrique | XGBoost | Random Forest | Gagnant |
|----------|---------|---------------|---------|
| **Pollution (R²)** | 0.87 | 0.82 |  XGBoost |
| **Météo (R²)** | 0.90 | 0.85 | XGBoost |
| **Trafic (R²)** | 0.73 | 0.71 |  XGBoost |
| **MAE Pollution** | 8.3 | 10.1 |  XGBoost |
| **RMSE Météo** | 2.1 | 2.7 |  XGBoost |
| **Temps inférence** | 45ms | 38ms |  RF |
| **Taille modèle** | 2.3 MB | 18 MB |  XGBoost |

### Hyperparamètres Optimisés

**XGBoost :**
```python
{
    'n_estimators': 300,
    'max_depth': 7,
    'learning_rate': 0.05,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'min_child_weight': 3,
    'gamma': 0.1,
    'reg_alpha': 0.1,
    'reg_lambda': 1.0
}
```

**Random Forest :**
```python
{
    'n_estimators': 200,
    'max_depth': 15,
    'min_samples_split': 5,
    'min_samples_leaf': 2,
    'max_features': 'sqrt',
    'bootstrap': True
}
```

### Features (15)

**Pollution (6) :**
- PM2.5, PM10, O3, NO2, CO, SO2

**Météo (5) :**
- Température, Humidité, Pression, Vitesse vent, Direction vent

**Temps (2) :**
- Heure du jour, Jour de la semaine

**Trafic (2) :**
- Densité trafic, Incidents

### Feature Importance

```
1. PM2.5          (0.23) 🔴
2. Température    (0.18) 🟠
3. Humidité       (0.15) 🟡
4. PM10           (0.12) 🟢
5. Heure          (0.10) 🔵
6. NO2            (0.08) 🟣
7. Vent           (0.06) ⚪
8. Autres         (0.08) ⚫
```

---

##  Stack Technique

### Frontend

| Tech       | Version | Usage               |
|------      |-------- |------------         |
| React      | 18.2+   | UI Framework        |
| TypeScript | 5.0+    | Type Safety         |
| Recharts   | 2.5+    | Data Visualization  |
|Tailwind CSS| 3.3+    | Styling             |
| Axios      | 1.4+    | HTTP Client         |
| React Query| 4.0+    | State Management    |
| Vite       | 4.3+    | Build Tool          |

### Backend

| Tech    | Version | Usage            |
|------   |---------|-------           |
| Python  | 3.9+ | Language            |
| Flask   | 2.3+ | Web Framework       |
| XGBoost | 1.7+ | ML Model            |
| scikit-learn | 1.3+ | ML Tools       |
| Pandas  | 2.0+ | Data Processing     |
| NumPy   | 1.24+  Numerical Computing |
| Redis   | 7.0+ | Caching             |
| PostgreSQL | 14+ | Database          |

### APIs & Services

- **AQICN API** : Données qualité air mondiale
- **OpenWeather API** : Météo temps réel
- **Netlify** : Hosting frontend
- **Render / Heroku** : Hosting backend

### DevOps

- **Docker** : Containerization
- **GitHub Actions** : CI/CD
- **pytest** : Testing
- **Black** : Code formatting
- **ESLint** : Linting

---

## Installation

### Prérequis

```bash
# Python 3.9+
python --version

# Node.js 16+
node --version

# Redis
redis-server --version

# PostgreSQL (optionnel)
psql --version
```

### 2. Backend Setup

```bash
cd backend

# Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer dépendances
pip install -r requirements.txt

# Télécharger modèles pré-entraînés
python scripts/download_models.py

# Lancer serveur Flask
python app.py
```


### 3. Frontend Setup

```bash
cd ../frontend

# Installer dépendances
npm install

# Lancer dev server
npm run dev
```

### 4. Redis Setup (Optionnel)

```bash
# MacOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis

# Windows
# Télécharger depuis https://redis.io/download
```

---

##  Configuration

### Variables d'Environnement

**Backend (`.env`)**

```bash
# API Keys
AQICN_API_KEY=your_aqicn_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Flask Config
FLASK_ENV=development
FLASK_APP=app.py
SECRET_KEY=your_secret_key_here

# Redis
REDIS_URL=redis://localhost:6379/0

# Database (optionnel)
DATABASE_URL=postgresql://user:password@localhost:5432/smartcity

# ML Models
XGBOOST_MODEL_PATH=models/xgboost_model.pkl
RF_MODEL_PATH=models/rf_model.pkl
SCALER_PATH=models/scaler.pkl

# Cache
CACHE_TIMEOUT=300  # 5 minutes
```

**Frontend (`.env`)**

```bash
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Smart City Air Quality
VITE_DEFAULT_CITY=Paris
```

### Obtenir les API Keys

**AQICN API :**
1. Aller sur [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/)
2. S'inscrire gratuitement
3. Copier votre API token

**OpenWeather API :**
1. Aller sur [openweathermap.org/api](https://openweathermap.org/api)
2. Créer un compte
3. Obtenir API key (gratuit jusqu'à 1000 calls/jour)

---

