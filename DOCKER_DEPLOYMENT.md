# Docker Deployment Guide for Skylink NVR

## Network Discovery and System Stats in Docker

When running Skylink NVR in Docker, you need special configuration for:
1. **Network Discovery**: Access to host network for IP camera scanning
2. **System Stats**: Access to host system resources for CPU/memory monitoring

## Option 1: Host Network Mode (Recommended for full functionality)

Use the provided `docker-compose.host.yml` configuration:

```bash
# Copy the host network configuration
cp docker-compose.host.yml docker-compose.yml

# Set environment variables
echo "DATABASE_URL=postgresql://skylink:your_password@localhost:5432/skylink_nvr" > .env
echo "POSTGRES_PASSWORD=your_secure_password" >> .env

# Build and run with host network access
docker-compose up -d
```

### Host Network Configuration Features:
- ✅ Full network discovery (can scan for IP cameras)
- ✅ Real system stats (CPU, memory, storage)
- ✅ Direct access to camera IPs on local network
- ⚠️ Uses host networking (less isolated)

## Option 2: Bridge Network with Limited Features

For more secure but limited functionality:

```bash
# Use standard docker-compose.yml
docker-compose up -d
```

### Bridge Network Limitations:
- ❌ Network discovery disabled (cannot scan for cameras)
- ❌ Container stats only (not host system stats)
- ✅ Manual camera addition by IP still works
- ✅ Better security isolation

## Docker Configuration Files

### 1. Dockerfile Updates
The Dockerfile includes these tools for network discovery:
- `nmap` - Network scanning
- `net-tools` - Network utilities
- `iputils-ping` - Connectivity testing
- `procps` - Process monitoring

### 2. Host Network Docker Compose (docker-compose.host.yml)
```yaml
services:
  skylink-nvr:
    network_mode: host        # Access host network
    privileged: true          # Access system resources
    volumes:
      - /proc:/host/proc:ro   # Host process info
      - /sys:/host/sys:ro     # Host system info
    environment:
      - DATABASE_URL=postgresql://skylink:password@localhost:5432/skylink_nvr
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
    # Note: No port mapping needed in host network mode
```

## Environment Variables for Docker

Add these to your `.env` file:

```bash
# Database connection
DATABASE_URL=postgresql://skylink:password@localhost:5432/skylink_nvr

# PostgreSQL settings
POSTGRES_PASSWORD=your_secure_password

# Optional: Host system paths (for host network mode)
HOST_PROC=/host/proc
HOST_SYS=/host/sys
```

## Deployment Commands

### Initial Setup
```bash
# 1. Clone or copy the Skylink NVR files
# 2. Choose configuration based on your needs:

# For full functionality (host network):
cp docker-compose.host.yml docker-compose.yml

# For secure but limited functionality:
# Use default docker-compose.yml

# 3. Configure environment
cp .env.docker.example .env
# Edit .env with your database password and settings

# 4. Build and start
docker-compose up -d

# 5. Check logs
docker-compose logs -f skylink-nvr
```

### Updating
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Network Discovery Not Working
- Verify host network mode is enabled
- Check if nmap is installed in container: `docker exec skylink-nvr nmap --version`
- Test network access: `docker exec skylink-nvr ping 192.168.1.1`

### System Stats Showing 0%
- Ensure host volumes are mounted: `/proc` and `/sys`
- Check privileged mode is enabled
- Verify container can read host stats: `docker exec skylink-nvr cat /host/proc/meminfo`

### Camera Addition Failing
- Test camera connectivity: `docker exec skylink-nvr ping [camera-ip]`
- Check port accessibility: `docker exec skylink-nvr telnet [camera-ip] 80`
- Review container logs: `docker-compose logs skylink-nvr`

## Security Considerations

### Host Network Mode
- **Pro**: Full functionality, easy camera access
- **Con**: Less network isolation, container uses host IP
- **Use when**: Full NVR functionality is required

### Bridge Network Mode  
- **Pro**: Better security isolation
- **Con**: Limited network discovery, manual camera setup only
- **Use when**: Security is priority over convenience

## Performance Tips

1. **Storage**: Use dedicated volumes for recordings
2. **Memory**: Allocate sufficient RAM for video processing
3. **Network**: Use wired connection for cameras when possible
4. **CPU**: Consider hardware acceleration for video encoding

## Example Commands

```bash
# Test camera discovery in container
docker exec skylink-nvr nmap -sn 192.168.1.0/24

# Check system resources
docker exec skylink-nvr free -h
docker exec skylink-nvr df -h

# View real-time logs
docker-compose logs -f --tail=50 skylink-nvr
```