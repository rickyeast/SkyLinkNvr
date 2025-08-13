# Docker Deployment on Windows

## Quick Start (Recommended)

1. **Install Docker Desktop**
   - Download from https://www.docker.com/products/docker-desktop/
   - Install and restart your computer

2. **Clone/Download Project**
   - Extract the Skylink NVR files to a folder (e.g., `C:\SkyLinkNvr`)
   - Open Command Prompt or PowerShell in that folder

3. **Configure Environment**
   ```cmd
   copy .env.example .env
   notepad .env
   ```
   
   Edit the `.env` file with your database settings (you can use Neon DB for cloud database)

4. **Deploy with Docker**
   
   **For Host Network Mode (Required for Camera Discovery):**
   ```cmd
   docker-compose -f docker-compose.host.yml up --build
   ```
   
   **For Bridge Network Mode (Limited camera features):**
   ```cmd
   docker-compose up --build
   ```

## Host Network Mode vs Bridge Network Mode

### Host Network Mode (Recommended for NVR)
- **Use when**: You need full camera discovery and network scanning
- **Pros**: Can discover cameras on your network, full NVR functionality
- **Cons**: Less network isolation
- **Command**: `docker-compose -f docker-compose.host.yml up --build`

### Bridge Network Mode
- **Use when**: Security is more important than camera discovery
- **Pros**: Better network isolation
- **Cons**: Cannot automatically discover cameras, limited NVR features
- **Command**: `docker-compose up --build`

## Windows-Specific Configuration

### Docker Desktop Settings
1. Open Docker Desktop
2. Go to Settings → Resources → WSL Integration
3. Enable integration with your default WSL distro (if using WSL)
4. Allocate sufficient memory (4GB+ recommended)

### Firewall Configuration
If camera discovery isn't working:

1. **Windows Defender Firewall**
   - Open Windows Security → Firewall & network protection
   - Click "Allow an app through firewall"
   - Add Docker Desktop and allow both Private and Public networks

2. **Port Access**
   - Default app port: 5000
   - Database port: 5432 (if using local PostgreSQL)
   - Camera ports: 80, 554, 8080 (varies by camera)

### Network Discovery Troubleshooting

If cameras aren't being discovered:

1. **Check Network Adapter**
   ```cmd
   ipconfig /all
   ```
   Make sure your network adapter is active and has an IP in the same range as your cameras

2. **Test Camera Access**
   ```cmd
   ping 10.0.0.21
   telnet 10.0.0.21 80
   ```

3. **Docker Network Check**
   ```cmd
   docker network ls
   docker network inspect host
   ```

## Production Deployment

### Using Docker Compose
Create a production docker-compose file:

```yaml
version: '3.8'
services:
  skylink-nvr:
    build: .
    network_mode: host
    volumes:
      - ./recordings:/app/recordings
      - ./config:/app/config
      - /etc/localtime:/etc/localtime:ro
    environment:
      - NODE_ENV=production
      - DATABASE_URL=your_database_url
    restart: unless-stopped
    depends_on:
      - postgres
      
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=skylink_nvr
      - POSTGRES_USER=skylink
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

### As Windows Service
1. Install Docker Desktop
2. Set Docker to start automatically
3. Use Task Scheduler to run docker-compose on system startup:
   ```cmd
   schtasks /create /tn "Skylink NVR" /tr "docker-compose -f docker-compose.host.yml up" /sc onstart /ru SYSTEM
   ```

## Accessing the Application

Once running, access the application at:
- **Local**: http://localhost:5000
- **Network**: http://YOUR_COMPUTER_IP:5000

## Common Issues

### "Docker daemon not running"
- Start Docker Desktop
- Wait for the Docker icon to show "Running" status

### "Port already in use"
- Change the port in docker-compose.yml
- Or stop the conflicting service: `netstat -ano | findstr :5000`

### "Cannot discover cameras"
- Ensure you're using host network mode
- Check Windows Firewall settings
- Verify cameras are on the same network segment

### Database connection issues
- For local PostgreSQL: Ensure the service is running in Windows Services
- For Neon DB: Check your connection string and network access