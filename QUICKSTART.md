# Quick Start Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js 18+**: [Download Here](https://nodejs.org/)
- **PostgreSQL 14+**: [Download Here](https://www.postgresql.org/download/)
- **Git**: [Download Here](https://git-scm.com/)

## PostgreSQL Setup

1. Install PostgreSQL and start the service
2. Create a database:
   ```sql
   CREATE DATABASE tokentradex;
   ```
3. Note your PostgreSQL credentials (default user is usually `postgres`)

## Installation Steps

### Step 1: Install Root Dependencies
```bash
npm install
```

### Step 2: Configure Backend Environment
1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```
3. Edit `.env` file and update these values:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tokentradex
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   JWT_SECRET=change-this-to-a-random-secret-key
   ```

### Step 3: Configure Frontend Environment
1. Navigate to frontend directory:
   ```bash
   cd ..\frontend
   ```
2. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

### Step 4: Install All Dependencies
From the root directory:
```bash
cd ..
npm run setup
```

This command will:
- Install all dependencies for both backend and frontend
- Set up the database schema
- Seed initial data (tokens, demo users, etc.)

### Step 5: Start the Platform
```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:3000`
- Frontend application on `http://localhost:5173`

## Access the Platform

Open your browser and navigate to:
```
http://localhost:5173
```

## Demo Login Credentials

**Admin Account:**
- Email: `admin@tokentradex.com`
- Password: `Admin123!`

**Demo Trading Account:**
- Email: `demo@tokentradex.com`
- Password: `Demo123!`

The demo account comes pre-funded with:
- 100,000 USDT
- 1 BTC
- 10 ETH
- Other tokens

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `backend/.env`
- Check if the database `tokentradex` exists

### Port Already in Use
If ports 3000 or 5173 are in use:
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.js`

### Module Not Found Errors
```bash
# Clean install all dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Available Scripts

From the root directory:

- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only the backend server
- `npm run dev:frontend` - Start only the frontend application
- `npm run build` - Build production version
- `npm test` - Run all tests
- `npm run db:setup` - Reset and seed database

## Next Steps

1. Explore the dashboard
2. Check your wallet balances
3. View market data on the Trading page
4. Place your first order
5. Monitor your orders in the Orders page

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review the API documentation in the backend
- Check browser console for frontend errors
- Check terminal for backend errors

---

**Happy Trading! 🚀**
