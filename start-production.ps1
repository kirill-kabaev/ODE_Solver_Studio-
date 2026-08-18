# ==============================================================================
# Быстрый запускатор проекта в режиме PRODUCTION (PowerShell Windows)
# Включает: npm install -> npm run build -> npm start
# ==============================================================================

Set-Location $PSScriptRoot
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "🚀 [1/3] Установка зависимостей (npm install)..." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Не удалось установить зависимости npm!" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода..."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "⚙️  [2/3] Сборка клиентской части и сервера (npm run build)..." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Сборка проекта завершилась с ошибкой!" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода..."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "✨ [3/3] Запуск сервера в режиме Production (npm start)..." -ForegroundColor Green
Write-Host "🌐 Приложение доступно по адресу: http://localhost:3000" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Green
$env:NODE_ENV = "production"
npm start
