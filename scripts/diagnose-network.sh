#!/bin/bash

# Skylink NVR - Network Connectivity Diagnostic Script

echo "=========================================="
echo "🔍 Skylink NVR - Network Diagnostics"
echo "=========================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
fi

# 1. Check if service is running
echo "1. 🔍 Checking service status..."
$SUDO systemctl status skylink-nvr --no-pager -l
echo ""

# 2. Check what's listening on port 5000
echo "2. 🔍 Checking what's listening on port 5000..."
$SUDO netstat -tlnp | grep :5000 || echo "Nothing listening on port 5000"
echo ""

# 3. Check all node processes
echo "3. 🔍 Checking Node.js processes..."
ps aux | grep node | grep -v grep || echo "No Node.js processes found"
echo ""

# 4. Check if port 5000 is available
echo "4. 🔍 Testing port availability..."
if $SUDO lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 5000 is in use by:"
    $SUDO lsof -Pi :5000 -sTCP:LISTEN
else
    echo "Port 5000 is available"
fi
echo ""

# 5. Check firewall status
echo "5. 🔍 Checking firewall status..."
if command -v ufw >/dev/null 2>&1; then
    $SUDO ufw status
elif command -v iptables >/dev/null 2>&1; then
    echo "iptables rules for port 5000:"
    $SUDO iptables -L | grep 5000 || echo "No iptables rules for port 5000"
else
    echo "No firewall detected (ufw/iptables)"
fi
echo ""

# 6. Test local connectivity
echo "6. 🔍 Testing local connectivity..."
if curl -s http://localhost:5000 > /dev/null; then
    echo "✅ localhost:5000 is accessible"
else
    echo "❌ localhost:5000 is NOT accessible"
fi

if curl -s http://127.0.0.1:5000 > /dev/null; then
    echo "✅ 127.0.0.1:5000 is accessible"
else
    echo "❌ 127.0.0.1:5000 is NOT accessible"
fi
echo ""

# 7. Get network interface info
echo "7. 🔍 Network interface information..."
ip addr show | grep -E "(inet |UP|DOWN)" | head -10
echo ""

# 8. Check application logs
echo "8. 🔍 Recent application logs..."
$SUDO journalctl -u skylink-nvr --no-pager -l --since "5 minutes ago" | tail -10
echo ""

# 9. Quick fixes
echo "=========================================="
echo "🛠️  Quick Fixes to Try:"
echo "=========================================="
echo ""
echo "If service is not running:"
echo "  $SUDO systemctl start skylink-nvr"
echo "  $SUDO systemctl enable skylink-nvr"
echo ""
echo "If firewall is blocking:"
echo "  $SUDO ufw allow 5000/tcp"
echo "  $SUDO ufw reload"
echo ""
echo "If port is in use by another process:"
echo "  $SUDO lsof -Pi :5000 -sTCP:LISTEN"
echo "  $SUDO kill <PID>"
echo ""
echo "Manual start for testing:"
echo "  cd /opt/skylink-nvr"
echo "  $SUDO -u skylink npm start"
echo ""
echo "Check if nginx is running instead:"
echo "  $SUDO systemctl status nginx"
echo "  curl http://localhost/"