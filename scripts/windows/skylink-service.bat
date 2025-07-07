@echo off
REM Skylink Enterprise NVR - Windows Service Wrapper

cd /d "C:\Skylink-NVR"

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if application files exist
if not exist "dist\index.js" (
    echo Error: Application not built. Run 'npm run build' first.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo Warning: .env file not found. Using default configuration.
)

REM Start the application
echo Starting Skylink Enterprise NVR...
node dist\index.js

REM If we get here, the application has stopped
echo Skylink NVR has stopped.
pause