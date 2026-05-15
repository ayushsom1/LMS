#!/bin/bash
set -euo pipefail

# ============================================================
# Server Setup Script — Run this on the EC2 instance
# SSH into your EC2 first, then run this script
# ============================================================

echo "=== LMS Server Setup ==="

# ──────────────────────────────────────────
# Step 1: Install dependencies
# ──────────────────────────────────────────
echo "[1/5] Installing dependencies..."
sudo apt-get update -y
sudo apt-get install -y \
  docker.io \
  docker-compose-plugin \
  git \
  certbot \
  awscli \
  htop \
  curl

# Install Docker Compose standalone (for docker-compose command)
if ! command -v docker-compose &> /dev/null; then
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# ──────────────────────────────────────────
# Step 2: Configure Docker
# ──────────────────────────────────────────
echo "[2/5] Configuring Docker..."
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"

# ──────────────────────────────────────────
# Step 3: Configure system limits for Judge0 and 2000 concurrent connections
# ──────────────────────────────────────────
echo "[3/5] Configuring system limits..."
sudo tee /etc/sysctl.d/99-judge0.conf > /dev/null <<EOF
# Judge0 sandboxed code execution requirements
vm.max_map_count=262144
kernel.dmesg_restrict=0

# Network tuning for 2000 concurrent student connections
# Default somaxconn=128 causes connection drops during exam start rush
net.core.somaxconn=65535
net.core.netdev_max_backlog=65535
net.ipv4.tcp_max_syn_backlog=65535
net.ipv4.ip_local_port_range=1024 65535
net.ipv4.tcp_tw_reuse=1
net.ipv4.tcp_fin_timeout=15
net.ipv4.tcp_keepalive_time=300
net.ipv4.tcp_keepalive_intvl=30
net.ipv4.tcp_keepalive_probes=5
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.tcp_rmem=4096 87380 67108864
net.ipv4.tcp_wmem=4096 65536 67108864

# File descriptor limit — 2000 connections × multiple FDs per connection
fs.file-max=200000

# Reduce swap aggressiveness — server apps should use swap as last resort only
vm.swappiness=10
vm.dirty_ratio=15
vm.dirty_background_ratio=5
EOF
sudo sysctl --system

# Set ulimits for the ubuntu user (Docker runs as this user)
sudo tee /etc/security/limits.d/99-lms.conf > /dev/null <<EOF
ubuntu soft nofile 65535
ubuntu hard nofile 65535
root   soft nofile 65535
root   hard nofile 65535
EOF

# ──────────────────────────────────────────
# Step 4: Setup swap (needed for t3.large under heavy load)
# ──────────────────────────────────────────
echo "[4/5] Setting up swap space..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# ──────────────────────────────────────────
# Step 5: Setup log rotation for Docker
# ──────────────────────────────────────────
echo "[5/5] Configuring Docker log rotation..."
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Hard": 65535,
      "Name": "nofile",
      "Soft": 65535
    }
  },
  "live-restore": true
}
EOF
sudo systemctl restart docker

echo ""
echo "============================================================"
echo "  Server setup complete!"
echo "============================================================"
echo ""
echo "  Next steps:"
echo "  1. Clone your repo:  git clone <repo-url> ~/lms && cd ~/lms"
echo "  2. Create .env:      cp .env.production.example .env.production"
echo "  3. Edit .env:         nano .env.production"
echo "  4. Start services:   docker compose up -d"
echo "  5. Check status:     docker compose ps"
echo "  6. View logs:        docker compose logs -f app"
echo ""
echo "  NOTE: Log out and back in for Docker group to take effect"
echo "============================================================"
