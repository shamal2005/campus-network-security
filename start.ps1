Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "       AI-POWERED CAMPUS NETWORK SECURITY SYSTEM" -ForegroundColor White
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Backend FastAPI Threat Detection Engine on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\backend'; .\venv\Scripts\python.exe run.py"

Write-Host "Starting Frontend React Dashboard on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\frontend'; npm run dev"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " Both servers launched successfully!" -ForegroundColor Green
Write-Host "   Frontend Dashboard:   http://localhost:5173" -ForegroundColor Yellow
Write-Host "   Backend API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "===================================================================" -ForegroundColor Cyan
