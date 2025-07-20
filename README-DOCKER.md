# Skylink NVR Docker Configuration

## Quick Start

### For Full NVR Functionality (Recommended)
```bash
# Run the deployment script
chmod +x deploy.sh
./deploy.sh
# Choose option 1 (Host Network Mode)
```

Or manually:
```bash
# Copy host network configuration
cp docker-compose.host.yml docker-compose.yml

# Set up environment
cp .env.docker.example .env
# Edit .env - set POSTGRES_PASSWORD=your_secure_password

# Deploy
docker-compose up -d --build
```

### For Security-First Deployment
```bash
# Use standard bridge network (already configured)
cp .env.docker.example .env
# Edit .env - set POSTGRES_PASSWORD and change localhost to postgres

# Deploy
docker-compose up -d --build
```

## Network Modes Explained

### Host Network Mode (docker-compose.host.yml)

**Best for:** Full NVR functionality with network discovery

**Configuration:**
- `network_mode: host` - Container uses host network directly
- `privileged: true` - Allows access to host system resources
- Volume mounts: `/proc:/host/proc:ro` and `/sys:/host/sys:ro`
- Database URL: `localhost:5432` (host network)
- Port 5000 is native (no port mapping needed)

**Features Enabled:**
- ✅ Automatic IP camera discovery using nmap network scanning
- ✅ Real host system monitoring (actual CPU, memory, storage stats)
- ✅ Direct access to cameras on local network segments
- ✅ ONVIF device discovery across network subnets

**Security Considerations:**
- Container shares host network interface
- Less network isolation than bridge mode
- Required for enterprise NVR deployment

### Bridge Network Mode (docker-compose.yml)

**Best for:** Security-focused deployment with manual configuration

**Configuration:**
- Standard Docker bridge networking
- Port mapping: `5000:5000`
- Database URL: `postgres:5432` (internal Docker network)
- No host system access

**Features:**
- ✅ Better network isolation and security
- ✅ Standard Docker networking practices
- ❌ No network discovery (manual camera setup only)
- ❌ Container stats only (not real host metrics)

## Port Configuration

The application uses different ports for different network modes to avoid conflicts:

- **Bridge network mode:** Port 5000 (standard Docker port mapping)
- **Host network mode:** Port 8080 (to avoid host network conflicts)
- **Server binding:** `0.0.0.0:{PORT}` (accessible from any interface)

Access URLs:
- **Bridge mode:** http://localhost:5000
- **Host network mode:** http://localhost:8080

## Database Configuration

### Host Network Mode
```
DATABASE_URL=postgresql://skylink:password@localhost:5432/skylink_nvr
```

### Bridge Network Mode
```
DATABASE_URL=postgresql://skylink:password@postgres:5432/skylink_nvr
```

## System Monitoring

The application automatically detects the environment:

**In Host Network Mode:**
- Reads from `/host/proc/meminfo` for real memory stats
- Reads from `/host/proc/stat` for actual CPU usage
- Reads from `/host/proc/uptime` for system uptime

**In Bridge Mode:**
- Falls back to Node.js `os` module for container stats
- Shows container-specific resource usage

## Testing Your Configuration

Use the test script to verify your Docker setup:
```bash
chmod +x test-docker.sh
./test-docker.sh
```

## Troubleshooting

### Connection Refused on localhost:5000
This usually happens when:
1. Development server is already running on port 5000 (stop it first)
2. Database connection is failing in host network mode
3. Container failed to start properly

**Solutions:**
```bash
# Stop development server first
# Then test Docker deployment
./test-docker.sh
```

### Network Discovery Not Working
```bash
# Verify host network and nmap
docker exec $(docker-compose ps -q skylink-nvr) nmap --version
docker exec $(docker-compose ps -q skylink-nvr) ping 192.168.1.1
```

### System Stats Showing 0%
```bash
# Check host filesystem access
docker exec $(docker-compose ps -q skylink-nvr) ls -la /host/proc/
docker exec $(docker-compose ps -q skylink-nvr) cat /host/proc/meminfo
```

### Database Connection Issues
```bash
# Check database connectivity
docker-compose logs postgres
docker exec $(docker-compose ps -q skylink-nvr) pg_isready -h localhost
```

### View Logs
```bash
# Application logs
docker-compose logs -f skylink-nvr

# All services
docker-compose logs -f
```

## Deployment Recommendations

### Production NVR Deployment
Use **Host Network Mode** for:
- IP camera discovery and management
- Real system resource monitoring
- Professional surveillance installations
- Enterprise environments requiring full functionality

### Development/Testing
Use **Bridge Network Mode** for:
- Security testing
- Development environments
- Limited camera setups with known IPs
- Environments where network isolation is critical

## Files Overview

- `docker-compose.host.yml` - Host network configuration
- `docker-compose.yml` - Standard bridge network configuration
- `.env.docker.example` - Environment template
- `deploy.sh` - Interactive deployment script
- `DOCKER_DEPLOYMENT.md` - Detailed deployment guide