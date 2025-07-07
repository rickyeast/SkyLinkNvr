# Skylink Enterprise NVR - Windows Service Installation
# Run this script as Administrator

param(
    [string]$InstallPath = "C:\Skylink-NVR",
    [string]$ServiceName = "SkyLinkNVR",
    [string]$ServiceDisplayName = "Skylink Enterprise NVR",
    [switch]$Uninstall
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

# Function to install NSSM if not present
function Install-NSSM {
    $nssmPath = "${env:ProgramFiles}\nssm\win64\nssm.exe"
    
    if (Test-Path $nssmPath) {
        return $nssmPath
    }
    
    Write-Host "Installing NSSM (Non-Sucking Service Manager)..." -ForegroundColor Yellow
    
    # Download and install NSSM
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $tempPath = "$env:TEMP\nssm.zip"
    $extractPath = "$env:TEMP\nssm"
    
    Invoke-WebRequest -Uri $nssmUrl -OutFile $tempPath
    Expand-Archive -Path $tempPath -DestinationPath $extractPath -Force
    
    $nssmFolder = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
    $nssmInstallPath = "${env:ProgramFiles}\nssm"
    
    New-Item -ItemType Directory -Path $nssmInstallPath -Force
    Copy-Item -Path "$($nssmFolder.FullName)\*" -Destination $nssmInstallPath -Recurse -Force
    
    # Add to PATH
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    if ($currentPath -notlike "*$nssmInstallPath\win64*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$nssmInstallPath\win64", "Machine")
    }
    
    # Clean up
    Remove-Item $tempPath -Force
    Remove-Item $extractPath -Recurse -Force
    
    return "$nssmInstallPath\win64\nssm.exe"
}

# Uninstall service
if ($Uninstall) {
    Write-Host "Uninstalling $ServiceDisplayName..." -ForegroundColor Yellow
    
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-Host "Stopping service..." -ForegroundColor Yellow
            Stop-Service -Name $ServiceName -Force
        }
        
        $nssmPath = Install-NSSM
        & $nssmPath remove $ServiceName confirm
        
        Write-Host "$ServiceDisplayName has been uninstalled." -ForegroundColor Green
    } else {
        Write-Host "Service $ServiceName not found." -ForegroundColor Yellow
    }
    exit 0
}

# Install service
Write-Host "Installing $ServiceDisplayName as Windows Service..." -ForegroundColor Green

# Check if application exists
if (-not (Test-Path "$InstallPath\dist\index.js")) {
    Write-Error "Application not found at $InstallPath\dist\index.js"
    Write-Host "Please ensure the application is built and located at $InstallPath"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = & node --version
    Write-Host "Found Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not installed or not in PATH"
    exit 1
}

# Install NSSM
$nssmPath = Install-NSSM

# Stop existing service if running
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    if ($existingService.Status -eq "Running") {
        Stop-Service -Name $ServiceName -Force
    }
    & $nssmPath remove $ServiceName confirm
}

# Install new service
Write-Host "Creating Windows service..." -ForegroundColor Yellow

& $nssmPath install $ServiceName "$(Get-Command node).Source"
& $nssmPath set $ServiceName AppDirectory $InstallPath
& $nssmPath set $ServiceName AppParameters "dist\index.js"
& $nssmPath set $ServiceName DisplayName $ServiceDisplayName
& $nssmPath set $ServiceName Description "Enterprise-grade Network Video Recorder system for IP camera management and surveillance"
& $nssmPath set $ServiceName Start SERVICE_AUTO_START

# Set environment variables for the service
& $nssmPath set $ServiceName AppEnvironmentExtra "NODE_ENV=production"

# Configure logging
$logPath = "$InstallPath\logs"
New-Item -ItemType Directory -Path $logPath -Force

& $nssmPath set $ServiceName AppStdout "$logPath\service-stdout.log"
& $nssmPath set $ServiceName AppStderr "$logPath\service-stderr.log"
& $nssmPath set $ServiceName AppRotateFiles 1
& $nssmPath set $ServiceName AppRotateOnline 1
& $nssmPath set $ServiceName AppRotateBytes 10485760  # 10MB

# Set service recovery options
& $nssmPath set $ServiceName AppExit Default Restart
& $nssmPath set $ServiceName AppRestartDelay 5000

# Start the service
Write-Host "Starting $ServiceDisplayName..." -ForegroundColor Yellow
Start-Service -Name $ServiceName

# Check service status
Start-Sleep -Seconds 3
$service = Get-Service -Name $ServiceName
if ($service.Status -eq "Running") {
    Write-Host "$ServiceDisplayName installed and started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Management Commands:" -ForegroundColor Cyan
    Write-Host "  Start:   Start-Service -Name $ServiceName" -ForegroundColor White
    Write-Host "  Stop:    Stop-Service -Name $ServiceName" -ForegroundColor White
    Write-Host "  Restart: Restart-Service -Name $ServiceName" -ForegroundColor White
    Write-Host "  Status:  Get-Service -Name $ServiceName" -ForegroundColor White
    Write-Host ""
    Write-Host "Log Files:" -ForegroundColor Cyan
    Write-Host "  Stdout:  $logPath\service-stdout.log" -ForegroundColor White
    Write-Host "  Stderr:  $logPath\service-stderr.log" -ForegroundColor White
    Write-Host ""
    Write-Host "Application URL: http://localhost:5000" -ForegroundColor Cyan
} else {
    Write-Error "Failed to start $ServiceDisplayName. Check the logs for details."
    Write-Host "Log files are located at: $logPath" -ForegroundColor Yellow
}