#!/bin/bash
# ==============================================================================
# Студия СЛАУ и Дифференциальных Уравнений (Linux / macOS Auto-Setup)
# ==============================================================================

set -e

cd "$(dirname "$0")"

echo ""
echo "=============================================================================="
echo "🚀 Инициализация Студии СЛАУ и Дифференциальных Уравнений"
echo "=============================================================================="
echo ""

# 1. Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Пожалуйста, установите Node.js (https://nodejs.org/)"
    exit 1
fi

echo "✅ Найден Node.js: $(node -v)"

# 2. Проверка .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo "GEMINI_API_KEY=" > .env
    fi
    echo "✅ Файл .env создан."
fi

# 3. Проверка node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 [ПЕРВЫЙ ЗАПУСК] Установка npm зависимостей..."
    npm install
fi

# 4. Проверка сборки
if [ ! -f "dist/server.cjs" ]; then
    echo "⚙️ Сборка проекта (npm run build)..."
    NODE_ENV=production npm run build
fi

# 5. Запуск
echo ""
echo "✨ Запуск сервера на http://localhost:3000..."
NODE_ENV=production npm start
