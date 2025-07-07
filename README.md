# Skylink Enterprise NVR System

A comprehensive enterprise-grade Network Video Recorder (NVR) system built for advanced IP camera management and surveillance. Features modern web interface, AI-powered detection, ONVIF support, and cross-platform compatibility.

## 🚀 Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd skylink-nvr

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Start with Docker Compose
docker-compose up -d

# Access the application
# http://localhost:5000
```

### Windows Installation

```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Download and run installer
Invoke-WebRequest -Uri "path/to/install-windows.ps1" -OutFile "install-skylink.ps1"
.\install-skylink.ps1
```

### Linux Installation (Debian/Ubuntu)

```bash
# Download and run installer
curl -fsSL path/to/install-linux.sh | bash

# Follow the installation prompts
```

## 🛠️ Features

### Core Capabilities
- **Multi-Camera Support**: Manage unlimited IP cameras with ONVIF discovery
- **Live Streaming**: Real-time RTSP stream viewing with multiple quality options
- **Recording Management**: Continuous recording with configurable retention policies
- **AI Detection**: Integrated CodeProjectAI for object and motion detection
- **Mobile Responsive**: Native-like experience on iOS and Android devices
- **Dark Theme**: Professional Ubiquiti-inspired interface design

### Camera Management
- **Auto-Discovery**: Network scanning for ONVIF-compatible cameras
- **Connection Testing**: Real-time validation of camera connectivity
- **Template System**: Reusable configurations for camera models
- **PTZ Control**: Pan, tilt, and zoom control for supported cameras
- **Multi-Stream**: Support for multiple stream profiles per camera

### AI Detection
- **Real-Time Analysis**: Live AI processing with configurable detection types
- **Event Management**: Searchable detection events with metadata
- **Confidence Thresholds**: Per-camera confidence level settings
- **Bounding Boxes**: Visual detection areas with coordinate data
- **Alert System**: Notification system for detection events

### System Health
- **Resource Monitoring**: CPU, memory, and storage tracking
- **Service Status**: Real-time health checks for all components
- **Performance Metrics**: Historical data and trending analysis
- **Automated Alerts**: System health notifications and warnings

## 📋 Requirements

### Minimum System Requirements
- **CPU**: 4+ cores (Intel i5 or AMD Ryzen 5 equivalent)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 100GB+ for system, additional storage for recordings
- **Network**: Gigabit Ethernet for multiple HD cameras
- **OS**: Windows 10+, Ubuntu 20.04+, Debian 11+, or Docker

### Recommended for Production
- **CPU**: 8+ cores (Intel i7 or AMD Ryzen 7)
- **RAM**: 32GB for large installations
- **Storage**: NVMe SSD for OS/database, dedicated storage for recordings
- **Network**: Dedicated camera VLAN with QoS policies
- **UPS**: Uninterruptible power supply for critical installations

## 🔧 Installation Methods

### 1. Docker Deployment (Recommended)

**Production Setup:**
```bash
# Production with external database
docker-compose up -d

# Development environment
docker-compose -f docker-compose.dev.yml up -d

# Scale for multiple instances
docker-compose up -d --scale skylink-nvr=3
```

**Custom Configuration:**
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  skylink-nvr:
    environment:
      - CUSTOM_SETTING=value
    volumes:
      - /custom/recordings:/app/recordings
      - /custom/config:/app/config
```

### 2. Linux System Service

**Automated Installation:**
```bash
curl -fsSL https://install.skylink-nvr.com/linux.sh | bash
```

**Manual Installation:**
```bash
# Install dependencies
sudo apt update
sudo apt install nodejs npm postgresql nginx

# Create user and directories
sudo useradd -r skylink
sudo mkdir -p /opt/skylink-nvr
sudo chown skylink:skylink /opt/skylink-nvr

# Deploy application
cd /opt/skylink-nvr
git clone <repo-url> .
npm install
npm run build

# Configure systemd service
sudo cp scripts/systemd/skylink-nvr.service /etc/systemd/system/
sudo systemctl enable skylink-nvr
sudo systemctl start skylink-nvr

# Configure nginx
sudo cp scripts/nginx/skylink-nvr.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/skylink-nvr /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### 3. Windows Service

**Automated Installation:**
```powershell
# Run as Administrator
powershell -ExecutionPolicy Bypass -File scripts/install-windows.ps1
```

**Manual Service Setup:**
```powershell
# Install as Windows Service using NSSM
scripts/windows/install-service.ps1

# Or run as application
cd C:\Skylink-NVR
npm start
```

## 🗄️ Database Configuration

### Neon Database (Cloud - Recommended)
```env
DATABASE_URL=postgresql://user:pass@host.neon.tech:5432/skylink_nvr?sslmode=require
```

### Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql

# Create database
sudo -u postgres createdb skylink_nvr
sudo -u postgres createuser skylink
sudo -u postgres psql -c "ALTER USER skylink PASSWORD 'secure_password';"

# Configure .env
DATABASE_URL=postgresql://skylink:secure_password@localhost:5432/skylink_nvr
```

### Database Migration
```bash
# Push schema to database
npm run db:push

# Run custom migration script
npm run db:migrate

# Generate new migrations
npm run db:generate
```

## 🌐 Network Configuration

### Camera Network Setup
```bash
# Recommended camera network isolation
# Primary network: 192.168.1.0/24 (management)
# Camera VLAN: 192.168.100.0/24 (cameras only)
```

### Firewall Configuration
```bash
# Ubuntu/Debian
sudo ufw allow 5000/tcp    # Application
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 554/tcp    # RTSP
sudo ufw enable

# Windows Firewall
netsh advfirewall firewall add rule name="Skylink NVR" dir=in action=allow protocol=TCP localport=5000
```

### Reverse Proxy (Nginx)
```nginx
# /etc/nginx/sites-available/skylink-nvr
server {
    listen 80;
    server_name nvr.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔐 Security Configuration

### SSL/TLS Setup
```bash
# Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d nvr.yourdomain.com

# Or manual certificate
ENABLE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### Authentication
```env
# Strong session secret
SESSION_SECRET=your-very-secure-random-string-here

# Optional: External authentication
LDAP_URL=ldap://your.ldap.server
OAUTH_PROVIDER=google
```

### Network Security
- Use dedicated camera VLANs
- Enable camera encryption when available
- Change default camera passwords
- Use strong database credentials
- Enable firewall rules
- Regular security updates

## 📊 Monitoring and Maintenance

### Health Monitoring
```bash
# Check application health
curl http://localhost:5000/api/health

# System health
curl http://localhost:5000/api/system/health

# Using health check script
npm run health
```

### Log Management
```bash
# Linux systemd logs
sudo journalctl -u skylink-nvr -f

# Docker logs
docker-compose logs -f skylink-nvr

# Windows Event Viewer
# Search for "Skylink" in Application logs
```

### Backup Strategy
```bash
# Database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Recording backup
rsync -av /opt/skylink-nvr/recordings/ /backup/recordings/

# Automated backup script
# See scripts/backup.sh for complete solution
```

## 🔧 Development

### Local Development
```bash
# Clone repository
git clone <repo-url>
cd skylink-nvr

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Access at http://localhost:5000
```

### Building for Production
```bash
# Build application
npm run build

# Test production build
npm start

# Docker build
docker build -t skylink-nvr .
```

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📚 API Documentation

### Health Endpoints
- `GET /api/health` - Application health status
- `GET /api/system/health` - System resource metrics
- `GET /api/system/stats` - Camera and recording statistics

### Camera Management
- `GET /api/cameras` - List all cameras
- `POST /api/cameras` - Add new camera
- `PUT /api/cameras/:id` - Update camera settings
- `DELETE /api/cameras/:id` - Remove camera
- `POST /api/cameras/discover` - Discover ONVIF cameras

### AI Detection
- `GET /api/detections` - List detection events
- `GET /api/detections/stats` - Detection statistics
- `POST /api/ai/configure` - Configure detection settings

### Recordings
- `GET /api/recordings` - List recordings
- `GET /api/recordings/:id` - Get recording details
- `DELETE /api/recordings/:id` - Delete recording

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find process using port 5000
sudo lsof -i :5000
sudo kill -9 <PID>
```

**Database Connection Failed:**
```bash
# Test database connection
psql $DATABASE_URL

# Check PostgreSQL status
sudo systemctl status postgresql
```

**Camera Discovery Issues:**
```bash
# Check network connectivity
ping <camera-ip>

# Verify ONVIF port
nmap -p 80,554,8080 <camera-ip>

# Test RTSP stream
ffplay rtsp://<camera-ip>/stream
```

**Permission Denied (Linux):**
```bash
# Fix ownership
sudo chown -R skylink:skylink /opt/skylink-nvr

# Fix permissions
sudo chmod -R 755 /opt/skylink-nvr
sudo chmod 600 /opt/skylink-nvr/.env
```

### Performance Optimization

**Database Performance:**
```sql
-- Enable query optimization
SET work_mem = '256MB';
SET shared_buffers = '1GB';
SET effective_cache_size = '4GB';

-- Create indexes for frequent queries
CREATE INDEX idx_detections_camera_time ON ai_detections(camera_id, detected_at);
CREATE INDEX idx_recordings_camera_time ON recordings(camera_id, started_at);
```

**Storage Optimization:**
```bash
# Automatic cleanup of old recordings
# Add to crontab
0 2 * * * /opt/skylink-nvr/scripts/cleanup-recordings.sh

# Compress old recordings
find /opt/skylink-nvr/recordings -name "*.mp4" -mtime +7 -exec gzip {} \;
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [https://docs.skylink-nvr.com](https://docs.skylink-nvr.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/skylink-nvr/issues)
- **Community**: [Discord Server](https://discord.gg/skylink-nvr)
- **Commercial Support**: support@skylink-nvr.com

## 🗺️ Roadmap

### Version 2.0
- [ ] Multi-server clustering
- [ ] Advanced analytics dashboard
- [ ] Mobile applications (iOS/Android)
- [ ] Cloud storage integration
- [ ] Advanced user management

### Version 2.5
- [ ] Facial recognition
- [ ] License plate recognition
- [ ] Advanced rule engine
- [ ] Integration with security systems
- [ ] API webhooks and automation

---

**Skylink Enterprise NVR** - Professional surveillance made simple.