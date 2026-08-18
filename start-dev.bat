@echo off
REM ==============================================================================
REM ODE Solver Studio - Development Launcher (Windows)
REM Steps: npm install -> npm run dev
REM ==============================================================================

chcp 65001 >nul 2>&1
title ODE Solver Studio [Development Mode]

echo.
echo ==============================================================================
echo [1/2] Checking dependencies (npm install)...
echo ==============================================================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install npm dependencies!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================================================
echo [2/2] Starting Development Server (npm run dev)...
echo Application URL: http://localhost:3000
echo ==============================================================================
call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server exited with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)
pause
