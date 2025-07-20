#!/bin/bash

echo "Testing Docker Configuration for Skylink NVR"
echo "============================================"

# Stop any running containers
echo "Stopping any existing containers..."
docker-compose down 2>/dev/null || true

# Check if port 5000 is in use
echo "Checking port 5000 availability..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 5000 is already in use. Stopping development server first."
    echo "Please stop any running development servers and run this script again."
    exit 1
fi

# Set up environment for testing
echo "Setting up test environment..."
if [ ! -f .env ]; then
    cp .env.docker.example .env
    echo "Created .env file for testing"
fi

# Test host network mode
echo "Testing Host Network Mode Configuration..."
cp docker-compose.host.yml docker-compose.yml

# Update .env for host network mode if it exists
if [ -f .env ]; then
    echo "Updating .env for host network mode..."
    sed -i 's/@postgres:5432/@127.0.0.1:5432/g' .env
fi

echo "Building and starting containers..."
if docker-compose up -d --build; then
    echo "Containers started. Waiting for services to be ready..."
    sleep 10
    
    echo "Testing service availability..."
    
    # Check if the container is running
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Containers are running"
        
        # Test if the API is accessible
        echo "Testing API endpoint..."
        if curl -f -s http://127.0.0.1:8080/api/system/health > /dev/null; then
            echo "✅ API is responding at http://127.0.0.1:8080"
            echo "✅ Host network mode is working correctly!"
            echo
            echo "You can now access the NVR at: http://localhost:8080"
        else
            echo "❌ API is not responding. Checking logs..."
            docker-compose logs skylink-nvr | tail -20
        fi
    else
        echo "❌ Containers failed to start. Checking logs..."
        docker-compose logs
    fi
    
    echo
    echo "Current container status:"
    docker-compose ps
    
else
    echo "❌ Failed to start containers"
    docker-compose logs
fi

echo
echo "To stop the test containers, run: docker-compose down"