@echo off
title Roonjha Print Share - Windows Firewall Setup
echo ========================================================
echo   Configuring Windows Firewall for Port 3000
echo   software by Roonjha Developers : 0315291486
echo ========================================================
echo.
echo Requesting administrator privileges...

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTE] Please right-click this file and choose "Run as administrator".
    echo Attempting to elevate...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"Roonjha Print Share\" dir=in action=allow protocol=TCP localport=3000 profile=private & pause' -Verb RunAs"
    exit /b
)

echo Adding Windows Defender Firewall inbound rule for port 3000 (Private network profile)...
netsh advfirewall firewall delete rule name="Roonjha Print Share" >nul 2>&1
netsh advfirewall firewall add rule name="Roonjha Print Share" dir=in action=allow protocol=TCP localport=3000 profile=private

echo.
echo Firewall configured successfully! Customer phones on your local Wi-Fi / Hotspot can now connect to port 3000.
pause
