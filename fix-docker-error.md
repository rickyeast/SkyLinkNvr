# Fix for Docker Database Connection Error

## Problem
The application was trying to use Neon Database WebSocket connections even when running with local PostgreSQL in Docker, causing this error:
```
Failed to initialize scheduled recordings: Error: All attempts to open a WebSocket to connect to the database failed
```

## Root Cause
- The database configuration was hardcoded to use Neon Database drivers
- Local PostgreSQL databases don't support WebSocket connections
- The application needed to detect the database type and use the appropriate driver

## Solution Applied

### 1. Smart Database Driver Detection
Updated `server/db.ts` to automatically detect database type:
- **Local PostgreSQL**: Uses standard `pg` driver when URL contains `localhost`, `127.0.0.1`, or `postgres:`
- **Neon Database**: Uses Neon serverless driver for cloud databases

### 2. Fixed Environment Configuration
- Updated `.env.docker.example` with proper PostgreSQL connection strings
- Added comments explaining the difference between host and bridge network modes

### 3. Steps to Fix Your Docker Deployment

**Option 1: Rebuild with Fixed Configuration**
```bash
# Stop current containers
docker-compose down

# Ensure you have the correct .env file
cp .env.docker.example .env
# Edit .env and set: POSTGRES_PASSWORD=your_secure_password

# Rebuild and restart
docker-compose up -d --build
```

**Option 2: Use the Deploy Script**
```bash
# Use the automated deployment script
./deploy.sh
# Choose option 1 (Host Network Mode)
# Set your database password when prompted
```

### 4. Verify the Fix
After deployment, check the logs:
```bash
docker-compose logs -f skylink-nvr
```

You should see:
```
serving on port 8080
Initialized scheduled recordings for X cameras
```

Instead of WebSocket connection errors.

### 5. Environment Variables to Check
Make sure your `.env` file has:
```env
# For Host Network Mode
DATABASE_URL=postgresql://skylink:your_password@127.0.0.1:5432/skylink_nvr
NODE_ENV=production
PORT=8080
POSTGRES_PASSWORD=your_password
```

## Expected Result
- No more WebSocket connection errors
- Application connects properly to local PostgreSQL
- All API endpoints work correctly: `/api/system/health`, `/api/cameras`, etc.
- Network discovery and host system monitoring work in host network mode

The application will now automatically use the correct database driver based on your connection string, eliminating the WebSocket connection issues with local PostgreSQL databases.