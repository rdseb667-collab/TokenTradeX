# TokenTradeX - Deployment Guide

## 🚀 Production Deployment Checklist

### Prerequisites
- Domain name (e.g., tokentradex.com)
- SSL certificate (Let's Encrypt or paid)
- Cloud provider account (AWS, DigitalOcean, or Google Cloud)
- PostgreSQL database (managed service recommended)

---

## Option 1: DigitalOcean (Recommended for MVP)

### Cost: ~$50-100/month

### Step 1: Create Droplet
```bash
# Choose:
- Ubuntu 22.04 LTS
- Basic plan: $24/month (2 GB RAM, 2 vCPUs, 60 GB SSD)
- Datacenter: Closest to target users
- Enable monitoring
```

### Step 2: Initial Server Setup
```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt install -y git
```

### Step 3: Setup PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE tokentradex;
CREATE USER tokentradex WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE tokentradex TO tokentradex;
\q
```

### Step 4: Deploy Application
```bash
# Clone repository
cd /var/www
git clone https://github.com/yourusername/TokenTradeX.git
cd TokenTradeX

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Configure environment
cd backend
cp .env.example .env
nano .env
# Update with production values:
# - DB credentials
# - JWT secrets (use: openssl rand -base64 32)
# - Set NODE_ENV=production
```

### Step 5: Build Frontend
```bash
cd /var/www/TokenTradeX/frontend
npm run build
# Build output will be in frontend/dist
```

### Step 6: Setup Nginx
```bash
nano /etc/nginx/sites-available/tokentradex
```

Add configuration:
```nginx
server {
    listen 80;
    server_name tokentradex.com www.tokentradex.com;

    # Frontend
    location / {
        root /var/www/TokenTradeX/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/tokentradex /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 7: Setup SSL with Let's Encrypt
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d tokentradex.com -d www.tokentradex.com

# Auto-renewal (already setup by certbot)
certbot renew --dry-run
```

### Step 8: Start Backend with PM2
```bash
cd /var/www/TokenTradeX/backend

# Run migrations
npm run db:migrate
npm run db:seed

# Start with PM2
pm2 start src/server.js --name tokentradex-api
pm2 startup
pm2 save
```

### Step 9: Setup Firewall
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## Option 2: AWS (Scalable Production)

### Architecture
- **EC2**: Application servers (t3.medium or larger)
- **RDS**: PostgreSQL database (db.t3.small+)
- **S3 + CloudFront**: Static frontend hosting
- **ALB**: Load balancer for backend
- **Route 53**: DNS management

### Cost: ~$150-300/month

### Step 1: Setup RDS PostgreSQL
1. Go to AWS RDS Console
2. Create Database:
   - Engine: PostgreSQL 14+
   - Template: Production
   - DB Instance: db.t3.small (minimum)
   - Storage: 20 GB SSD
   - Enable automated backups
   - Multi-AZ for production
3. Note connection details

### Step 2: Launch EC2 Instance
1. AMI: Ubuntu 22.04 LTS
2. Instance type: t3.medium (2 vCPU, 4 GB RAM)
3. Configure security group:
   - Port 22 (SSH) - Your IP only
   - Port 3000 (API) - Load balancer only
4. Add key pair
5. Launch instance

### Step 3: Deploy Backend to EC2
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@ec2-ip-address

# Install dependencies (same as DigitalOcean steps 2-4)
# Update backend/.env with RDS connection string
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=tokentradex
DB_USER=postgres
DB_PASSWORD=your-rds-password
```

### Step 4: Deploy Frontend to S3
```bash
# Build frontend
cd frontend
npm run build

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Create S3 bucket
aws s3 mb s3://tokentradex-frontend

# Upload build
aws s3 sync dist/ s3://tokentradex-frontend --delete

# Enable static website hosting
aws s3 website s3://tokentradex-frontend --index-document index.html
```

### Step 5: Setup CloudFront
1. Create CloudFront distribution
2. Origin: S3 bucket
3. Viewer Protocol: Redirect HTTP to HTTPS
4. Custom SSL certificate (ACM)
5. Alternate domain: tokentradex.com

### Step 6: Setup Application Load Balancer
1. Create ALB in EC2 Console
2. Configure listeners (HTTP:80, HTTPS:443)
3. Target group: EC2 instance port 3000
4. Health check: /health
5. SSL certificate from ACM

---

## Environment Variables (Production)

### Backend (.env)
```env
NODE_ENV=production
PORT=3000

# Database (use managed database)
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=tokentradex
DB_USER=tokentradex_prod
DB_PASSWORD=STRONG_RANDOM_PASSWORD

# JWT (generate: openssl rand -base64 32)
JWT_SECRET=YOUR_SECURE_JWT_SECRET_HERE
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=YOUR_REFRESH_SECRET_HERE
JWT_REFRESH_EXPIRE=30d

# CORS (your frontend domain)
CORS_ORIGIN=https://tokentradex.com

# Rate Limiting (stricter in production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Trading
MIN_ORDER_AMOUNT=0.001
MAX_ORDER_AMOUNT=1000000
TRADING_FEE_PERCENT=0.1

# Logging
LOG_LEVEL=info
```

### Frontend (.env)
```env
VITE_API_URL=https://api.tokentradex.com
VITE_WS_URL=wss://api.tokentradex.com
```

---

## Monitoring & Maintenance

### Install Monitoring Tools
```bash
# PM2 monitoring
pm2 install pm2-logrotate

# System monitoring
apt install -y htop iotop

# Database monitoring
apt install -y postgresql-contrib
```

### Setup Log Management
```bash
# PM2 logs
pm2 logs tokentradex-api

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
cd /var/www/TokenTradeX/backend
pm2 logs
```

### Backup Strategy
```bash
# Database backup script
nano /root/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
PGPASSWORD="your-password" pg_dump -h localhost -U tokentradex tokentradex > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /root/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /root/backup-db.sh
```

---

## Security Hardening

### 1. Firewall Configuration
```bash
# UFW (Ubuntu)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. Fail2Ban (Brute Force Protection)
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 3. Secure PostgreSQL
```bash
nano /etc/postgresql/14/main/pg_hba.conf
# Change to:
# local   all   all   md5
# host    all   all   127.0.0.1/32   md5

systemctl restart postgresql
```

### 4. Update Regularly
```bash
# Create update script
nano /root/security-updates.sh
```

```bash
#!/bin/bash
apt update
apt upgrade -y
pm2 update
npm update -g
```

```bash
chmod +x /root/security-updates.sh
# Add to crontab (weekly)
0 3 * * 0 /root/security-updates.sh
```

---

## Performance Optimization

### 1. Enable Nginx Compression
```nginx
# In /etc/nginx/nginx.conf
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 2. Setup Redis Cache (Optional)
```bash
apt install -y redis-server
systemctl enable redis-server

# Update backend to use Redis for sessions
npm install redis connect-redis
```

### 3. Database Optimization
```sql
-- Add indexes (if not already present)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_tokens_symbol ON tokens(symbol);
CREATE INDEX idx_wallets_user_token ON wallets(user_id, token_id);

-- Analyze tables
ANALYZE users;
ANALYZE orders;
ANALYZE tokens;
ANALYZE wallets;
```

---

## Rollback Procedure

```bash
# If deployment fails:

# 1. Stop new version
pm2 stop tokentradex-api

# 2. Restore database (if needed)
psql -U tokentradex tokentradex < /backups/db_YYYYMMDD_HHMMSS.sql

# 3. Checkout previous version
cd /var/www/TokenTradeX
git log --oneline
git checkout <previous-commit-hash>

# 4. Reinstall dependencies
cd backend && npm install

# 5. Restart
pm2 restart tokentradex-api
```

---

## Health Checks

### Automated Monitoring
```bash
# Create health check script
nano /root/health-check.sh
```

```bash
#!/bin/bash
API_URL="https://api.tokentradex.com/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "API health check failed: $RESPONSE"
    # Send alert (email, Slack, etc.)
    # Restart service
    pm2 restart tokentradex-api
fi
```

```bash
chmod +x /root/health-check.sh
# Run every 5 minutes
crontab -e
*/5 * * * * /root/health-check.sh
```

---

## Cost Estimation

### DigitalOcean (Minimum Viable)
| Service | Cost/Month |
|---------|-----------|
| Droplet (2 GB) | $24 |
| Managed PostgreSQL | $15 |
| Backups | $5 |
| Domain | $1 |
| **Total** | **~$45** |

### AWS (Production Scale)
| Service | Cost/Month |
|---------|-----------|
| EC2 (t3.medium) | $35 |
| RDS (db.t3.small) | $30 |
| S3 + CloudFront | $10 |
| ALB | $20 |
| Route 53 | $1 |
| Backups | $10 |
| **Total** | **~$106** |

---

## Next Steps After Deployment

1. **Setup monitoring**: Datadog, New Relic, or Sentry
2. **Configure alerts**: Email, Slack, or PagerDuty
3. **Performance testing**: Load testing with k6 or JMeter
4. **Security scan**: OWASP ZAP or Burp Suite
5. **Documentation**: Update API docs with production URLs
6. **User acceptance testing**: Test with real users
7. **Marketing launch**: Announce to community

---

## Support Contacts

- **Cloud Issues**: Contact provider support
- **SSL Issues**: Let's Encrypt community forum
- **Database Issues**: PostgreSQL documentation
- **Application Issues**: Check logs in PM2

---

**Deployment completed?** Test thoroughly:
- https://tokentradex.com (frontend)
- https://api.tokentradex.com/health (backend)
- WebSocket connections
- User registration & login
- Trading functionality
- Wallet operations

Good luck! 🚀
