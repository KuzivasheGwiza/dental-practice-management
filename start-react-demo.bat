@echo off
cd /d "%~dp0frontend\dentalcare-react"
if not exist node_modules call npm ci
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
