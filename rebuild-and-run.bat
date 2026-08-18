@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>&1
title Сборка и Запуск Студии с Начальной Страницей

cls
echo ==============================================================================
echo [ПЕРЕСБОРКА] Сборка Студии со стартовым экраном-визиткой
echo ==============================================================================
echo.

echo [*] Сборка проекта (npm run build)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [-] Ошибка при сборке проекта.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [+] Сборка завершена успешно! Запуск сервера и браузера...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

call npm start
pause
