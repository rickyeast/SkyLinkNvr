#!/bin/bash

# Skylink NVR - Fresh Docker Build Script
# This script performs a clean build without affecting other Docker containers/volumes

set -e  # Exit on any error

echo "=========================================="
echo "Skylink NVR - Fresh Docker Build"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    print_error "docker compose not available. Please install Docker Compose V2."
    exit 1
fi

print_status "Starting fresh Docker build for Skylink NVR..."

# Stop and remove only Skylink NVR containers (preserves other applications)
print_status "Stopping Skylink NVR containers..."
docker compose -f docker-compose.host.yml down 2>/dev/null || true
docker compose down 2>/dev/null || true

print_success "Skylink NVR containers stopped"

# Remove only Skylink NVR images (not other application images)
print_status "Removing old Skylink NVR images..."
SKYLINK_IMAGES=$(docker images --filter=reference="*skylink*" --filter=reference="*nvr*" -q)
if [ ! -z "$SKYLINK_IMAGES" ]; then
    docker rmi $SKYLINK_IMAGES 2>/dev/null || true
    print_success "Old Skylink NVR images removed"
else
    print_warning "No old Skylink NVR images found"
fi

# Clean Docker build cache (only for this build)
print_status "Cleaning Docker build cache..."
docker builder prune -f

print_success "Docker build cache cleaned"

# Determine which compose file to use
COMPOSE_FILE="docker-compose.host.yml"
if [ "$1" = "bridge" ]; then
    COMPOSE_FILE="docker-compose.yml"
    print_status "Using bridge network mode"
else
    print_status "Using host network mode (recommended for NVR)"
fi

# Build with no cache
print_status "Building Skylink NVR with no cache..."
docker compose -f $COMPOSE_FILE build --no-cache --pull

print_success "Fresh build completed successfully"

# Start the services
print_status "Starting Skylink NVR services..."
docker compose -f $COMPOSE_FILE up -d

print_success "Services started"

# Wait for services to initialize
print_status "Waiting for services to initialize..."
sleep 10

# Check service health
print_status "Checking service health..."
RETRIES=30
HEALTH_URL="http://localhost:8080/api/system/health"
if [ "$COMPOSE_FILE" = "docker-compose.yml" ]; then
    HEALTH_URL="http://localhost:5000/api/system/health"
fi

for i in $(seq 1 $RETRIES); do
    if curl -f $HEALTH_URL > /dev/null 2>&1; then
        print_success "Skylink NVR is healthy and ready!"
        echo
        echo "=========================================="
        echo "🎉 Deployment Summary"
        echo "=========================================="
        echo "✓ Fresh Docker build completed"
        echo "✓ All services are running"
        echo "✓ Health check passed"
        echo
        if [ "$COMPOSE_FILE" = "docker-compose.host.yml" ]; then
            echo "🌐 Web Interface: http://localhost:8080"
            echo "🔧 API Endpoint: http://localhost:8080/api"
        else
            echo "🌐 Web Interface: http://localhost:5000"
            echo "🔧 API Endpoint: http://localhost:5000/api"
        fi
        echo "📊 System Health: $HEALTH_URL"
        echo
        echo "To view logs: docker compose -f $COMPOSE_FILE logs -f"
        echo "To stop: docker compose -f $COMPOSE_FILE down"
        echo "=========================================="
        exit 0
    fi
    
    print_warning "Waiting for services to start... ($i/$RETRIES)"
    sleep 5
done

print_error "Health check failed after $((RETRIES * 5)) seconds"
print_status "Showing container status and logs for troubleshooting..."

echo
echo "Container Status:"
docker compose -f $COMPOSE_FILE ps

echo
echo "Recent Logs:"
docker compose -f $COMPOSE_FILE logs --tail=50

exit 1