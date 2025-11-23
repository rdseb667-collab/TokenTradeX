# 🚀 TokenTradeX - Complete Setup & Run Guide

## For Windows Users - EASIEST Method

### Option 1: Automated Setup (Recommended)

1. **Open PowerShell or Command Prompt** in the TokenTradeX folder
2. **Run the setup script:**
   ```bash
   setup.bat
   ```
3. **Follow the prompts** - the script will:
   - Check for Node.js
   - Install all dependencies
   - Create configuration files
   - Setup the database (optional)

4. **Start the platform:**
   ```bash
   npm run dev
   ```

5. **Open your browser** to `http://localhost:5173`

---

## Manual Setup (If automated setup doesn't work)

### Step 1: Install Prerequisites

Download and install these if you haven't:

1. **Node.js 18 or higher**
   - Download: https://nodejs.org/
   - Choose the LTS version
   - Verify: Open PowerShell and type `node --version`

2. **PostgreSQL 14 or higher**
   - Download: https://www.postgresql.org/download/windows/
   - During installation, remember the password you set for the `postgres` user
   - Verify: Open PowerShell and type `psql --version`

### Step 2: Create Database

1. **Open PostgreSQL command line** (pgAdmin or psql)
2. **Create database:**
   ```sql
   CREATE DATABASE tokentradex;
   ```
3. **Verify:** `\l` should show tokentradex in the list

### Step 3: Configure Backend

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Copy environment file:**
   ```bash
   copy .env.example .env
   ```

3. **Edit backend\.env file** with your preferred text editor:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Update these with your PostgreSQL credentials
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tokentradex
   DB_USER=postgres
   DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
   
   # Change these secrets in production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRE=7d
   
   CORS_ORIGIN=http://localhost:5173
   ```

   **Important:** Replace `YOUR_POSTGRES_PASSWORD_HERE` with your actual PostgreSQL password!

4. **Go back to root:**
   ```bash
   cd ..
   ```

### Step 4: Configure Frontend

1. **Navigate to frontend folder:**
   ```bash
   cd frontend
   ```

2. **Copy environment file:**
   ```bash
   copy .env.example .env
   ```

3. **The default settings should work**, but you can edit if needed:
   ```env
   VITE_API_URL=http://localhost:3000
   VITE_WS_URL=ws://localhost:3000
   ```

4. **Go back to root:**
   ```bash
   cd ..
   ```

### Step 5: Install Dependencies

**From the root TokenTradeX folder:**

```bash
npm install
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

### Step 6: Setup Database

**From the root folder:**

```bash
cd backend
npm run db:migrate
npm run db:seed
cd ..
```

If successful, you'll see:
- ✅ Database schema synchronized
- ✅ Admin user created
- ✅ Demo tokens created
- ✅ Demo user created

### Step 7: Start the Platform

**From the root folder:**

```bash
npm run dev
```

You should see:
```
[Backend] Server running on port 3000
[Frontend] Local: http://localhost:5173
```

### Step 8: Access the Platform

**Open your browser** and go to:
```
http://localhost:5173
```

---

## 🔑 Login Credentials

### Demo Trading Account (Recommended to start)
- **Email:** `demo@tokentradex.com`
- **Password:** `Demo123!`
- **Pre-funded with:** 100K USDT, 1 BTC, 10 ETH, and more

### Admin Account
- **Email:** `admin@tokentradex.com`
- **Password:** `Admin123!`
- **Privileges:** Full platform management

---

## 🎯 Quick Feature Tour

### 1. Dashboard
- View your portfolio value
- See market overview
- Check recent orders

### 2. Trading Page
- View real-time token prices
- Place market and limit orders
- Set stop-loss and take-profit orders

### 3. Wallet
- View all your token balances
- Deposit tokens (simulated)
- Withdraw tokens
- Transaction history

### 4. Orders
- View all your orders
- Cancel pending orders
- Track order status

---

## ⚠️ Troubleshooting

### "Cannot connect to database"
**Solution:**
1. Make sure PostgreSQL is running
2. Check credentials in `backend\.env`
3. Verify database exists: `psql -U postgres -l`

### "Port 3000 already in use"
**Solution:**
Change the port in `backend\.env`:
```env
PORT=3001
```

### "Port 5173 already in use"
**Solution:**
Edit `frontend\vite.config.js`:
```js
server: {
  port: 5174  // Change to any available port
}
```

### "Module not found" errors
**Solution:**
```bash
# Delete all node_modules
rmdir /s /q node_modules
rmdir /s /q backend\node_modules
rmdir /s /q frontend\node_modules

# Reinstall
npm install
cd backend && npm install
cd ..\frontend && npm install
```

### Backend starts but frontend doesn't load
**Solution:**
1. Check if frontend is running on port 5173
2. Clear browser cache (Ctrl+Shift+Del)
3. Try incognito/private window

### Database migration fails
**Solution:**
1. Drop and recreate database:
   ```sql
   DROP DATABASE tokentradex;
   CREATE DATABASE tokentradex;
   ```
2. Run migration again:
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed
   ```

### Starting the application without a database
**Solution:**
If you want to start the backend without a database connection (e.g., for UI development only), you can set the `ALLOW_START_WITHOUT_DB` environment variable:

1. Add to your `backend/.env` file:
   ```env
   ALLOW_START_WITHOUT_DB=true
   ```
2. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

The server will start in stub mode and return 503 errors for database-dependent endpoints while allowing UI development to proceed. The `/health` endpoint will return a 503 status with "degraded" status until Postgres is connected, mirroring real availability.

### Configuring database polling interval

When running in stub mode, the server periodically checks if the database becomes available. You can configure the polling interval using the `DB_POLL_INTERVAL_MS` environment variable:

1. Add to your `backend/.env` file:
   ```env
   ALLOW_START_WITHOUT_DB=true
   DB_POLL_INTERVAL_MS=10000
   ```

This will check the database every 10 seconds (instead of the default 30 seconds). When the database becomes available, the server will automatically initialize database-dependent services and enable API/WebSocket access. The `/health` endpoint will update to show "ok" status with 200 response once the database is connected.

---

## 📋 Available Commands

### From Root Directory

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend |
| `npm run dev:backend` | Start only backend |
| `npm run dev:frontend` | Start only frontend |
| `npm run build` | Build for production |
| `npm test` | Run all tests |
| `npm run db:setup` | Reset and seed database |

### Backend Only (from backend/ folder)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend dev server |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with demo data |

### Smart Contracts (from contracts/ folder)

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile contracts using Hardhat (requires network access) |
| `npm run compile:offline` | Compile contracts offline using bundled solc compiler |
| `npm run test` | Run contract tests |

---

## 🛑 Stopping the Application

**Press `Ctrl + C`** in the terminal where `npm run dev` is running

---

## 🔒 Security Notes

**For Development Only:**
- Default passwords are for demo purposes
- Change all secrets before deploying to production
- Never commit `.env` files to version control

**For Production:**
1. Change all JWT secrets
2. Use strong database passwords
3. Enable HTTPS
4. Set up proper firewall rules
5. Use environment-specific configurations

---

## 🆘 Still Having Issues?

1. **Check Node.js version:** `node --version` (should be 18+)
2. **Check PostgreSQL:** `psql --version`
3. **Check if ports are free:**
   ```bash
   netstat -ano | findstr :3000
   netstat -ano | findstr :5173
   ```
4. **Check logs:** Look for error messages in terminal
5. **Browser console:** Open DevTools (F12) and check console

---

## 🎉 Success!

If you see the TokenTradeX login page, congratulations! You've successfully set up the platform.

**Next Steps:**
1. Login with demo credentials
2. Explore the dashboard
3. Try placing a test order
4. Check your wallet
5. Review order history

**Happy Trading! 📈**
