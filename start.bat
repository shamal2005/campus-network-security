@echo off
title AI-Powered Campus Network Security System Launcher
echo ===================================================================
echo     AI-POWERED CAMPUS NETWORK SECURITY SYSTEM
echo ===================================================================
echo.
echo Launching Backend FastAPI Threat Engine on http://127.0.0.1:8000 ...
start "Backend API - FastAPI" cmd /k "cd backend && venv\Scripts\activate && python run.py"

echo Launching Frontend UI React on http://localhost:5173 ...
start "Frontend UI - Vite React" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================================
echo  System is running!
echo  - Frontend Dashboard:   http://localhost:5173
echo  - Backend API:          http://127.0.0.1:8000
echo  - Swagger API Docs:     http://127.0.0.1:8000/docs
echo ===================================================================
pause
