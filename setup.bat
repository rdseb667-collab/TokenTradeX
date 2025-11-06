@echo off
echo ========================================
echo TokenTradeX - Easy Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/6] Node.js found: 
node --version
echo.

REM Check if PostgreSQL is accessible
echo [2/6] Checking PostgreSQL...
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] PostgreSQL CLI not found in PATH
    echo Make sure PostgreSQL is installed and running
    echo.
) else (
    echo PostgreSQL CLI found
    echo.
)

REM Install root dependencies
echo [3/6] Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo.

REM Setup backend
echo [4/6] Setting up backend...
cd backend

if not exist .env (
    echo Creating backend .env file from example...
    copy .env.example .env
    echo [IMPORTANT] Please edit backend\.env and update your database credentials!
    echo.
)

call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..
echo.

REM Setup frontend
echo [5/6] Setting up frontend...
cd frontend

if not exist .env (
    echo Creating frontend .env file from example...
    copy .env.example .env
)

call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..
echo.

REM Setup database
echo [6/6] Setting up database...
echo Make sure PostgreSQL is running and database credentials are correct in backend\.env
echo.
choice /C YN /M "Do you want to setup the database now"
if errorlevel 2 goto skip_db
if errorlevel 1 goto setup_db

:setup_db
cd backend
call npm run db:migrate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database migration failed
    echo Please check your database connection settings in backend\.env
    cd ..
    pause
    exit /b 1
)

call npm run db:seed
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database seeding failed
    cd ..
    pause
    exit /b 1
)
cd ..
goto setup_complete

:skip_db
echo Skipping database setup. Run "npm run db:setup" manually when ready.
echo.

:setup_complete
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Update backend\.env with your PostgreSQL credentials (if not done)
echo 2. Run: npm run dev
echo 3. Open http://localhost:5173 in your browser
echo.
echo Demo credentials:
echo - Email: demo@tokentradex.com
echo - Password: Demo123!
echo.
pause
