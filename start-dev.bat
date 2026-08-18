@echo off
REM ==============================================================================
REM ODE Solver Studio - Development Launcher (Windows)
REM Steps: npm install -> npm run dev
REM ==============================================================================

cd /d "%~dp0"
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
echo Opening http://localhost:3000 in your browser...
echo ==============================================================================

REM Launch browser in background after 2 seconds
start /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server exited with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)
pause
