#!/bin/bash

# Skylink Enterprise NVR - Linux Installation Script
# Compatible with Debian/Ubuntu systems

set -e

echo "Installing Skylink Enterprise NVR on Linux..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update package list
echo "Updating package list..."
sudo apt update

# Install required system dependencies
echo "Installing system dependencies..."
sudo apt install -y \
    curl \
    wget \
    gnupg \
    lsb-release \
    build-essential \
    python3 \
    python3-pip \
    git \
    nginx \
    ufw \
    systemd

# Install Node.js 20
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
echo "Node.js version: $node_version"
echo "npm version: $npm_version"

# Install PostgreSQL (optional)
read -p "Install PostgreSQL locally? (y/N): " install_postgres
if [[ $install_postgres =~ ^[Yy]$ ]]; then
    echo "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    
    # Configure PostgreSQL
    sudo -u postgres createuser skylink
    sudo -u postgres createdb skylink_nvr
    sudo -u postgres psql -c "ALTER USER skylink PASSWORD 'skylink_secure_pass';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE skylink_nvr TO skylink;"
fi

# Create application user
echo "Creating skylink user..."
sudo useradd -r -s /bin/false -d /opt/skylink-nvr skylink || true

# Create application directory
APP_DIR="/opt/skylink-nvr"
echo "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $APP_DIR/recordings
sudo mkdir -p $APP_DIR/snapshots
sudo mkdir -p $APP_DIR/logs
sudo chown -R skylink:skylink $APP_DIR

# Create environment file
sudo tee $APP_DIR/.env > /dev/null <<EOF
NODE_ENV=production
DATABASE_URL=postgresql://skylink:skylink_secure_pass@localhost:5432/skylink_nvr
PORT=5000
EOF

# Create systemd service file
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

# Create nginx configuration
sudo tee /etc/nginx/sites-available/skylink-nvr > /dev/null <<EOF
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

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/skylink-nvr /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Configure firewall
echo "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Reload systemd and enable services
sudo systemctl daemon-reload
sudo systemctl enable skylink-nvr
sudo systemctl enable nginx

# Create installation instructions
sudo tee $APP_DIR/INSTALLATION.txt > /dev/null <<EOF
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

echo ""
echo "Installation completed successfully!"
echo "Next steps:"
echo "1. Copy the application source code to $APP_DIR"
echo "2. Configure the .env file with your database credentials"
echo "3. Build and start the application"
echo ""
echo "Check $APP_DIR/INSTALLATION.txt for detailed instructions."