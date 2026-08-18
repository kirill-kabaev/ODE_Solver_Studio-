# ==============================================================================
# Быстрый запускатор проекта в режиме РАЗРАБОТКИ (PowerShell Windows)
# Включает: npm install -> npm run dev
# ==============================================================================

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "🚀 [1/2] Проверка зависимостей (npm install)..." -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Не удалось установить зависимости npm!" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода..."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "✨ [2/2] Запуск сервера в режиме разработки (npm run dev)..." -ForegroundColor Green
Write-Host "🌐 Приложение доступно по адресу: http://localhost:3000" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Green
npm run dev
