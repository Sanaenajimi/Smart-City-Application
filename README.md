# Smart City - Plateforme de Surveillance de la Qualité de l'Air

## Démarrage Rapide

### Option 1 : Démarrage automatique (Windows) - RECOMMANDÉ
Double-cliquez sur `start.bat` pour lancer automatiquement les 3 composants :
1. Backend API (Flask)
2. Collecteur de données (temps réel)
3. Frontend (React)

### Option 2 : Démarrage manuel

Ouvrez **3 terminaux différents** :

#### Terminal 1 - Backend API
```bash
cd backend
python api_backend.py
```
Le backend sera accessible sur : http://localhost:5000

#### Terminal 2 - Collecteur de données
```bash
cd backend
python Collecte_donnees.py
```
Le collecteur récupérera automatiquement les données toutes les secondes.

#### Terminal 3 - Frontend
```bash
cd frontend
npm run dev
```
Le frontend sera accessible sur : http://localhost:5173

## Accès à l'application

Une fois les 3 composants démarrés, ouvrez votre navigateur et accédez à :
- **Application web** : http://localhost:5173

## Comptes de test

- **Admin** : admin@smartcity.com / admin123
- **Utilisateur** : marie.dubois@smartcity.com / password123

---

## Guide pour partager avec vos amis

### Prérequis nécessaires

Avant de partager le projet, vos amis doivent avoir installé :

1. **Python 3.12+** : [Télécharger Python](https://www.python.org/downloads/)
   - Lors de l'installation, cocher "Add Python to PATH"

2. **Node.js 18+** : [Télécharger Node.js](https://nodejs.org/)
   - Inclut npm automatiquement

3. **Git** (optionnel) : Pour cloner le projet

### Installation pour vos amis

#### Étape 1 : Récupérer le projet

**Option A - Avec Git :**
```bash
git clone [votre-repo]
cd SMART
```

**Option B - Sans Git :**
1. Télécharger le dossier SMART complet
2. Extraire le zip
3. Ouvrir un terminal dans le dossier SMART

#### Étape 2 : Installer les dépendances Python

```bash
cd backend
pip install flask flask-cors requests schedule reportlab
cd ..
```

#### Étape 3 : Installer les dépendances Node.js

```bash
cd frontend
npm install
cd ..
```

#### Étape 4 : Lancer l'application

**Windows :**
Double-cliquer sur `start.bat`

**Mac/Linux :**
```bash
# Terminal 1
cd backend && python api_backend.py

# Terminal 2 (nouveau terminal)
cd backend && python Collecte_donnees.py

# Terminal 3 (nouveau terminal)
cd frontend && npm run dev
```

#### Étape 5 : Utiliser l'application

Ouvrir le navigateur sur : http://localhost:5173

### Fichiers à partager

Voici les fichiers essentiels à inclure :

```
SMART/
├── backend/
│   ├── api_backend.py
│   ├── Collecte_donnees.py
│   ├── ml_predictions.py
│   └── (smartcity.db sera créé automatiquement)
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── (node_modules/ sera créé avec npm install)
├── start.bat
└── README.md
```

**NE PAS PARTAGER :**
- `node_modules/` (trop volumineux, sera créé avec npm install)
- `smartcity.db` (sera créé automatiquement)
- `__pycache__/` (fichiers temporaires Python)

### Dépannage pour vos amis

#### Erreur "Python n'est pas reconnu"
→ Réinstaller Python et cocher "Add to PATH"

#### Erreur "npm n'est pas reconnu"
→ Réinstaller Node.js

#### Port 5000 ou 5173 déjà utilisé
```bash
# Windows - Fermer le processus
netstat -ano | findstr :5000
taskkill /PID [numero] /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

#### Base de données vide
→ Lancer `Collecte_donnees.py` pendant 1-2 minutes pour remplir la base

## Problèmes résolus

✅ Problème d'encodage des emojis dans le backend (Windows)
✅ Problème de dépendances npm corrompues
✅ Configuration PostCSS pour Tailwind CSS
✅ Installation complète des dépendances

## Structure du projet

```
SMART/
├── backend/
│   ├── api_backend.py         # API Flask
│   ├── ml_predictions.py      # Modèle IA de prédiction
│   ├── Collecte_donnees.py    # Collecte de données
│   └── smartcity.db           # Base de données SQLite
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Application React principale
│   │   ├── main.jsx           # Point d'entrée
│   │   └── index.css          # Styles globaux
│   ├── index.html
│   └── package.json
└── start.bat                   # Script de démarrage Windows
```

## Technologies utilisées

### Backend
- Python 3.12
- Flask (API REST)
- SQLite (Base de données)
- Scikit-learn (Machine Learning)
- ReportLab (Génération PDF)

### Frontend
- React 18
- Vite (Build tool)
- Tailwind CSS (Styling)
- Recharts (Graphiques)
- Lucide React (Icônes)

## Fonctionnalités

✅ Authentification utilisateur
✅ Tableau de bord en temps réel
✅ Visualisation des données de qualité de l'air
✅ Carte interactive des zones
✅ Système d'alertes
✅ Prédictions IA (24h)
✅ Génération de rapports PDF
✅ Filtres avancés (période, zone, polluants)

## Support

Pour toute question ou problème, consultez les logs des serveurs dans les terminaux respectifs.
# smart-city-3
