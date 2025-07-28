#!/bin/bash

# Skylink Enterprise NVR - Docker Deployment Script
# This script helps deploy the NVR system in either host network mode or bridge network mode

set -e

echo "🚀 Skylink Enterprise NVR - Docker Deployment"
echo "=============================================="
echo

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"
echo

# Present deployment options
echo "Choose deployment mode:"
echo
echo "1) Host Network Mode (Recommended for full NVR functionality)"
echo "   ✅ Network discovery for IP cameras"
echo "   ✅ Real host system monitoring (CPU/Memory/Storage)"
echo "   ✅ Direct access to host network interfaces"
echo "   ⚠️  Less network isolation"
echo "   🌐 Access: http://localhost:8080"
echo
echo "2) Bridge Network Mode (Security-focused)"
echo "   ✅ Better network isolation and security"
echo "   ❌ No network discovery (manual camera setup only)"
echo "   ❌ Container stats only (not real host metrics)"
echo "   🌐 Access: http://localhost:5000"
echo
echo "3) Exit"
echo

read -p "Select option (1-3): " choice

case $choice in
    1)
        echo
        echo "🔧 Configuring Host Network Mode..."
        
        # Copy host network configuration
        cp docker-compose.host.yml docker-compose.yml
        echo "✅ Using docker-compose.host.yml configuration"
        
        # Create environment file for host network mode
        if [ ! -f .env ]; then
            cp .env.docker.example .env
            # Configure for host network mode
            sed -i 's/@postgres:5432/@127.0.0.1:5432/g' .env
            sed -i 's/PORT=5000/PORT=8080/g' .env
            echo "✅ Created .env file configured for host network mode"
            echo
            echo "⚙️  Please edit .env file and set your database password:"
            echo "   - POSTGRES_PASSWORD=your_secure_password"
            echo "   - DATABASE_URL is set to 127.0.0.1:5432 for host network mode"
            echo "   - PORT=8080 for host network mode"
            echo
            read -p "Press Enter after you've configured the .env file..."
        else
            echo "✅ Using existing .env file"
            # Ensure correct settings for host network
            sed -i 's/@postgres:5432/@127.0.0.1:5432/g' .env
            sed -i 's/PORT=5000/PORT=8080/g' .env
            echo "✅ Updated .env for host network mode (port 8080)"
        fi
        
        ACCESS_URL="http://localhost:8080"
        ;;
        
    2)
        echo
        echo "🔧 Configuring Bridge Network Mode..."
        
        # docker-compose.yml is already the bridge mode configuration
        echo "✅ Using standard docker-compose.yml configuration"
        
        # Create environment file for bridge network mode  
        if [ ! -f .env ]; then
            cp .env.docker.example .env
            # Configure for bridge network mode
            sed -i 's/@127.0.0.1:5432/@postgres:5432/g' .env
            sed -i 's/PORT=8080/PORT=5000/g' .env
            echo "✅ Created .env file configured for bridge network"
        else
            echo "✅ Using existing .env file"
            # Ensure correct settings for bridge network
            sed -i 's/@127.0.0.1:5432/@postgres:5432/g' .env
            sed -i 's/PORT=8080/PORT=5000/g' .env
            echo "✅ Updated .env for bridge network mode (port 5000)"
        fi
        
        ACCESS_URL="http://localhost:5000"
        ;;
        
    3)
        echo "👋 Exiting deployment script"
        exit 0
        ;;
        
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

echo
echo "🏗️  Building and starting Docker containers..."
echo

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Build and start containers
if docker-compose up -d --build; then
    echo
    echo "✅ Skylink NVR deployed successfully!"
    echo
    echo "📊 Container Status:"
    docker-compose ps
    echo
    echo "🌐 Access your NVR system at: $ACCESS_URL"
    echo
    echo "📋 Useful Commands:"
    echo "   View logs:      docker-compose logs -f"
    echo "   Stop system:    docker-compose down"
    echo "   Restart:        docker-compose restart"
    echo "   Update:         docker-compose up -d --build"
    echo
    echo "📚 For troubleshooting, see: DOCKER_TROUBLESHOOTING.md"
    echo
    
    # Wait a moment for services to start
    echo "⏳ Waiting for services to initialize..."
    sleep 5
    
    # Test if the application is responding
    if curl -s -f "$ACCESS_URL/api/system/health" > /dev/null 2>&1; then
        echo "✅ Application is responding and healthy!"
    else
        echo "⚠️  Application may still be starting up. Check logs with: docker-compose logs -f"
    fi
    
else
    echo
    echo "❌ Deployment failed. Check the error messages above."
    echo "📚 For troubleshooting help, see: DOCKER_TROUBLESHOOTING.md"
    exit 1
fi