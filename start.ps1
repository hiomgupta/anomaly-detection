Write-Host "Starting Canara Bank Intelligence Dashboard Setup..."

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

# 1. Setup Backend
Write-Host "`n[1/4] Setting up Backend..."
Set-Location -Path (Join-Path $ScriptDir "backend")

if (-Not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}

Write-Host "Installing Python dependencies..."
& ".\venv\Scripts\python.exe" -m pip install -r requirements.txt

Write-Host "Starting FastAPI backend in the background..."
Start-Process -WindowStyle Minimized -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"

# 2. Setup Frontend
Write-Host "`n[2/4] Setting up Frontend..."
Set-Location -Path (Join-Path $ScriptDir "frontend")

Write-Host "Installing Node dependencies..."
npm install

Write-Host "`n[3/4] Starting React frontend..."
Write-Host "The application is starting. Keep this window open."
npm run dev
