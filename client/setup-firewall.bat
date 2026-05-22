@echo off
title Music Core - Firewall Setup
cd /d "%~dp0"

echo ================================================
echo   Music Core - Windows Firewall Setup
echo ================================================
echo.
echo This script adds inbound firewall rules for:
echo   - Port 5173 (Vite dev server - web app)
echo   - Port 3001 (Backend API / WebSocket server)
echo.
echo NOTE: Run this script as Administrator!
echo.
echo Right-click this file and select "Run as administrator"
echo.
pause

:: Add firewall rule for Vite dev server (port 5173)
netsh advfirewall firewall add rule name="Music Core - Vite Dev (5173)" dir=in action=allow protocol=TCP localport=5173 profile=private,domain description="Allow LAN access to Music Core web app via Vite dev server"

:: Add firewall rule for Backend server (port 3001) - needed for direct WS connections
netsh advfirewall firewall add rule name="Music Core - Backend (3001)" dir=in action=allow protocol=TCP localport=3001 profile=private,domain description="Allow LAN access to Music Core backend API/WebSocket"

echo.
echo Firewall rules added successfully.
echo You can now access the app from other LAN devices.
echo.
echo To verify:
echo   netsh advfirewall firewall show rule name="Music Core - Vite Dev (5173)"
echo.
pause