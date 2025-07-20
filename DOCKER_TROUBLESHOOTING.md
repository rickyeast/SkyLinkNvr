# Docker Troubleshooting Guide

## Common WebSocket Errors

### Error: `wss://localhost/v2` Connection Failed

**Cause**: Neon Database WebSocket configuration conflicts in Docker environments.

**Solution**: The application automatically disables WebSocket pooling in production environments. Ensure your `.env` file has:
```
NODE_ENV=production
DATABASE_URL=postgresql://skylink:password@127.0.0.1:5432/skylink_nvr
```

### Error: Failed to initialize scheduled recordings

**Cause**: Database connection not ready when recording service starts.

**Solution**: The application now includes:
- Delayed initialization of scheduled recordings
- Graceful error handling for database connection issues
- Automatic retry mechanisms

## Port Access Issues

### Host Network Mode: Cannot access localhost:8080

**Check List**:
1. Verify containers are running: `docker-compose ps`
2. Check application logs: `docker-compose logs skylink-nvr`
3. Verify port binding: `docker exec <container> netstat -tlnp | grep 8080`
4. Test database connection: `docker exec <container> pg_isready -h 127.0.0.1`

**Commands**:
```bash
# Check if application is running in container
docker-compose exec skylink-nvr curl -f http://127.0.0.1:8080/api/system/health

# Verify environment variables
docker-compose exec skylink-nvr printenv | grep -E "(PORT|DATABASE_URL|NODE_ENV)"

# Check database connectivity
docker-compose exec skylink-nvr pg_isready -h 127.0.0.1 -p 5432
```

### Bridge Network Mode: Works but no network discovery

**Expected Behavior**: This is normal. Bridge mode provides security isolation but cannot scan the local network for cameras.

**Workaround**: Manually add cameras by IP address in the Camera settings.

## Database Connection Issues

### PostgreSQL Connection Refused

**Host Network Mode**:
- Database URL should use `127.0.0.1:5432`
- PostgreSQL container should be accessible on host network

**Bridge Network Mode**:
- Database URL should use `postgres:5432`
- Uses internal Docker networking

### Reset Database Connection

```bash
# Stop containers
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

## Network Discovery Issues

### nmap not working in container

**Verify nmap installation**:
```bash
docker-compose exec skylink-nvr nmap --version
```

**Test network scanning**:
```bash
# Test basic connectivity
docker-compose exec skylink-nvr ping 8.8.8.8

# Test local network scan (host network mode only)
docker-compose exec skylink-nvr nmap -sn 192.168.1.1/24
```

## System Monitoring Issues

### Host stats showing 0% or container stats only

**Host Network Mode**: Should show real host stats
```bash
# Verify host filesystem access
docker-compose exec skylink-nvr ls -la /host/proc/
docker-compose exec skylink-nvr cat /host/proc/meminfo | head -5
```

**Bridge Network Mode**: Shows container stats (expected behavior)

## Log Analysis

### View detailed logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f skylink-nvr
docker-compose logs -f postgres

# With timestamps
docker-compose logs -f -t skylink-nvr
```

### Application-specific logs
```bash
# Inside container
docker-compose exec skylink-nvr tail -f /app/logs/application.log

# System monitoring
docker-compose exec skylink-nvr cat /host/proc/loadavg
```

## Performance Issues

### High memory usage
- Check recording storage: `docker-compose exec skylink-nvr df -h /app/recordings`
- Monitor active recordings: Check `/api/recordings` endpoint
- Clean up old recordings: Built-in retention policy runs daily at 2 AM

### Slow database queries
- Check database connection pooling
- Monitor PostgreSQL logs: `docker-compose logs postgres`
- Consider database optimization for large recording datasets

## Recovery Procedures

### Complete reset (preserves configuration)
```bash
docker-compose down
docker-compose up -d --build
```

### Fresh installation (deletes all data)
```bash
docker-compose down -v
rm -rf recordings/ logs/ snapshots/
docker-compose up -d --build
```

### Backup and restore
```bash
# Backup database
docker-compose exec postgres pg_dump -U skylink skylink_nvr > backup.sql

# Restore database
docker-compose exec -T postgres psql -U skylink -d skylink_nvr < backup.sql
```