@echo off
title Music Core - Starting App
cd /d "%~dp0"

echo ========================================
echo   Music Core - Starting Application
echo ========================================
echo.

:: ---- Step 1: Start Docker containers if not running ----
echo [1/4] Checking Docker containers...
docker ps --format "{{.Names}}" 2>nul | findstr /I "mpp_postgres" >nul
if %errorlevel% neq 0 (
    echo   ^> Starting Docker containers (PostgreSQL, MongoDB)...
    docker compose up -d postgres postgres_test mongodb
    if %errorlevel% neq 0 (
        echo   [ERROR] Failed to start Docker containers. Is Docker Desktop running?
        pause
        exit /b 1
    )
    echo   ^> Waiting for PostgreSQL to be ready...
    ping -n 6 127.0.0.1 >nul
) else (
    echo   ^> Docker containers already running.
)

:: ---- Step 2: Generate Prisma client ----
echo [2/4] Generating Prisma client...
node_modules\.bin\prisma generate --schema server/prisma/schema.prisma 2>nul
if %errorlevel% neq 0 (
    echo   ^> Prisma client already generated (or locked by running server - OK).
) else (
    echo   ^> Prisma client generated.
)

:: ---- Step 3: Apply database migrations ----
echo [3/4] Applying database migrations...
node_modules\.bin\prisma migrate deploy --schema server/prisma/schema.prisma 2>nul
if %errorlevel% neq 0 (
    echo   ^> Migrations already applied (or locked - OK).
) else (
    echo   ^> Migrations applied.
    echo   ^> Seeding database...
    node_modules\.bin\tsx server/prisma/seed.ts 2>nul
)

:: ---- Step 4: Start backend and frontend ----
echo [4/4] Starting servers...
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo   To access from other LAN devices:
echo     http://<YOUR_LAN_IP>:5173
echo.
echo   Press Ctrl+C in each window to stop.
echo ========================================
echo.

:: Start backend in a new window
start "Music Core Backend" cmd /c "title Music Core Backend && cd /d %CD% && node_modules\.bin\tsx server/src/index.ts"

:: Wait 3 seconds for backend to initialize
ping -n 4 127.0.0.1 >nul

:: Start frontend in a new window
start "Music Core Frontend" cmd /c "title Music Core Frontend && cd /d %CD% && npx vite --host"

echo.
echo Both servers are starting...
echo Open http://localhost:5173 in your browser
echo.
pause

@echo off
title Music Core - Starting App
cd /d "%~dp0"

echo ========================================
echo   Music Core - Starting Application
echo ========================================
echo.

:: ---- Step 1: Start Docker containers if not running ----
echo [1/4] Checking Docker containers...
docker ps --format "{{.Names}}" 2>nul | findstr /I "mpp_postgres" >nul
if %errorlevel% neq 0 (
    echo   ^> Starting Docker containers (PostgreSQL, MongoDB)...
    docker compose up -d postgres postgres_test mongodb
    if %errorlevel% neq 0 (
        echo   [ERROR] Failed to start Docker containers. Is Docker Desktop running?
        pause
        exit /b 1
    )
    echo   ^> Waiting for PostgreSQL to be ready...
    timeout /t 5 /nobreak >nul
) else (
    echo   ^> Docker containers already running.
)

:: ---- Step 2: Generate Prisma client ----
echo [2/4] Generating Prisma client...
node_modules\.bin\prisma generate --schema server/prisma/schema.prisma 2>nul
if %errorlevel% neq 0 (
    echo   ^> Prisma client already exists (or locked by running server - OK).
) else (
    echo   ^> Prisma client generated.
)

:: ---- Step 3: Run database migrations (if needed) ----
echo [3/4] Applying database migrations...
node_modules\.bin\prisma migrate deploy --schema server/prisma/schema.prisma 2>nul
if %errorlevel% neq 0 (
    echo   ^> Migrations already applied (or locked - OK).
) else (
    echo   ^> Migrations applied.
    
    :: Seed the database after fresh migration
    echo   ^> Seeding database...
    node_modules\.bin\tsx server/prisma/seed.ts 2>nul
)

:: ---- Step 4: Start backend and frontend ----
echo [4/4] Starting servers...
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo   LAN:      http://%COMPUTERNAME%:5173
echo.
echo   Press Ctrl+C in each window to stop.
echo ========================================
echo.

:: Start backend in a new window
start "Music Core Backend" cmd /c "title Music Core Backend && node_modules\.bin\tsx server/src/index.ts && pause"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
start "Music Core Frontend" cmd /c "title Music Core Frontend && npx vite --host && pause"

echo Both servers starting...
echo.
echo Open http://localhost:5173 in your browser
echo.
pause
