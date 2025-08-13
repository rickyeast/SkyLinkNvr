# Skylink NVR - Complete Docker Deployment Guide

This guide provides complete instructions for deploying the Skylink NVR system in a local Docker environment with no Replit dependencies.

## ✅ Docker Compatibility Status

The application is now **fully Docker-compatible** with the following improvements:

### ✅ Recent Updates (August 2025)
- **Replaced custom nmap-based scanning with proper ONVIF WS-Discovery multicast**
- **Removed all duplicate function definitions**
- **Fixed database schema compatibility**
- **Enhanced error handling for Docker environments**
- **All Replit-specific features are conditionally loaded (won't affect Docker)**

### ✅ Key Features for Docker
- **Standards-Compliant ONVIF Discovery**: Uses professional multicast UDP broadcast
- **Cross-Platform Network Tools**: Includes nmap, curl, net-tools for network discovery
- **Host Network Mode Support**: Full access to host network for camera discovery
- **Database Migration**: Automatic schema deployment with Drizzle
- **Production Build**: Optimized for production Docker deployment

## Quick Start

### 1. Download and Extract
```bash
# Download from Replit and extract to your Docker host
cd /your/deployment/directory
```

### 2. Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

Required environment variables:
```env
# Database Configuration (for host network mode)
DATABASE_URL=postgresql://skylink:skylink_secure_pass@127.0.0.1:5432/skylink_nvr
POSTGRES_PASSWORD=skylink_secure_pass

# Production Environment
NODE_ENV=production

# Docker Host Network Configuration
HOST_PROC=/host/proc
HOST_SYS=/host/sys
PORT=8080
```

### 3. Fresh Docker Build (Recommended)
```bash
# Make the script executable
chmod +x fresh-docker-build.sh

# Run fresh build with host network mode (recommended)
./fresh-docker-build.sh

# OR for bridge network mode
./fresh-docker-build.sh bridge
```

### 4. Manual Deployment (Alternative)
```bash
# Use host network mode for full camera discovery
docker compose -f docker-compose.host.yml up -d --build
```

### 5. Verify Deployment
```bash
# Check logs
docker compose -f docker-compose.host.yml logs -f skylink-nvr

# Check health
curl http://localhost:8080/api/system/health
```

## Network Discovery Features

### ✅ ONVIF WS-Discovery Multicast
- **Standards Compliant**: Uses official ONVIF WS-Discovery protocol
- **Fast Discovery**: Multicast UDP broadcast finds all cameras simultaneously
- **Cross-Platform**: Works on Windows, Linux, and Docker environments
- **Professional Grade**: Same protocol used by commercial NVR systems

### ✅ Enhanced Camera Detection
- **Real-time Discovery**: Cameras respond immediately to multicast probes
- **Manufacturer Detection**: Automatically identifies Hikvision, Dahua, Axis, etc.
- **Model Extraction**: Retrieves specific camera model information
- **ONVIF Compliance**: Only detects properly configured ONVIF cameras

## Docker Compose Configurations

### Host Network Mode (Recommended for NVR)
```yaml
# docker-compose.host.yml
services:
  skylink-nvr:
    network_mode: host
    privileged: true
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    environment:
      - PORT=8080
      - DATABASE_URL=postgresql://skylink:skylink_secure_pass@127.0.0.1:5432/skylink_nvr
```

**Benefits:**
- Full network access for camera discovery
- ONVIF multicast works properly
- Host system monitoring
- Direct camera communication

### Bridge Network Mode (Security-Focused)
```bash
docker compose up -d --build
```

**Benefits:**
- Network isolation
- Standard Docker networking
- Port mapping control

**Limitations:**
- Limited ONVIF multicast discovery
- Manual camera addition required

## Camera Discovery Testing

### Verify ONVIF Discovery
```bash
# Test ONVIF discovery endpoint
curl -X POST http://localhost:8080/api/cameras/discover

# Check discovered cameras
curl http://localhost:8080/api/cameras/discovered
```

### Manual Camera Addition
```bash
# Add camera manually if needed
curl -X POST http://localhost:8080/api/cameras/test \
  -H "Content-Type: application/json" \
  -d '{"ipAddress": "10.0.0.21"}'
```

## System Health Monitoring

### Check System Status
```bash
# System health
curl http://localhost:8080/api/system/health

# System statistics  
curl http://localhost:8080/api/system/stats

# Camera list
curl http://localhost:8080/api/cameras
```

## Database Management

### Database Migrations
```bash
# Push schema changes
docker compose exec skylink-nvr npm run db:push

# Check database connection
docker compose exec postgres psql -U skylink -d skylink_nvr -c "\dt"
```

## Fresh Build Script

The `fresh-docker-build.sh` script provides a complete clean deployment:

### Features
- **Safe for Multi-Application Hosts**: Only removes Skylink NVR containers/images
- **No Cache Build**: Forces complete rebuild from scratch
- **Health Monitoring**: Waits for services and verifies deployment
- **Network Mode Selection**: Supports both host and bridge network modes
- **Comprehensive Logging**: Shows detailed status and troubleshooting info

### Usage
```bash
# Host network mode (recommended for full NVR functionality)
./fresh-docker-build.sh

# Bridge network mode (security-focused, limited discovery)
./fresh-docker-build.sh bridge
```

### What It Does
1. Stops only Skylink NVR containers (preserves other apps)
2. Removes only Skylink NVR Docker images
3. Cleans Docker build cache
4. Builds with `--no-cache --pull` for fresh dependencies
5. Starts services and waits for database
6. **Automatically pushes database schema** (creates all tables)
7. Monitors health and verifies deployment
8. Provides deployment summary with URLs

## Troubleshooting

### Network Discovery Issues
1. **Ensure Host Network Mode**: Use `docker-compose.host.yml` for full camera access
2. **Check ONVIF Cameras**: Verify cameras support ONVIF WS-Discovery
3. **Network Connectivity**: Test camera access from Docker host

### Database Connection Issues
1. **Schema Not Created**: The fresh build script automatically runs `npm run db:push`
2. **"system_health" table missing**: Run database schema push manually:
   ```bash
   docker compose -f docker-compose.host.yml exec skylink-nvr npm run db:push
   ```
3. **Check DATABASE_URL**: Ensure correct host and credentials
4. **Verify PostgreSQL**: Check if database service is running:
   ```bash
   docker compose -f docker-compose.host.yml logs postgres
   ```

### Build Issues
1. **Use Fresh Build Script**: Run `./fresh-docker-build.sh` for clean rebuild
2. **Manual Clean Build**: Alternative manual approach:
   ```bash
   docker compose -f docker-compose.host.yml down
   docker compose -f docker-compose.host.yml build --no-cache
   docker compose -f docker-compose.host.yml up -d
   ```

## Production Deployment

### Security Considerations
- Change default passwords
- Use environment files for secrets
- Configure firewall rules
- Enable TLS/SSL for web interface

### Performance Optimization
- Use SSD storage for recordings
- Allocate sufficient RAM for streams
- Monitor CPU usage during recording
- Configure log rotation

## Support

For technical support or issues:
1. Check application logs: `docker compose logs skylink-nvr`
2. Verify network connectivity to cameras
3. Test ONVIF discovery manually
4. Review database schema compatibility

## Architecture Summary

- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React with Radix UI components
- **Database**: PostgreSQL with Drizzle ORM
- **Network Discovery**: ONVIF WS-Discovery multicast
- **Container Runtime**: Docker with Alpine Linux
- **Build System**: Vite + ESBuild for production

The system is now production-ready for local Docker deployment with professional-grade ONVIF camera discovery capabilities.