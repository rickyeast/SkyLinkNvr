# Skylink Enterprise NVR - Deployment Guide

This guide covers deployment options for Windows, Linux (Debian/Ubuntu), and Docker environments.

## Prerequisites

- Node.js 20 or higher
- PostgreSQL 13+ database
- Minimum 4GB RAM
- 50GB+ storage for recordings
- Network access to IP cameras

## Quick Start with Docker

### Development
```bash
# Clone the repository
git clone <repository-url>
cd skylink-nvr

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Access the application
# http://localhost:5000
```

### Production
```bash
# Build and start production containers
docker-compose up -d

# View logs
docker-compose logs -f skylink-nvr

# Stop services
docker-compose down
```

## Linux Installation (Debian/Ubuntu)

### Automated Installation
```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/your-repo/skylink-nvr/main/scripts/install-linux.sh | bash

# Follow the prompts to complete installation
```

### Manual Installation

#### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install system dependencies
sudo apt install -y build-essential python3 git nginx postgresql postgresql-contrib
```

#### 2. Database Setup
```bash
# Create database and user
sudo -u postgres createuser skylink
sudo -u postgres createdb skylink_nvr
sudo -u postgres psql -c "ALTER USER skylink PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE skylink_nvr TO skylink;"
```

#### 3. Application Setup
```bash
# Create application directory
sudo mkdir -p /opt/skylink-nvr
sudo useradd -r -s /bin/false skylink
sudo chown -R skylink:skylink /opt/skylink-nvr

# Clone and build
cd /opt/skylink-nvr
git clone <repository-url> .
npm install
npm run build

# Configure environment
sudo nano .env
```

#### 4. System Service
```bash
# Copy service file from scripts/systemd/skylink-nvr.service
sudo cp scripts/systemd/skylink-nvr.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable skylink-nvr
sudo systemctl start skylink-nvr
```

#### 5. Nginx Configuration
```bash
# Copy nginx configuration
sudo cp scripts/nginx/skylink-nvr.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/skylink-nvr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Windows Installation

### Automated Installation
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Download and run installation script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/your-repo/skylink-nvr/main/scripts/install-windows.ps1" -OutFile "install-skylink.ps1"
.\install-skylink.ps1
```

### Manual Installation

#### 1. Install Dependencies
- Install Node.js 20 from [nodejs.org](https://nodejs.org/)
- Install Git from [git-scm.com](https://git-scm.com/)
- Install PostgreSQL from [postgresql.org](https://www.postgresql.org/) (optional)

#### 2. Application Setup
```cmd
# Create application directory
mkdir C:\Skylink-NVR
cd C:\Skylink-NVR

# Clone repository
git clone <repository-url> .

# Install dependencies
npm install

# Build application
npm run build

# Configure environment
copy .env.example .env
notepad .env
```

#### 3. Windows Service (Optional)
Use NSSM (Non-Sucking Service Manager) or similar tool:
```cmd
# Install NSSM
# Download from https://nssm.cc/

# Create service
nssm install SkyLinkNVR "C:\Program Files\nodejs\node.exe"
nssm set SkyLinkNVR AppDirectory "C:\Skylink-NVR"
nssm set SkyLinkNVR AppParameters "dist/index.js"
nssm start SkyLinkNVR
```

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/skylink_nvr

# Optional: Redis for sessions
REDIS_URL=redis://localhost:6379

# Optional: External services
CODEPROJECT_AI_URL=http://localhost:32168
CODEPROJECT_AI_KEY=your_api_key

# Security
SESSION_SECRET=your_very_secure_session_secret

# Storage paths
RECORDINGS_PATH=./recordings
SNAPSHOTS_PATH=./snapshots
LOGS_PATH=./logs
```

## Database Migration

After installation, run database migrations:

```bash
# Install Drizzle CLI globally
npm install -g drizzle-kit

# Push schema to database
npm run db:push

# Or use the included script
node scripts/migrate.js
```

## Monitoring and Maintenance

### Health Checks
- Application health: `http://localhost:5000/api/health`
- System metrics: `http://localhost:5000/api/system/health`

### Log Management

#### Linux (systemd)
```bash
# View live logs
sudo journalctl -u skylink-nvr -f

# View recent logs
sudo journalctl -u skylink-nvr -n 100
```

#### Docker
```bash
# View logs
docker-compose logs -f skylink-nvr

# Export logs
docker-compose logs skylink-nvr > skylink.log
```

### Backup Strategy

#### Database Backup
```bash
# PostgreSQL backup
pg_dump skylink_nvr > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
psql skylink_nvr < backup-file.sql
```

#### Recording Backup
```bash
# Sync recordings to backup location
rsync -av /opt/skylink-nvr/recordings/ /backup/skylink-recordings/
```

## Security Considerations

### Network Security
- Configure firewall rules
- Use HTTPS in production (nginx + Let's Encrypt)
- Restrict database access
- Use VPN for remote camera access

### Application Security
- Change default passwords
- Use strong session secrets
- Enable rate limiting
- Regular security updates

### Camera Security
- Change default camera credentials
- Use camera-specific VLANs
- Enable camera encryption when available
- Regular firmware updates

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000
sudo netstat -tulpn | grep 5000

# Kill process if needed
sudo kill -9 <PID>
```

#### Database Connection Issues
```bash
# Test database connection
psql -h localhost -U skylink -d skylink_nvr

# Check PostgreSQL status
sudo systemctl status postgresql
```

#### Permission Issues (Linux)
```bash
# Fix ownership
sudo chown -R skylink:skylink /opt/skylink-nvr

# Fix permissions
sudo chmod -R 755 /opt/skylink-nvr
sudo chmod 600 /opt/skylink-nvr/.env
```

### Performance Optimization

#### Database Optimization
- Regular VACUUM and ANALYZE
- Proper indexing for detection queries
- Connection pooling

#### Storage Optimization
- Automatic recording cleanup
- Video compression settings
- SSD for database, HDD for recordings

#### Network Optimization
- Camera stream quality settings
- Bandwidth monitoring
- Load balancing for multiple cameras

## Support

For additional support:
- Check application logs
- Review system metrics
- Consult the troubleshooting section
- Submit issues with detailed logs and system information

## Updates

### Application Updates
```bash
# Linux
cd /opt/skylink-nvr
sudo -u skylink git pull
sudo -u skylink npm install
sudo -u skylink npm run build
sudo systemctl restart skylink-nvr

# Docker
docker-compose pull
docker-compose up -d
```

### Database Updates
```bash
# Run migrations after updates
npm run db:push
```