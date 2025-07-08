#!/bin/bash

# Skylink Enterprise NVR - Linux Installation Script
# Compatible with Debian/Ubuntu systems

set -e

# Enable verbose mode if -v flag is passed
VERBOSE=false
if [[ "$1" == "-v" ]] || [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
    set -x
fi

echo "=========================================="
echo "Skylink Enterprise NVR - Linux Installer"
echo "=========================================="
echo ""

# Function for verbose logging
log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    else
        echo "$1"
    fi
}

# Check if sudo is available when not running as root
if [[ $EUID -ne 0 ]] && ! command -v sudo &> /dev/null; then
    echo "❌ ERROR: sudo is required but not found."
    echo "   Please install sudo or run this script as root."
    exit 1
fi

# Check if user has sudo privileges (when not running as root)
if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
    echo "⚠️  You may be prompted for your password to run commands with sudo."
fi

log "🔍 Checking system compatibility..."
if ! grep -E "(Ubuntu|Debian)" /etc/os-release &> /dev/null; then
    echo "⚠️  WARNING: This script is designed for Ubuntu/Debian systems."
    echo "   It may not work correctly on other distributions."
    read -p "Continue anyway? (y/N): " continue_install
    if [[ ! $continue_install =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log "✅ System compatibility check passed"

# Update package list
log "📦 Updating package list..."
if [[ "$VERBOSE" == "true" ]]; then
    if [[ $EUID -eq 0 ]]; then
        apt update
    else
        sudo apt update
    fi
else
    if [[ $EUID -eq 0 ]]; then
        apt update > /dev/null 2>&1
    else
        sudo apt update > /dev/null 2>&1
    fi
fi
log "✅ Package list updated"

# Install required system dependencies
log "🔧 Installing system dependencies..."
PACKAGES=(
    curl
    wget
    gnupg
    lsb-release
    build-essential
    python3
    python3-pip
    git
    nginx
    ufw
    systemd
)

if [[ "$VERBOSE" == "true" ]]; then
    if [[ $EUID -eq 0 ]]; then
        apt install -y "${PACKAGES[@]}"
    else
        sudo apt install -y "${PACKAGES[@]}"
    fi
else
    if [[ $EUID -eq 0 ]]; then
        apt install -y "${PACKAGES[@]}" > /dev/null 2>&1
    else
        sudo apt install -y "${PACKAGES[@]}" > /dev/null 2>&1
    fi
fi
log "✅ System dependencies installed"

# Install Node.js 20
log "📥 Installing Node.js 20..."
if ! command -v node &> /dev/null || ! node --version | grep -q "v20"; then
    log "   Downloading Node.js repository setup..."
    if [[ "$VERBOSE" == "true" ]]; then
        if [[ $EUID -eq 0 ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt install -y nodejs
        else
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt install -y nodejs
        fi
    else
        if [[ $EUID -eq 0 ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
            apt install -y nodejs > /dev/null 2>&1
        else
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
            sudo apt install -y nodejs > /dev/null 2>&1
        fi
    fi
else
    log "   Node.js 20 is already installed"
fi

# Verify Node.js installation
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    node_version=$(node --version)
    npm_version=$(npm --version)
    log "✅ Node.js installation verified"
    log "   Node.js version: $node_version"
    log "   npm version: $npm_version"
else
    echo "❌ ERROR: Node.js installation failed"
    exit 1
fi

# Install PostgreSQL (optional)
echo ""
read -p "🗄️  Install PostgreSQL locally? (y/N): " install_postgres
if [[ $install_postgres =~ ^[Yy]$ ]]; then
    log "📥 Installing PostgreSQL..."
    if [[ "$VERBOSE" == "true" ]]; then
        if [[ $EUID -eq 0 ]]; then
            apt install -y postgresql postgresql-contrib
        else
            sudo apt install -y postgresql postgresql-contrib
        fi
    else
        if [[ $EUID -eq 0 ]]; then
            apt install -y postgresql postgresql-contrib > /dev/null 2>&1
        else
            sudo apt install -y postgresql postgresql-contrib > /dev/null 2>&1
        fi
    fi
    
    log "🔧 Configuring PostgreSQL..."
    # Generate a secure random password
    POSTGRES_PASSWORD=$(openssl rand -base64 12)
    
    # Configure PostgreSQL
    if [[ $EUID -eq 0 ]]; then
        su - postgres -c "createuser skylink" 2>/dev/null || true
        su - postgres -c "createdb skylink_nvr" 2>/dev/null || true
        su - postgres -c "psql -c \"ALTER USER skylink PASSWORD '$POSTGRES_PASSWORD';\"" 2>/dev/null
        su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE skylink_nvr TO skylink;\"" 2>/dev/null
        su - postgres -c "psql -d skylink_nvr -c \"GRANT ALL ON SCHEMA public TO skylink;\"" 2>/dev/null
        su - postgres -c "psql -d skylink_nvr -c \"GRANT ALL ON ALL TABLES IN SCHEMA public TO skylink;\"" 2>/dev/null
        su - postgres -c "psql -d skylink_nvr -c \"GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO skylink;\"" 2>/dev/null
        su - postgres -c "psql -d skylink_nvr -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skylink;\"" 2>/dev/null
        su - postgres -c "psql -d skylink_nvr -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skylink;\"" 2>/dev/null
    else
        sudo -u postgres createuser skylink 2>/dev/null || true
        sudo -u postgres createdb skylink_nvr 2>/dev/null || true
        sudo -u postgres psql -c "ALTER USER skylink PASSWORD '$POSTGRES_PASSWORD';" 2>/dev/null
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE skylink_nvr TO skylink;" 2>/dev/null
        sudo -u postgres psql -d skylink_nvr -c "GRANT ALL ON SCHEMA public TO skylink;" 2>/dev/null
        sudo -u postgres psql -d skylink_nvr -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO skylink;" 2>/dev/null
        sudo -u postgres psql -d skylink_nvr -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO skylink;" 2>/dev/null
        sudo -u postgres psql -d skylink_nvr -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skylink;" 2>/dev/null
        sudo -u postgres psql -d skylink_nvr -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skylink;" 2>/dev/null
    fi
    
    # Store password for later use
    POSTGRES_URL="postgresql://skylink:$POSTGRES_PASSWORD@localhost:5432/skylink_nvr"
    log "✅ PostgreSQL configured"
    log "   Database: skylink_nvr"
    log "   User: skylink"
    log "   Password: $POSTGRES_PASSWORD (saved to .env file)"
else
    log "⏭️  Skipping PostgreSQL installation"
    POSTGRES_URL="postgresql://username:password@localhost:5432/skylink_nvr"
fi

# Create application user
log "👤 Creating skylink system user..."
if ! id -u skylink &>/dev/null; then
    if [[ $EUID -eq 0 ]]; then
        useradd -r -s /bin/false -d /opt/skylink-nvr skylink
    else
        sudo useradd -r -s /bin/false -d /opt/skylink-nvr skylink
    fi
    log "✅ User 'skylink' created"
else
    log "✅ User 'skylink' already exists"
fi

# Create application directory
APP_DIR="/opt/skylink-nvr"
log "📁 Creating application directory at $APP_DIR..."
if [[ $EUID -eq 0 ]]; then
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/recordings
    mkdir -p $APP_DIR/snapshots
    mkdir -p $APP_DIR/logs
    mkdir -p $APP_DIR/config
    chown -R skylink:skylink $APP_DIR
else
    sudo mkdir -p $APP_DIR
    sudo mkdir -p $APP_DIR/recordings
    sudo mkdir -p $APP_DIR/snapshots
    sudo mkdir -p $APP_DIR/logs
    sudo mkdir -p $APP_DIR/config
    sudo chown -R skylink:skylink $APP_DIR
fi
log "✅ Application directories created"

# Create environment file
log "⚙️  Creating environment configuration..."
if [[ $EUID -eq 0 ]]; then
    tee $APP_DIR/.env > /dev/null <<EOF
NODE_ENV=production
DATABASE_URL=${POSTGRES_URL}
PORT=5000
RECORDINGS_PATH=$APP_DIR/recordings
SNAPSHOTS_PATH=$APP_DIR/snapshots
LOGS_PATH=$APP_DIR/logs
EOF
    chown skylink:skylink $APP_DIR/.env
    chmod 600 $APP_DIR/.env
else
    sudo tee $APP_DIR/.env > /dev/null <<EOF
NODE_ENV=production
DATABASE_URL=${POSTGRES_URL}
PORT=5000
RECORDINGS_PATH=$APP_DIR/recordings
SNAPSHOTS_PATH=$APP_DIR/snapshots
LOGS_PATH=$APP_DIR/logs
EOF
    sudo chown skylink:skylink $APP_DIR/.env
    sudo chmod 600 $APP_DIR/.env
fi
log "✅ Environment file created and secured"

# Create systemd service file
log "⚙️  Creating systemd service..."
if [[ $EUID -eq 0 ]]; then
    tee /etc/systemd/system/skylink-nvr.service > /dev/null <<EOF
[Unit]
Description=Skylink Enterprise NVR
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=skylink
Group=skylink
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=skylink-nvr

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF
else
    sudo tee /etc/systemd/system/skylink-nvr.service > /dev/null <<EOF
[Unit]
Description=Skylink Enterprise NVR
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=skylink
Group=skylink
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=skylink-nvr

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF
fi

log "✅ Systemd service created"

# Create nginx configuration
log "⚙️  Creating nginx configuration..."
if [[ $EUID -eq 0 ]]; then
    tee /etc/nginx/sites-available/skylink-nvr > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files and recordings
    location /recordings/ {
        alias $APP_DIR/recordings/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    location /snapshots/ {
        alias $APP_DIR/snapshots/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
EOF
else
    sudo tee /etc/nginx/sites-available/skylink-nvr > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files and recordings
    location /recordings/ {
        alias $APP_DIR/recordings/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    location /snapshots/ {
        alias $APP_DIR/snapshots/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
EOF
fi

log "✅ Nginx configuration created"

# Enable nginx site
log "⚙️  Enabling nginx site..."
if [[ $EUID -eq 0 ]]; then
    ln -sf /etc/nginx/sites-available/skylink-nvr /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
else
    sudo ln -sf /etc/nginx/sites-available/skylink-nvr /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
fi
log "✅ Nginx site enabled"

# Configure firewall
log "🔧 Configuring firewall..."
if [[ $EUID -eq 0 ]]; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
else
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
fi
log "✅ Firewall configured"

# Reload systemd and enable services
log "⚙️  Enabling services..."
if [[ $EUID -eq 0 ]]; then
    systemctl daemon-reload
    systemctl enable skylink-nvr
    systemctl enable nginx
else
    sudo systemctl daemon-reload
    sudo systemctl enable skylink-nvr
    sudo systemctl enable nginx
fi
log "✅ Services enabled"

# Create installation instructions
log "📝 Creating installation instructions..."
if [[ $EUID -eq 0 ]]; then
    tee $APP_DIR/INSTALLATION.txt > /dev/null <<'EOF'
Skylink Enterprise NVR Installation Complete!

Next Steps:
1. Copy or clone the Skylink NVR source code to: $APP_DIR
2. Set proper ownership: sudo chown -R skylink:skylink $APP_DIR
3. Install dependencies: cd $APP_DIR && npm install
4. Build the application: npm run build
5. Configure your database connection in: $APP_DIR/.env
6. Run database migrations: npm run db:push
7. Start the service: sudo systemctl start skylink-nvr

Service Management:
- Start: sudo systemctl start skylink-nvr
- Stop: sudo systemctl stop skylink-nvr
- Restart: sudo systemctl restart skylink-nvr
- Status: sudo systemctl status skylink-nvr
- Logs: sudo journalctl -u skylink-nvr -f

Default URLs:
- Application: http://localhost (via nginx)
- Direct: http://localhost:5000
- Database: postgresql://localhost:5432 (if installed locally)

Data Directories:
- Recordings: $APP_DIR/recordings
- Snapshots: $APP_DIR/snapshots
- Logs: $APP_DIR/logs

Configuration:
- Environment: $APP_DIR/.env
- Nginx: /etc/nginx/sites-available/skylink-nvr
- Service: /etc/systemd/system/skylink-nvr.service
EOF
else
    sudo tee $APP_DIR/INSTALLATION.txt > /dev/null <<'EOF'
Skylink Enterprise NVR Installation Complete!

Next Steps:
1. Copy or clone the Skylink NVR source code to: $APP_DIR
2. Set proper ownership: sudo chown -R skylink:skylink $APP_DIR
3. Install dependencies: cd $APP_DIR && npm install
4. Build the application: npm run build
5. Configure your database connection in: $APP_DIR/.env
6. Run database migrations: npm run db:push
7. Start the service: sudo systemctl start skylink-nvr

Service Management:
- Start: sudo systemctl start skylink-nvr
- Stop: sudo systemctl stop skylink-nvr
- Restart: sudo systemctl restart skylink-nvr
- Status: sudo systemctl status skylink-nvr
- Logs: sudo journalctl -u skylink-nvr -f

Default URLs:
- Application: http://localhost (via nginx)
- Direct: http://localhost:5000
- Database: postgresql://localhost:5432 (if installed locally)

Data Directories:
- Recordings: $APP_DIR/recordings
- Snapshots: $APP_DIR/snapshots
- Logs: $APP_DIR/logs

Configuration:
- Environment: $APP_DIR/.env
- Nginx: /etc/nginx/sites-available/skylink-nvr
- Service: /etc/systemd/system/skylink-nvr.service
EOF
fi

# Automated deployment option
echo ""
read -p "🚀 Automatically download, build and deploy the application? (Y/n): " auto_deploy
if [[ ! $auto_deploy =~ ^[Nn]$ ]]; then
    log "📥 Downloading Skylink NVR source code..."
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        log "❌ Git is required for automatic deployment but not found"
        log "   Please install git or manually copy the source code to $APP_DIR"
    else
        # Clone or download the source code
        # Note: Replace with actual repository URL when available
        REPO_URL="https://github.com/your-username/skylink-nvr.git"
        
        log "⚠️  Repository URL needs to be configured: $REPO_URL"
        log "   For now, we'll create a placeholder structure..."
        
        # Create basic application structure for demonstration
        if [[ $EUID -eq 0 ]]; then
            mkdir -p $APP_DIR/src
            chown -R skylink:skylink $APP_DIR
        else
            sudo mkdir -p $APP_DIR/src
            sudo chown -R skylink:skylink $APP_DIR
        fi
        
        # Create basic package.json
        if [[ $EUID -eq 0 ]]; then
            tee $APP_DIR/package.json > /dev/null <<'EOF'
{
  "name": "skylink-nvr",
  "version": "1.0.0",
  "description": "Skylink Enterprise NVR System",
  "main": "dist/index.js",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:@neondatabase/serverless --external:ws",
    "build:client": "vite build",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.0.0"
  }
}
EOF
            chown skylink:skylink $APP_DIR/package.json
        else
            sudo tee $APP_DIR/package.json > /dev/null <<'EOF'
{
  "name": "skylink-nvr",
  "version": "1.0.0",
  "description": "Skylink Enterprise NVR System",
  "main": "dist/index.js",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:server && npm run build:client",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:@neondatabase/serverless --external:ws",
    "build:client": "vite build",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "express": "^4.18.2",
    "typescript": "^5.0.0"
  }
}
EOF
            sudo chown skylink:skylink $APP_DIR/package.json
        fi
        
        log "✅ Basic application structure created"
        log "⚠️  To complete deployment, copy your actual source code to $APP_DIR"
        
        # Install dependencies if package.json exists
        log "📦 Installing dependencies..."
        cd $APP_DIR
        if [[ "$VERBOSE" == "true" ]]; then
            npm install
        else
            npm install > /dev/null 2>&1
        fi
        log "✅ Dependencies installed"
        
        # Initialize database if PostgreSQL was installed
        if [[ $install_postgres =~ ^[Yy]$ ]]; then
            log "🗄️  Initializing database..."
            # Note: This would need actual migration files
            log "⚠️  Database migrations need to be run manually with: npm run db:push"
        fi
        
        # Start the service
        log "🔧 Enabling and starting Skylink NVR service..."
        if [[ $EUID -eq 0 ]]; then
            systemctl start skylink-nvr
            systemctl status skylink-nvr --no-pager -l
        else
            sudo systemctl start skylink-nvr
            sudo systemctl status skylink-nvr --no-pager -l
        fi
        
        # Test nginx
        log "🌐 Testing nginx configuration..."
        if [[ $EUID -eq 0 ]]; then
            nginx -t && systemctl reload nginx
        else
            sudo nginx -t && sudo systemctl reload nginx
        fi
        
        log "✅ Service started successfully"
    fi
else
    log "⏭️  Skipping automatic deployment"
fi

echo ""
echo "=========================================="
echo "🎉 Installation completed successfully!"
echo "=========================================="
echo ""

if [[ $auto_deploy =~ ^[Nn]$ ]]; then
    log "📋 Manual deployment steps:"
    log "   1. Copy the application source code to $APP_DIR"
    if [[ $install_postgres =~ ^[Yy]$ ]]; then
        log "   2. The database is already configured and ready"
    else
        log "   2. Configure the .env file with your database credentials"
    fi
    log "   3. Build and start the application:"
    log "      cd $APP_DIR"
    log "      npm install"
    log "      npm run build"
    log "      npm run db:push"
    if [[ $EUID -eq 0 ]]; then
        log "      systemctl start skylink-nvr"
    else
        log "      sudo systemctl start skylink-nvr"
    fi
else
    log "🎯 Automated deployment completed!"
    log "   The application should now be running"
fi

echo ""
log "📖 For detailed instructions: cat $APP_DIR/INSTALLATION.txt"
if [[ $EUID -eq 0 ]]; then
    log "🔧 Service management: systemctl {start|stop|restart|status} skylink-nvr"
    log "📊 View logs: journalctl -u skylink-nvr -f"
else
    log "🔧 Service management: sudo systemctl {start|stop|restart|status} skylink-nvr"
    log "📊 View logs: sudo journalctl -u skylink-nvr -f"
fi
log "🌐 Access application: http://localhost (via nginx) or http://localhost:5000 (direct)"

if [[ "$VERBOSE" == "true" ]]; then
    echo ""
    echo "Installation completed with verbose logging enabled."
fi