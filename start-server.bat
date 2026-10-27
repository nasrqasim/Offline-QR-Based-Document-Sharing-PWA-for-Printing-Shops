@echo off
title Roonjha Print Share - Windows Receiving Server
cls
echo ========================================================
echo   Roonjha Print Share - Local Offline Printing Server
echo   software by Roonjha Developers : 0315291486
echo ========================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: 2. Check and release port 3000 if occupied
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Port 3000 is occupied by process PID %%a. Terminating old instance...
    taskkill /f /pid %%a >nul 2>nul
)

:: 3. Run network discovery
echo Scanning network interfaces...
node scripts/check-network.js

:: 4. Run cleanup of old jobs
node --experimental-sqlite scripts/cleanup.js

echo.
echo Starting Roonjha Print Share server on http://0.0.0.0:3000 ...
echo Press Ctrl+C in this window to stop the server.
echo.

:: 5. Open browser automatically after 3 seconds in background
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000/dashboard"

:: 6. Run Next.js server
node --experimental-sqlite node_modules/next/dist/bin/next dev -H 0.0.0.0 -p 3000
pause
