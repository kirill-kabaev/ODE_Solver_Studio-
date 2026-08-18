@echo off
REM ==============================================================================
REM Студия СЛАУ и Дифференциальных Уравнений — ЕДИНЫЙ УНИВЕРСАЛЬНЫЙ ЗАПУСК
REM Автоматическая установка, компиляция и мгновенный запуск в браузере
REM ==============================================================================

cd /d "%~dp0"
chcp 65001 >nul 2>&1
title Студия СЛАУ и Дифференциальных Уравнений [v3.0 PRO]

cls
echo ==============================================================================
echo 🚀 Инициализация Студии СЛАУ и Дифференциальных Уравнений
echo ==============================================================================
echo.

REM 1. Проверка Node.js
echo [1/4] Проверка Node.js и npm...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto :NO_NODE

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto :NO_NODE

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo [+] Среда найдена: Node.js %NODE_VER%, npm v%NPM_VER%
goto :CHECK_ENV

:NO_NODE
echo.
echo ==============================================================================
echo [ВНИМАНИЕ] Node.js не обнаружен в вашей системе!
echo ==============================================================================
echo Пробуем автоматическую установку через winget...
where winget >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% EQU 0 (
        echo [+] Node.js установлен! Перезапустите start.bat
        pause
        exit /b 0
    )
)
echo Открываем сайт для ручной установки: https://nodejs.org/
start https://nodejs.org/
pause
exit /b 1

REM 2. Проверка .env
:CHECK_ENV
echo.
echo [2/4] Проверка конфигурации .env...
if exist ".env" goto :ENV_OK
if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
) else (
    echo GEMINI_API_KEY=>".env"
)
echo [+] Файл .env создан.
goto :CHECK_DEPS

:ENV_OK
echo [+] Файл .env готов.

REM 3. Проверка и установка зависимостей
:CHECK_DEPS
echo.
echo [3/4] Проверка библиотек (node_modules)...
if exist "node_modules\" goto :BUILD_STEP

echo [*] Установка зависимостей (npm install)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [-] Ошибка при установке npm библиотек!
    pause
    exit /b %ERRORLEVEL%
)
echo [+] Библиотеки установлены!

REM 4. Компиляция свежего бандла и запуск
:BUILD_STEP
echo.
echo [4/4] Сборка и подготовка запуска...
set NODE_ENV=production
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [-] Ошибка компиляции проекта!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================================================
echo ✨ Студия готова к работе!
echo 🌐 Адрес: http://localhost:3000
echo 🚀 Открытие браузера со стартовым экраном-визиткой...
echo ==============================================================================

REM Фоновое открытие браузера через 2 секунды
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

call npm start
if %ERRORLEVEL% NEQ 0 (
    echo [-] Ошибка выполнения сервера.
    pause
    exit /b %ERRORLEVEL%
)
