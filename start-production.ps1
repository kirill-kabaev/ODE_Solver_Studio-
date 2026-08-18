# ==============================================================================
# Студия СЛАУ и Дифференциальных Уравнений (PowerShell Auto-Setup Launcher)
# ==============================================================================

Set-Location $PSScriptRoot
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "🚀 Инициализация Студии СЛАУ и Дифференциальных Уравнений" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка Node.js
Write-Host "[1/5] Проверка Node.js..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ Node.js не обнаружен в системе!" -ForegroundColor Red
    Start-Process "https://nodejs.org/"
    Write-Host "Пожалуйста, установите Node.js LTS и повторите запуск." -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода..."
    exit 1
}
$nodeVer = node -v
Write-Host "✅ Node.js обнаружен: $nodeVer" -ForegroundColor Green

# 2. Проверка .env
Write-Host "`n[2/5] Проверка .env..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    } else {
        Set-Content -Path ".env" -Value "GEMINI_API_KEY="
    }
    Write-Host "✅ Файл .env создан." -ForegroundColor Green
} else {
    Write-Host "✅ Файл .env присутствует." -ForegroundColor Green
}

# 3. Проверка node_modules
Write-Host "`n[3/5] Проверка зависимостей (node_modules)..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "[ПЕРВЫЙ ЗАПУСК] Установка npm пакетов..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка при установке npm пакетов!" -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода..."
        exit $LASTEXITCODE
    }
    Write-Host "✅ Зависимости успешно установлены." -ForegroundColor Green
} else {
    Write-Host "✅ Зависимости уже установлены." -ForegroundColor Green
}

# 4. Проверка сборки
Write-Host "`n[4/5] Проверка production-сборки (dist)..." -ForegroundColor Cyan
if (-not (Test-Path "dist\server.cjs")) {
    Write-Host "⚙️ Компиляция проекта (npm run build)..." -ForegroundColor Yellow
    $env:NODE_ENV = "production"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка сборки!" -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода..."
        exit $LASTEXITCODE
    }
    Write-Host "✅ Проект успешно скомпилирован." -ForegroundColor Green
} else {
    Write-Host "✅ Готовая production-сборка обнаружена." -ForegroundColor Green
}

# 5. Запуск сервера
Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host "✨ [5/5] Запуск Production-сервера (npm start)..." -ForegroundColor Green
Write-Host "🌐 Приложение: http://localhost:3000" -ForegroundColor Yellow
Write-Host "🚀 Открытие браузера..." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Green
$env:NODE_ENV = "production"

Start-Job -ScriptBlock { Start-Sleep -Seconds 2; Start-Process "http://localhost:3000" } | Out-Null

npm start
