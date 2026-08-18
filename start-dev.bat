@echo off
REM ==============================================================================
REM Студия СЛАУ и Дифференциальных Уравнений (Dev Mode Launcher)
REM ==============================================================================

cd /d "%~dp0"
chcp 65001 >nul 2>&1
title Студия СЛАУ и Дифференциальных Уравнений [Dev Mode]

cls
echo ==============================================================================
echo [СТАРТ] Студия СЛАУ и Дифференциальных Уравнений (Режим Разработки)
echo ==============================================================================
echo.

REM ------------------------------------------------------------------------------
REM Шаг 1: Проверка Node.js и npm
REM ------------------------------------------------------------------------------
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
echo [-] Node.js не найден в системе. Открываем сайт для установки...
start https://nodejs.org/
pause
exit /b 1

REM ------------------------------------------------------------------------------
REM Шаг 2: Проверка .env
REM ------------------------------------------------------------------------------
:CHECK_ENV
echo.
echo [2/4] Проверка файла .env...
if exist ".env" goto :ENV_OK

if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
) else (
    echo GEMINI_API_KEY=>".env"
)
echo [+] Файл .env создан.
goto :CHECK_DEPS

:ENV_OK
echo [+] Файл .env найден.

REM ------------------------------------------------------------------------------
REM Шаг 3: Проверка node_modules
REM ------------------------------------------------------------------------------
:CHECK_DEPS
echo.
echo [3/4] Проверка зависимостей...
if exist "node_modules\" goto :DEPS_OK

echo [*] Установка npm зависимостей...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [-] Ошибка при установке npm зависимостей.
    pause
    exit /b %ERRORLEVEL%
)

:DEPS_OK
echo [+] Зависимости установлены.

REM ------------------------------------------------------------------------------
REM Шаг 4: Запуск сервера разработки
REM ------------------------------------------------------------------------------
echo.
echo ==============================================================================
echo [4/4] Запуск Dev Server (npm run dev)...
echo Адрес: http://localhost:3000
echo ==============================================================================

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo [-] Ошибка при выполнении npm run dev
    pause
    exit /b %ERRORLEVEL%
)

pause
