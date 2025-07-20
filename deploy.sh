#!/bin/bash

# Skylink NVR Docker Deployment Script
set -e

echo "🚀 Skylink Enterprise NVR Docker Deployment"
echo "=============================================="
echo

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo

# Ask user for deployment mode
echo "Choose deployment mode:"
echo "1) Host Network Mode (Full NVR functionality - Recommended)"
echo "   ✅ Network discovery for IP cameras"
echo "   ✅ Real host system monitoring (CPU/Memory/Storage)"
echo "   ✅ Direct camera access on local network"
echo "   ⚠️  Less network isolation"
echo
echo "2) Bridge Network Mode (Security-focused)"
echo "   ❌ No network discovery (manual camera setup only)"
echo "   ❌ Container stats only"
echo "   ✅ Better security isolation"
echo "   ✅ Standard Docker networking"
echo

read -p "Enter your choice (1 or 2) [default: 1]: " choice
choice=${choice:-1}

if [ "$choice" = "1" ]; then
    echo
    echo "📋 Configuring for Host Network Mode..."
    
    # Copy host network configuration
    cp docker-compose.host.yml docker-compose.yml
    echo "✅ Using docker-compose.host.yml configuration"
    
    # Create environment file for host network mode
    if [ ! -f .env ]; then
        cp .env.docker.example .env
        # Ensure host network database URL
        sed -i 's/@postgres:5432/@127.0.0.1:5432/g' .env
        echo "✅ Created .env file configured for host network mode"
        echo
        echo "⚙️  Please edit .env file and set your database password:"
        echo "   - POSTGRES_PASSWORD=your_secure_password"
        echo "   - DATABASE_URL is set to 127.0.0.1:5432 for host network mode"
        echo
        read -p "Press Enter after you've configured the .env file..."
    else
        echo "✅ Using existing .env file"
        # Ensure correct database URL for host network
        sed -i 's/@postgres:5432/@127.0.0.1:5432/g' .env
        echo "✅ Updated .env for host network mode"
    fi
    
elif [ "$choice" = "2" ]; then
    echo
    echo "📋 Configuring for Bridge Network Mode..."
    
    # docker-compose.yml is already the bridge mode configuration
    echo "✅ Using standard docker-compose.yml configuration"
    
    # Create environment file for bridge network mode  
    if [ ! -f .env ]; then
        cp .env.docker.example .env
        # Modify for bridge network mode
        sed -i 's/@127.0.0.1:5432/@postgres:5432/g' .env
        echo "✅ Created .env file configured for bridge network"
    else
        echo "✅ Using existing .env file"
        # Ensure correct database URL for bridge network
        sed -i 's/@127.0.0.1:5432/@postgres:5432/g' .env
        echo "✅ Updated .env for bridge network mode"
    fi
    
else
    echo "❌ Invalid choice. Please run the script again."
    exit 1
fi

echo
echo "🔧 Building and starting Skylink NVR..."

# Build and start containers
if docker-compose up -d --build; then
    echo
    echo "🎉 Skylink NVR is starting up!"
    echo
    echo "📊 System Status:"
    docker-compose ps
    echo
    echo "🌐 Access your NVR at: http://localhost:5000"
    echo "📄 View logs with: docker-compose logs -f skylink-nvr"
    echo "🔧 Stop with: docker-compose down"
    echo
    
    if [ "$choice" = "1" ]; then
        echo "🔍 Host Network Mode Features:"
        echo "   • Camera discovery: Available at Settings > Camera Discovery"
        echo "   • Real system stats: Visible in Dashboard"
        echo "   • Direct camera access: Can reach cameras on local network"
        echo
        echo "🧪 Test network tools (optional):"
        echo "   docker exec \$(docker-compose ps -q skylink-nvr) nmap --version"
        echo "   docker exec \$(docker-compose ps -q skylink-nvr) ping 8.8.8.8"
    else
        echo "🔒 Bridge Network Mode Features:"
        echo "   • Manual camera setup: Add cameras by IP address manually"
        echo "   • Container isolation: Secure network separation"
        echo "   • Limited monitoring: Container stats only"
    fi
    
    echo
    echo "🛠️  Troubleshooting:"
    echo "   • Check logs: docker-compose logs skylink-nvr"
    echo "   • Restart: docker-compose restart skylink-nvr"
    echo "   • Full reset: docker-compose down && docker-compose up -d"
    
else
    echo "❌ Failed to start Skylink NVR. Check the logs:"
    docker-compose logs skylink-nvr
    exit 1
fi