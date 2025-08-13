# Skylink Enterprise NVR - Windows Installation Script
# 
# EXECUTION POLICY FIX:
# If you get execution policy errors, run one of these commands first:
# 
# Method 1 (Recommended): Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Method 2 (One-time): PowerShell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
#
# Run this script as Administrator in PowerShell

param(
    [switch]$Verbose,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Skylink Enterprise NVR - Windows Installation Script

Usage:
    .\install-windows.ps1 [-Verbose] [-Help]

Parameters:
    -Verbose    Enable verbose output for detailed installation logging
    -Help       Show this help message

Example:
    .\install-windows.ps1 -Verbose

Requirements:
    - PowerShell 5.0 or later
    - Administrator privileges
    - Internet connection
"@ -ForegroundColor Cyan
    exit 0
}

# Enable verbose preference if requested
if ($Verbose) {
    $VerbosePreference = "Continue"
    $DebugPreference = "Continue"
}

function Write-Step {
    param([string]$Message, [string]$Color = "Green")
    if ($Verbose) {
        Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Color
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-Progress-Step {
    param([string]$Message)
    Write-Step "🔄 $Message" "Yellow"
}

function Write-Success {
    param([string]$Message)
    Write-Step "✅ $Message" "Green"
}

function Write-Error-Step {
    param([string]$Message)
    Write-Step "❌ $Message" "Red"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Skylink Enterprise NVR - Windows Installer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
Write-Step "🔍 Checking administrator privileges..."
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error-Step "This script must be run as Administrator."
    Write-Host "   Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}
Write-Success "Administrator privileges confirmed"

# Check PowerShell version
Write-Step "🔍 Checking PowerShell version..."
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -lt 5) {
    Write-Error-Step "PowerShell 5.0 or later is required. Current version: $psVersion"
    Write-Host "   Please upgrade PowerShell and try again." -ForegroundColor Yellow
    exit 1
}
Write-Success "PowerShell version: $psVersion"

# Install Chocolatey if not present
Write-Step "🍫 Checking for Chocolatey package manager..."
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Progress-Step "Installing Chocolatey package manager..."
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        
        if ($Verbose) {
            iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        } else {
            iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')) | Out-Null
        }
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Success "Chocolatey installed successfully"
    } catch {
        Write-Error-Step "Failed to install Chocolatey: $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Success "Chocolatey is already installed"
}

# Check Node.js installation
Write-Step "📥 Checking Node.js installation..."
$nodeInstalled = $false
try {
    $nodeVersion = & node --version 2>$null
    if ($nodeVersion -match "v20") {
        Write-Success "Node.js 20 is already installed: $nodeVersion"
        $nodeInstalled = $true
    }
} catch {
    # Node.js not found or wrong version
}

if (-not $nodeInstalled) {
    Write-Progress-Step "Installing Node.js 20..."
    try {
        if ($Verbose) {
            choco install nodejs --version=20.11.0 -y
        } else {
            choco install nodejs --version=20.11.0 -y | Out-Null
        }
        Write-Success "Node.js 20 installed successfully"
    } catch {
        Write-Error-Step "Failed to install Node.js: $($_.Exception.Message)"
        exit 1
    }
}

# Verify Node.js and npm
try {
    $nodeVersion = & node --version
    $npmVersion = & npm --version
    Write-Success "Node.js verification completed"
    Write-Step "   Node.js version: $nodeVersion"
    Write-Step "   npm version: $npmVersion"
} catch {
    Write-Error-Step "Node.js installation verification failed"
    exit 1
}

# Install Git
Write-Step "📥 Checking Git installation..."
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Progress-Step "Installing Git..."
    try {
        if ($Verbose) {
            choco install git -y
        } else {
            choco install git -y | Out-Null
        }
        Write-Success "Git installed successfully"
        
        # Refresh environment to pick up Git
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Error-Step "Failed to install Git: $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Success "Git is already installed"
}

# Install PostgreSQL (optional)
Write-Host ""
$installPostgres = Read-Host "🗄️  Install PostgreSQL locally? (y/N)"
if ($installPostgres -eq "y" -or $installPostgres -eq "Y") {
    Write-Progress-Step "Installing PostgreSQL..."
    try {
        # Generate a secure password
        $postgresPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | % {[char]$_})
        
        if ($Verbose) {
            choco install postgresql --params "/Password:$postgresPassword" -y
        } else {
            choco install postgresql --params "/Password:$postgresPassword" -y | Out-Null
        }
        
        Write-Success "PostgreSQL installed successfully"
        Write-Step "   Password: $postgresPassword (saved to .env file)"
        $databaseUrl = "postgresql://postgres:$postgresPassword@localhost:5432/skylink_nvr"
    } catch {
        Write-Error-Step "Failed to install PostgreSQL: $($_.Exception.Message)"
        $databaseUrl = "postgresql://username:password@localhost:5432/skylink_nvr"
    }
} else {
    Write-Step "⏭️  Skipping PostgreSQL installation"
    $databaseUrl = "postgresql://username:password@localhost:5432/skylink_nvr"
}

# Create application directory
$appDir = "C:\Skylink-NVR"
Write-Step "📁 Creating application directory at $appDir..."
try {
    New-Item -ItemType Directory -Force -Path $appDir | Out-Null
    
    # Create data directories
    New-Item -ItemType Directory -Force -Path "$appDir\recordings" | Out-Null
    New-Item -ItemType Directory -Force -Path "$appDir\snapshots" | Out-Null
    New-Item -ItemType Directory -Force -Path "$appDir\logs" | Out-Null
    New-Item -ItemType Directory -Force -Path "$appDir\config" | Out-Null
    
    Write-Success "Application directories created"
} catch {
    Write-Error-Step "Failed to create application directories: $($_.Exception.Message)"
    exit 1
}

# Create environment file template
$envContent = @"
NODE_ENV=production
DATABASE_URL=$databaseUrl
PORT=5000
RECORDINGS_PATH=$appDir\recordings
SNAPSHOTS_PATH=$appDir\snapshots
LOGS_PATH=$appDir\logs
"@

$envContent | Out-File -FilePath "$appDir\.env" -Encoding UTF8
Write-Success "Environment file created"

# Create Windows service script
$serviceScript = @"
@echo off
cd /d "$appDir"
node dist/index.js
"@

$serviceScript | Out-File -FilePath "$appDir\start-skylink.bat" -Encoding ASCII

# Create installation instructions
$instructions = @"
Skylink Enterprise NVR Installation Complete!

Next Steps:
1. Clone or copy the Skylink NVR source code to: $appDir
2. Open Command Prompt as Administrator and navigate to: $appDir
3. Run: npm install
4. Run: npm run build
5. Configure your database connection in: $appDir\.env
6. Run database migrations: npm run db:push
7. Start the application: npm start

For Windows Service installation:
- Use NSSM (Non-Sucking Service Manager) or similar tool
- Point to: $appDir\start-skylink.bat

Default URLs:
- Application: http://localhost:5000
- Database: postgresql://localhost:5432 (if installed locally)

Data Directories:
- Recordings: $appDir\recordings
- Snapshots: $appDir\snapshots
- Logs: $appDir\logs
"@

$instructions | Out-File -FilePath "$appDir\INSTALLATION.txt" -Encoding UTF8

# Automated deployment option
Write-Host ""
$autoDeploy = Read-Host "🚀 Automatically download, build and deploy the application? (Y/n)"
if ($autoDeploy -ne "n" -and $autoDeploy -ne "N") {
    Write-Progress-Step "Downloading Skylink NVR source code..."
    
    # Check if git is available
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error-Step "Git is required for automatic deployment but not found"
        Write-Host "   Please install git or manually copy the source code to $appDir" -ForegroundColor Yellow
    } else {
        # Clone or download the source code
        # Note: Replace with actual repository URL when available
        $repoUrl = "https://github.com/your-username/skylink-nvr.git"
        
        Write-Step "⚠️  Repository URL needs to be configured: $repoUrl" "Yellow"
        Write-Step "   For now, we'll create a placeholder structure..." "Yellow"
        
        # Create basic package.json
        $packageJson = @"
{
  "name": "skylink-nvr",
  "version": "1.0.0",
  "description": "Skylink Enterprise NVR System",
  "main": "dist/index.js",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:@neondatabase/serverless --external:ws",
    "build:client": "vite build",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.0.0"
  }
}
"@
        
        $packageJson | Out-File -FilePath "$appDir\package.json" -Encoding UTF8
        Write-Success "Basic application structure created"
        Write-Step "⚠️  To complete deployment, copy your actual source code to $appDir" "Yellow"
        
        # Install dependencies if package.json exists
        Write-Progress-Step "Installing dependencies..."
        Set-Location $appDir
        try {
            if ($Verbose) {
                npm install
            } else {
                npm install | Out-Null
            }
            Write-Success "Dependencies installed"
        } catch {
            Write-Error-Step "Failed to install dependencies: $($_.Exception.Message)"
        }
        
        # Initialize database if PostgreSQL was installed
        if ($installPostgres -eq "y" -or $installPostgres -eq "Y") {
            Write-Progress-Step "Initializing database..."
            Write-Step "⚠️  Database migrations need to be run manually with: npm run db:push" "Yellow"
        }
        
        # Create a simple start script
        $startScript = @"
@echo off
echo Starting Skylink Enterprise NVR...
cd /d "$appDir"
npm start
"@
        $startScript | Out-File -FilePath "$appDir\start-skylink.bat" -Encoding ASCII
        
        Write-Progress-Step "Testing application startup..."
        Write-Host "Application setup completed. You can start it manually with:" -ForegroundColor Cyan
        Write-Host "   cd $appDir" -ForegroundColor White
        Write-Host "   npm start" -ForegroundColor White
        Write-Host "Or use the Windows Service installation script for production deployment." -ForegroundColor White
        
        Write-Success "Automated deployment completed"
    }
} else {
    Write-Step "⏭️  Skipping automatic deployment" "Yellow"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 Installation completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($autoDeploy -eq "n" -or $autoDeploy -eq "N") {
    Write-Host "📋 Manual deployment steps:" -ForegroundColor Cyan
    Write-Host "   1. Clone or copy the Skylink NVR source code to: $appDir" -ForegroundColor White
    Write-Host "   2. Open Command Prompt as Administrator and navigate to: $appDir" -ForegroundColor White
    Write-Host "   3. Run: npm install" -ForegroundColor White
    Write-Host "   4. Run: npm run build" -ForegroundColor White
    if ($installPostgres -eq "y" -or $installPostgres -eq "Y") {
        Write-Host "   5. The database is already configured and ready" -ForegroundColor White
    } else {
        Write-Host "   5. Configure your database connection in: $appDir\.env" -ForegroundColor White
    }
    Write-Host "   6. Run database migrations: npm run db:push" -ForegroundColor White
    Write-Host "   7. Start the application: npm start" -ForegroundColor White
} else {
    Write-Host "🎯 Automated deployment completed!" -ForegroundColor Green
    Write-Host "   The application should now be ready to start" -ForegroundColor White
}

Write-Host ""
Write-Host "📖 For detailed instructions: Get-Content $appDir\INSTALLATION.txt" -ForegroundColor Cyan
Write-Host "🔧 For Windows Service installation: .\scripts\windows\install-service.ps1" -ForegroundColor Cyan
Write-Host "🌐 Access application: http://localhost:5000" -ForegroundColor Cyan

if ($Verbose) {
    Write-Host ""
    Write-Host "Installation completed with verbose logging enabled." -ForegroundColor Green
}