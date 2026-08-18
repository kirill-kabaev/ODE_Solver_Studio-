@echo off
REM ==============================================================================
REM Студия СЛАУ и Дифференциальных Уравнений (Production Launcher)
REM ==============================================================================

cd /d "%~dp0"
chcp 65001 >nul 2>&1
title Студия СЛАУ и Дифференциальных Уравнений [Production Auto-Setup]

cls
echo ==============================================================================
echo [СТАРТ] Студия СЛАУ и Дифференциальных Уравнений
echo ==============================================================================
echo.

REM ------------------------------------------------------------------------------
REM Шаг 1: Проверка наличия Node.js и npm
REM ------------------------------------------------------------------------------
echo [1/5] Проверка системного окружения Node.js и npm...
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
echo [ВНИМАНИЕ] Node.js не обнаружен в вашей операционной системе!
echo ==============================================================================
echo Для работы приложения требуется среда выполнения Node.js (версия LTS).
echo.
echo Пробуем автоматическую установку через winget...
where winget >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [+] Node.js успешно установлен!
        echo Пожалуйста, перезапустите этот батник (start-production.bat).
        pause
        exit /b 0
    )
)
echo Открываем официальный сайт Node.js для скачивания...
start https://nodejs.org/
echo Пожалуйста, установите Node.js LTS и перезапустите данный батник.
echo.
pause
exit /b 1

REM ------------------------------------------------------------------------------
REM Шаг 2: Проверка и создание .env
REM ------------------------------------------------------------------------------
:CHECK_ENV
echo.
echo [2/5] Проверка конфигурационного файла .env...
if exist ".env" goto :ENV_OK

echo [*] Создание базового файла .env...
if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
) else (
    echo GEMINI_API_KEY=>".env"
)
echo [+] Файл .env успешно создан.
goto :CHECK_DEPS

:ENV_OK
echo [+] Файл .env присутствует.

REM ------------------------------------------------------------------------------
REM Шаг 3: Автоматическая установка зависимостей
REM ------------------------------------------------------------------------------
:CHECK_DEPS
echo.
echo [3/5] Проверка установленных пакетов node_modules...
if exist "node_modules\" goto :DEPS_OK

echo [*] Папка node_modules не найдена.
echo [*] Выполняется автоматическая установка библиотек (npm install)...
echo Пожалуйста, подождите...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [-] Ошибка при установке npm пакетов!
    echo Проверьте подключение к сети интернет.
    pause
    exit /b %ERRORLEVEL%
)
echo [+] Все зависимости успешно установлены!
goto :BUILD_PROJECT

:DEPS_OK
echo [+] Все зависимости node_modules уже установлены.

REM ------------------------------------------------------------------------------
REM Шаг 4: Сборка свежего Production-бандла (с новейшим экраном-визиткой)
REM ------------------------------------------------------------------------------
:BUILD_PROJECT
echo.
echo [4/5] Компиляция новейшей версии проекта (npm run build)...
set NODE_ENV=production
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [-] Ошибка компиляции проекта!
    pause
    exit /b %ERRORLEVEL%
)
echo [+] Проект успешно скомпилирован!
goto :START_SERVER

REM ------------------------------------------------------------------------------
REM Шаг 5: Запуск сервера и открытие браузера
REM ------------------------------------------------------------------------------
:START_SERVER
echo.
echo ==============================================================================
echo [5/5] Запуск Production-сервера...
echo Сервер доступен по адресу: http://localhost:3000
echo ==============================================================================
set NODE_ENV=production

REM Фоновое открытие браузера через 2 секунды
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

call npm start
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [-] Сервер завершил работу с ошибкой %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

pause
