@echo off
title Stop Roonjha Print Share
echo ========================================================
echo   Stopping Roonjha Print Share Server...
echo ========================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Terminating server process PID %%a listening on port 3000...
    taskkill /f /pid %%a
    set FOUND=1
)

if %FOUND% equ 0 (
    echo No active server found listening on port 3000.
) else (
    echo Server stopped successfully.
)

pause
