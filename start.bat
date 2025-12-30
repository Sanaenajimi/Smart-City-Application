@echo off
echo ======================================
echo SMART CITY - Demarrage des serveurs
echo ======================================
echo.

echo [1/3] Demarrage du backend (Python Flask)...
start cmd /k "cd backend && python api_backend.py"

timeout /t 3 /nobreak > nul

echo [2/3] Demarrage du collecteur de donnees...
start cmd /k "cd backend && python Collecte_donnees.py"

timeout /t 2 /nobreak > nul

echo [3/3] Demarrage du frontend (Vite React)...
start cmd /k "cd frontend && npm run dev"

echo.
echo ======================================
echo Les 3 serveurs demarrent...
echo ======================================
echo.
echo Backend API    : http://localhost:5000
echo Collecteur     : En cours d'execution
echo Frontend       : http://localhost:5173
echo.
echo Ouvrez votre navigateur et allez sur:
echo http://localhost:5173
echo.
echo Comptes de test:
echo - admin@smartcity.com / admin123
echo - marie.dubois@smartcity.com / password123
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause > nul
