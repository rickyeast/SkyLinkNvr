# Skylink Enterprise NVR - Windows Installation Script
# Run this script as Administrator in PowerShell

Write-Host "Installing Skylink Enterprise NVR on Windows..." -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator. Right-click PowerShell and select 'Run as Administrator'"
    exit 1
}

# Install Chocolatey if not present
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install Node.js
Write-Host "Installing Node.js 20..." -ForegroundColor Yellow
choco install nodejs --version=20.11.0 -y

# Install Git
Write-Host "Installing Git..." -ForegroundColor Yellow
choco install git -y

# Install PostgreSQL (optional)
$installPostgres = Read-Host "Install PostgreSQL locally? (y/N)"
if ($installPostgres -eq "y" -or $installPostgres -eq "Y") {
    Write-Host "Installing PostgreSQL..." -ForegroundColor Yellow
    choco install postgresql --params '/Password:skylink_admin' -y
}

# Create application directory
$appDir = "C:\Skylink-NVR"
Write-Host "Creating application directory at $appDir..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $appDir

# Create data directories
New-Item -ItemType Directory -Force -Path "$appDir\recordings"
New-Item -ItemType Directory -Force -Path "$appDir\snapshots"
New-Item -ItemType Directory -Force -Path "$appDir\logs"

# Create environment file template
$envContent = @"
NODE_ENV=production
DATABASE_URL=postgresql://skylink:password@localhost:5432/skylink_nvr
PORT=5000
"@

$envContent | Out-File -FilePath "$appDir\.env" -Encoding UTF8

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

Write-Host "Installation completed! Check $appDir\INSTALLATION.txt for next steps." -ForegroundColor Green
Write-Host "Make sure to configure your .env file with proper database credentials." -ForegroundColor Yellow