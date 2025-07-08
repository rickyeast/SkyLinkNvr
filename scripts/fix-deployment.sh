#!/bin/bash

# Skylink NVR - Quick Fix Script for Deployment Issues
# This script fixes common deployment problems on Linux servers

set -e

APP_DIR="/opt/skylink-nvr"

echo "=========================================="
echo "🔧 Skylink NVR - Deployment Fix Script"
echo "=========================================="

# Fix 1: PostgreSQL Permissions
echo "🗄️  Fixing PostgreSQL permissions..."
sudo -u postgres psql -d skylink_nvr -c "GRANT ALL ON SCHEMA public TO skylink;" 2>/dev/null || true
sudo -u postgres psql -d skylink_nvr -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO skylink;" 2>/dev/null || true
sudo -u postgres psql -d skylink_nvr -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO skylink;" 2>/dev/null || true
sudo -u postgres psql -d skylink_nvr -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skylink;" 2>/dev/null || true
sudo -u postgres psql -d skylink_nvr -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skylink;" 2>/dev/null || true
echo "✅ PostgreSQL permissions fixed"

# Fix 2: Systemd Service File (fix variable expansion)
echo "🔧 Fixing systemd service file..."
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

echo "✅ Systemd service file fixed"

# Fix 3: Reload systemd and permissions
echo "⚙️  Reloading systemd and fixing permissions..."
sudo systemctl daemon-reload
sudo chown -R skylink:skylink $APP_DIR
sudo chmod +x $APP_DIR/dist/index.js 2>/dev/null || true
echo "✅ Permissions and systemd reloaded"

# Fix 4: Test database migration
echo "🗄️  Testing database migration..."
cd $APP_DIR
if sudo -u skylink npm run db:push; then
    echo "✅ Database migration successful"
else
    echo "❌ Database migration failed. Check your DATABASE_URL in .env"
    echo "Current .env file:"
    cat $APP_DIR/.env | grep -v PASSWORD || true
fi

# Fix 5: Open firewall port for external access
echo "🔥 Opening firewall port 5000..."
if command -v ufw >/dev/null 2>&1; then
    sudo ufw allow 5000/tcp
    sudo ufw reload
    echo "✅ Firewall configured for port 5000"
else
    echo "⚠️  UFW not found, firewall may need manual configuration"
fi

# Fix 6: Test service startup
echo "🚀 Testing service startup..."
if sudo systemctl start skylink-nvr; then
    echo "✅ Service started successfully"
    sudo systemctl status skylink-nvr --no-pager -l
    
    # Test network connectivity
    sleep 3
    echo "🔍 Testing network connectivity..."
    if curl -s http://localhost:5000 > /dev/null; then
        echo "✅ Application responding on localhost:5000"
        echo "🌐 Should be accessible from network at: http://$(hostname -I | awk '{print $1}'):5000"
    else
        echo "❌ Application not responding on localhost:5000"
    fi
else
    echo "❌ Service failed to start. Checking logs..."
    sudo journalctl -u skylink-nvr --no-pager -l --since "1 minute ago"
fi

echo ""
echo "=========================================="
echo "🎉 Fix script completed!"
echo "=========================================="
echo ""
echo "Service commands:"
echo "  Status: sudo systemctl status skylink-nvr"
echo "  Restart: sudo systemctl restart skylink-nvr"
echo "  Logs: sudo journalctl -u skylink-nvr -f"
echo ""
echo "Access your application:"
echo "  http://localhost (via nginx)"
echo "  http://localhost:5000 (direct)"