#!/usr/bin/env bash
# Запуск Ками для телефона (Codespace делает это сам при открытии).
# Вручную: bash scripts/phone.sh  (или npm run phone)
cd "$(dirname "$0")/.."
echo "→ Скачиваю свежий код…"
git pull --ff-only || echo "  (не получилось обновить код — запускаю то, что есть)"
if [ package-lock.json -nt node_modules/.package-lock.json ] 2>/dev/null || [ ! -d node_modules ]; then
  echo "→ Обновляю библиотеки…"
  npm install --no-audit --no-fund
fi
echo "→ Запускаю сервер. На телефоне: Expo Go → kami-app"
npx expo start --tunnel || npx expo start --tunnel ngrok
