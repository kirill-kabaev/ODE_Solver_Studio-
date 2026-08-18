@echo off
REM ==============================================================================
REM ODE Solver Studio - Production Launcher (Windows)
REM Steps: npm install -> npm run build -> npm start
REM ==============================================================================

cd /d "%~dp0"
chcp 65001 >nul 2>&1
title ODE Solver Studio [Production]

echo.
echo ==============================================================================
echo [1/3] Installing dependencies (npm install)...
echo ==============================================================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install npm dependencies!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================================================
echo [2/3] Building production bundle (npm run build)...
echo ==============================================================================
set NODE_ENV=production
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Check errors above.
    pause
    exit /b %ERRORLEVEL%
)

if not exist "dist\server.cjs" (
    echo [ERROR] dist\server.cjs was not created! Please run 'npm run build' manually.
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo [3/3] Starting Production Server (npm start)...
echo Application URL: http://localhost:3000
echo ==============================================================================
set NODE_ENV=production
call npm start
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server stopped with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)
pause

