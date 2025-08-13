@echo off
echo =====================================
echo Skylink NVR - Docker Deployment
echo =====================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: Docker is not installed or not running.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo Docker found and running.
echo.

REM Check if .env exists
if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env file from template...
        copy .env.example .env >nul
        echo .env file created.
    ) else (
        echo ERROR: No .env.example file found.
        echo Please create a .env file with your database settings.
        pause
        exit /b 1
    )
)

echo Choose deployment mode:
echo.
echo 1) Host Network Mode (Recommended for camera discovery)
echo    - Can discover cameras on your network
echo    - Full NVR functionality
echo    - Less network isolation
echo.
echo 2) Bridge Network Mode (Secure but limited)
echo    - Better network isolation  
echo    - Cannot discover cameras automatically
echo    - Must add cameras manually
echo.

set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Starting in Host Network Mode...
    echo This provides full camera discovery capabilities.
    echo.
    docker-compose -f docker-compose.host.yml up --build
) else if "%choice%"=="2" (
    echo.
    echo Starting in Bridge Network Mode...
    echo Camera discovery will be limited.
    echo.
    docker-compose up --build
) else (
    echo Invalid choice. Defaulting to Host Network Mode...
    echo.
    docker-compose -f docker-compose.host.yml up --build
)

echo.
echo Docker deployment stopped.
pause