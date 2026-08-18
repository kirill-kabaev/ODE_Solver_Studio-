#!/bin/bash
# ==============================================================================
# Быстрый запускатор проекта в режиме PRODUCTION (Linux / macOS)
# Включает: npm install -> npm run build -> npm start
# ==============================================================================

set -e # Прерывать выполнение при ошибке

echo ""
echo "🚀 [1/3] Установка зависимостей (npm install)..."
npm install

echo ""
echo "⚙️  [2/3] Сборка клиентской части и сервера (npm run build)..."
NODE_ENV=production npm run build

echo ""
echo "✨ [3/3] Запуск сервера в режиме Production (npm start)..."
echo "🌐 Приложение будет доступно по адресу: http://localhost:3000"
echo ""

NODE_ENV=production npm start
