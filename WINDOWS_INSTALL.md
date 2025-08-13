# Windows Installation Guide

## Method 1: PowerShell (Recommended)

Run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\install-windows.ps1
```

## Method 2: Bypass Execution Policy (One-time)

Run this single command in PowerShell as Administrator:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
```

## Method 3: Manual Installation

If PowerShell methods fail, follow these manual steps:

### 1. Install Node.js
- Download Node.js LTS from https://nodejs.org/
- Install with default settings

### 2. Install PostgreSQL (Optional - can use Neon DB)
- Download from https://www.postgresql.org/download/windows/
- Install with default settings
- Remember the password you set for postgres user

### 3. Install Docker Desktop
- Download from https://www.docker.com/products/docker-desktop/
- Install and restart computer when prompted

### 4. Setup Environment
Open Command Prompt or PowerShell in the project directory:

```cmd
# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Edit .env file with your database credentials
notepad .env

# Initialize database (if using local PostgreSQL)
npm run db:push

# Start the application
npm run dev
```

## Method 4: Docker Installation (Recommended for Production)

```cmd
# Build and run with Docker Compose
docker-compose -f docker-compose.host.yml up --build
```

For host network mode (required for camera discovery):
```cmd
docker-compose -f docker-compose.host.yml up --build
```

## Troubleshooting

### PowerShell Execution Policy
If you continue to get execution policy errors:

1. **Check current policy**: `Get-ExecutionPolicy`
2. **Set policy for current user**: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. **Temporary bypass**: `PowerShell -ExecutionPolicy Bypass -File script.ps1`

### Network Discovery Issues
- Ensure Docker is running in host network mode for camera discovery
- Windows Defender Firewall may block network scanning - add exceptions for the application
- Run Docker Desktop as Administrator for host network access

### Database Connection
- If using local PostgreSQL, ensure the service is running
- Check Windows Services for "postgresql" service
- Verify database credentials in `.env` file

## Security Notes

- The execution policy change is safe and only affects PowerShell script execution
- Host network mode in Docker provides full network access for camera discovery
- Always use strong passwords for database connections