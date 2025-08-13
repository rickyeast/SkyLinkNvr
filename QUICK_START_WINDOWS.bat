@echo off
echo =====================================
echo Skylink NVR - Windows Quick Start
echo =====================================
echo.

echo This will fix PowerShell execution policy and run the installation...
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - Good!
    echo.
) else (
    echo ERROR: This script must be run as Administrator.
    echo Please right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

REM Fix PowerShell execution policy and run installation
echo Fixing PowerShell execution policy...
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"

if %errorLevel% == 0 (
    echo PowerShell execution policy fixed!
    echo.
    echo Running installation script...
    echo.
    powershell -ExecutionPolicy Bypass -File ".\scripts\install-windows.ps1"
) else (
    echo Failed to set execution policy. Trying bypass method...
    powershell -ExecutionPolicy Bypass -File ".\scripts\install-windows.ps1"
)

echo.
echo Installation completed. Press any key to exit...
pause > nul