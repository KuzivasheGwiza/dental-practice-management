@echo off
setlocal
cd /d "%~dp0"

echo === Dental Practice System - Development Setup ===

echo.
echo [1/2] Restoring .NET packages...
cd backend\DentalPractice.API
dotnet restore
if errorlevel 1 goto :fail

echo.
echo [2/2] Installing Angular packages...
cd ..\..\frontend\dental-practice-ui
call npm ci
if errorlevel 1 goto :fail

echo.
echo Setup complete.
echo Next run: start-dev.bat
exit /b 0

:fail
echo.
echo Setup failed. Check that .NET 8 SDK, Node.js/npm and internet/package access are available.
exit /b 1
