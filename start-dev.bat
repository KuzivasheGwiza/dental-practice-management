@echo off
cd /d "%~dp0"

echo Starting Dental Practice API and Angular frontend...
start "Dental Practice API" cmd /k "cd /d %~dp0backend\DentalPractice.API && dotnet run --launch-profile http"
start "Dental Practice UI" cmd /k "cd /d %~dp0frontend\dental-practice-ui && npm start"

echo API:      http://localhost:5144
echo Swagger:  http://localhost:5144/swagger
echo Frontend: http://localhost:4200
