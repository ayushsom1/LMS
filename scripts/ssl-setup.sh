#!/bin/bash
set -euo pipefail

# ============================================================
# SSL Certificate Setup with Let's Encrypt
# Usage: ./scripts/ssl-setup.sh yourdomain.com
# ============================================================

DOMAIN=${1:?"Usage: $0 <domain>"}

echo "=== Setting up SSL for $DOMAIN ==="

# Stop nginx temporarily
docker compose stop nginx 2>/dev/null || true

# Get certificate
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "admin@${DOMAIN}" \
  -d "$DOMAIN"

# Copy certs to nginx volume
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./nginx/ssl/privkey.pem
sudo chown $USER:$USER ./nginx/ssl/*.pem

# Update nginx config for SSL
cat > ./nginx/nginx.conf <<NGINXEOF
events {
    worker_connections 2048;
}

http {
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone \$binary_remote_addr zone=submit:10m rate=2r/s;
    limit_req_zone \$binary_remote_addr zone=run_code:10m rate=5r/s;

    upstream nextjs {
        server app:3000;
        keepalive 64;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name $DOMAIN;
        return 301 https://\$host\$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name $DOMAIN;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        gzip on;
        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

        client_max_body_size 5M;

        location /api/test/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_read_timeout 120s;
        }

        location ~ /api/test/.+/submit {
            limit_req zone=submit burst=3 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_read_timeout 300s;
        }

        location /api/test/run {
            limit_req zone=run_code burst=5 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_read_timeout 60s;
        }

        location /_next/static {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }

        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
    }
}
NGINXEOF

# Restart nginx
docker compose up -d nginx

# Setup auto-renewal cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ~/lms/nginx/ssl/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ~/lms/nginx/ssl/ && cd ~/lms && docker compose restart nginx") | crontab -

echo ""
echo "SSL setup complete! Your site is now available at https://$DOMAIN"
