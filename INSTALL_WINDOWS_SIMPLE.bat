@echo off
setlocal enabledelayedexpansion

echo =====================================
echo Skylink NVR - Simple Windows Setup
echo =====================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: This script must be run as Administrator.
    echo Please right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

echo Running as Administrator - Good!
echo Current directory: %CD%
echo.

REM Create basic directories
echo Creating application directories...
if not exist "recordings" mkdir recordings
if not exist "snapshots" mkdir snapshots
if not exist "logs" mkdir logs
echo Directories created.
echo.

REM Check if .env exists, if not copy from example
if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env file from template...
        copy .env.example .env >nul
        echo .env file created. Please edit it with your database settings.
    ) else (
        echo Creating basic .env file...
        echo NODE_ENV=development > .env
        echo PORT=5000 >> .env
        echo DATABASE_URL=postgresql://username:password@localhost:5432/skylink_nvr >> .env
        echo # Edit the DATABASE_URL above with your actual database credentials >> .env
        echo .env file created. Please edit it with your database settings.
    )
    echo.
)

REM Check for Node.js
echo Checking for Node.js installation...
node --version >nul 2>&1
if %errorLevel% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo Node.js found: !NODE_VERSION!
) else (
    echo Node.js not found. Please install Node.js 20 from https://nodejs.org/
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

REM Check for npm
echo Checking for npm...
npm --version >nul 2>&1
if %errorLevel% EQU 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo npm found: !NPM_VERSION!
) else (
    echo npm not found. This is unusual - npm comes with Node.js.
    echo Please reinstall Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo =====================================
echo Installing dependencies...
echo =====================================

REM Install npm dependencies
npm install
if %errorLevel% NEQ 0 (
    echo ERROR: Failed to install dependencies.
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.

REM Check if database push is needed
echo =====================================
echo Database setup...
echo =====================================

npm run db:push
if %errorLevel% NEQ 0 (
    echo WARNING: Database push failed. This might be normal if:
    echo - Database is not yet configured in .env file
    echo - Database server is not running
    echo.
    echo Please configure your database in .env file and run: npm run db:push
)

echo.
echo =====================================
echo Setup Complete!
echo =====================================
echo.

echo Next steps:
echo 1. Edit .env file with your database credentials
echo 2. If using local PostgreSQL, ensure the service is running
echo 3. Run database migrations: npm run db:push
echo 4. Start the application: npm run dev
echo.

echo Starting the application now...
echo Press Ctrl+C to stop the application
echo.
echo The application will be available at: http://localhost:5000
echo.

REM Start the application
npm run dev

pause