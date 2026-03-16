# Deployment Guide

This guide covers deploying the Real-Time Chat Moderation System to various platforms.

## 📋 Pre-Deployment Checklist

- [ ] Backend runs successfully locally
- [ ] Frontend runs successfully locally
- [ ] OpenAI API key configured (optional but recommended)
- [ ] Database choice made (PostgreSQL or SQLite)
- [ ] Environment variables documented
- [ ] Dependencies up to date
- [ ] CORS configured for production domain
- [ ] Security review completed

## 🚀 Deployment Options

### Option 1: Railway (Recommended for Beginners)

**Pros**: Easy setup, free tier, automatic deployments  
**Cons**: Limited free tier resources

#### Backend Deployment

1. **Create account** at [railway.app](https://railway.app)

2. **Create new project** and select "Deploy from GitHub repo"

3. **Configure build settings**:
   ```
   Build Command: cd backend && pip install -r requirements.txt
   Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Add environment variables**:
   ```
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   OPENAI_API_KEY=your_openai_key
   PORT=8000
   ```

5. **Deploy**: Railway will automatically build and deploy

6. **Get URL**: Railway provides a public URL (e.g., `your-app.railway.app`)

#### Frontend Deployment

1. **Create another Railway service** for frontend

2. **Configure build settings**:
   ```
   Build Command: cd frontend && npm install && npm run build
   Start Command: cd frontend && npm start
   ```

3. **Add environment variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
   ```

4. **Deploy**: Frontend will be available at Railway URL

---

### Option 2: Render

**Pros**: Generous free tier, easy PostgreSQL setup  
**Cons**: Slower cold starts

#### Backend Deployment

1. **Create account** at [render.com](https://render.com)

2. **New Web Service** → Connect GitHub repo

3. **Configure**:
   ```
   Name: chat-moderation-backend
   Environment: Python 3
   Build Command: cd backend && pip install -r requirements.txt
   Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Create PostgreSQL database**:
   - New PostgreSQL → Get connection string
   - Add to environment variables

5. **Environment variables**:
   ```
   DATABASE_URL=<from_render_postgres>
   OPENAI_API_KEY=your_key
   PYTHON_VERSION=3.11
   ```

#### Frontend Deployment

1. **New Static Site** (or Web Service for SSR)

2. **Configure**:
   ```
   Build Command: cd frontend && npm install && npm run build
   Publish Directory: frontend/out
   ```

3. **Environment variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
   ```

---

### Option 3: Heroku

**Pros**: Battle-tested, good documentation  
**Cons**: No free tier anymore

#### Backend Deployment

1. **Install Heroku CLI**:
   ```bash
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Create Procfile** in backend/:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. **Deploy**:
   ```bash
   cd backend
   heroku login
   heroku create chat-moderation-backend
   heroku addons:create heroku-postgresql:mini
   heroku config:set OPENAI_API_KEY=your_key
   git push heroku main
   ```

#### Frontend Deployment

1. **Create Procfile** in frontend/:
   ```
   web: npm start
   ```

2. **Deploy**:
   ```bash
   cd frontend
   heroku create chat-moderation-frontend
   heroku config:set NEXT_PUBLIC_API_URL=https://your-backend.herokuapp.com
   heroku config:set NEXT_PUBLIC_WS_URL=wss://your-backend.herokuapp.com
   git push heroku main
   ```

---

### Option 4: DigitalOcean Droplet

**Pros**: Full control, predictable pricing  
**Cons**: Requires server management skills

#### Setup

1. **Create Ubuntu 22.04 Droplet** ($6/month minimum)

2. **SSH into server**:
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install dependencies**:
   ```bash
   apt update
   apt install -y python3 python3-pip python3-venv nodejs npm postgresql nginx
   ```

4. **Setup PostgreSQL**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE chat_moderation;
   CREATE USER chatuser WITH PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE chat_moderation TO chatuser;
   \q
   ```

5. **Clone repository**:
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/chat-moderation.git
   cd chat-moderation
   ```

6. **Setup backend**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Create .env file
   cat > .env << EOF
   DATABASE_URL=postgresql://chatuser:yourpassword@localhost/chat_moderation
   OPENAI_API_KEY=your_key
   EOF
   
   # Initialize database
   python -c "from database import init_db; init_db()"
   ```

7. **Setup systemd service** for backend:
   ```bash
   cat > /etc/systemd/system/chat-backend.service << EOF
   [Unit]
   Description=Chat Moderation Backend
   After=network.target
   
   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/chat-moderation/backend
   Environment="PATH=/var/www/chat-moderation/backend/venv/bin"
   ExecStart=/var/www/chat-moderation/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   EOF
   
   systemctl enable chat-backend
   systemctl start chat-backend
   ```

8. **Setup frontend**:
   ```bash
   cd /var/www/chat-moderation/frontend
   npm install
   npm run build
   ```

9. **Setup systemd service** for frontend:
   ```bash
   cat > /etc/systemd/system/chat-frontend.service << EOF
   [Unit]
   Description=Chat Moderation Frontend
   After=network.target
   
   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/chat-moderation/frontend
   Environment="NEXT_PUBLIC_API_URL=https://yourdomain.com/api"
   Environment="NEXT_PUBLIC_WS_URL=wss://yourdomain.com/api"
   ExecStart=/usr/bin/npm start
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   EOF
   
   systemctl enable chat-frontend
   systemctl start chat-frontend
   ```

10. **Configure Nginx**:
    ```bash
    cat > /etc/nginx/sites-available/chat-moderation << EOF
    server {
        listen 80;
        server_name yourdomain.com;
        
        # Frontend
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # Backend API
        location /api {
            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }
        
        # WebSocket
        location /ws {
            proxy_pass http://localhost:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
        }
    }
    EOF
    
    ln -s /etc/nginx/sites-available/chat-moderation /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx
    ```

11. **Setup SSL with Let's Encrypt**:
    ```bash
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d yourdomain.com
    ```

---

## 🔐 Security Considerations

### Production Environment Variables

Never commit these to git:

```bash
# Backend .env
DATABASE_URL=postgresql://user:password@host:port/database
OPENAI_API_KEY=sk-...
SECRET_KEY=your_secret_key_here
ENVIRONMENT=production

# Frontend .env.production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured
- [ ] CORS restricted to your domain
- [ ] Database credentials strong and unique
- [ ] Rate limiting implemented
- [ ] Input validation enabled
- [ ] SQL injection protection (SQLAlchemy handles this)
- [ ] XSS protection enabled
- [ ] Authentication implemented (if needed)

### Update CORS for Production

In `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://www.yourdomain.com"
    ],  # Restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📊 Monitoring

### Health Check Endpoints

Use these for monitoring:
- `GET /api/health` - Backend health
- `GET /` - Basic status

### Recommended Monitoring Tools

- **UptimeRobot**: Free uptime monitoring
- **Sentry**: Error tracking
- **Datadog**: Comprehensive monitoring (paid)
- **New Relic**: Application performance

---

## 🔄 Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
```

---

## 📝 Post-Deployment

1. **Test all endpoints**:
   ```bash
   curl https://your-api.com/api/health
   ```

2. **Test WebSocket**:
   - Open frontend in browser
   - Connect and send messages
   - Verify real-time functionality

3. **Monitor logs**:
   - Check for errors
   - Monitor response times
   - Track user activity

4. **Setup backups**:
   - Regular database backups
   - Code repository backups

---

## 🐛 Troubleshooting

### Common Issues

**WebSocket connection fails**:
- Ensure WSS (not WS) for HTTPS sites
- Check proxy configuration
- Verify CORS settings

**Database connection errors**:
- Check DATABASE_URL format
- Verify database is accessible
- Check firewall rules

**Model loading fails**:
- Ensure sufficient memory (1GB+ recommended)
- Check disk space for model downloads
- Verify internet connectivity

**High memory usage**:
- Use smaller transformer models
- Implement model caching
- Consider serverless functions

---

## 💰 Cost Estimates

### Free Tier Options
- **Railway**: 500 hours/month free
- **Render**: 750 hours/month free
- **Vercel**: Unlimited for frontend

### Paid Options
- **DigitalOcean**: $6/month (basic droplet)
- **Heroku**: $7/month per dyno
- **AWS**: ~$10-20/month (t3.small)

### Additional Costs
- **OpenAI API**: ~$0.002 per request
- **Database**: $7/month (managed PostgreSQL)
- **Domain**: $10/year

---

## 📚 Additional Resources

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)
- [WebSocket Deployment](https://www.nginx.com/blog/websocket-nginx/)

---

For college project demos, Railway or Render free tiers are recommended.
