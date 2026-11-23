#!/usr/bin/env bash
set -e
echo "=== 物理学习 App · 本地打包 (Linux/Mac) ==="

echo "[1/3] 环境检查..."
command -v java >/dev/null 2>&1 || { echo "  [ERROR] 需要 JDK 17"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "  [ERROR] 需要 Node.js 20"; exit 1; }

echo "[2/3] 安装依赖 & 同步..."
npm ci
npx cap sync android

echo "[3/3] 构建 Debug APK..."
cd android
chmod +x ./gradlew 2>/dev/null || true
./gradlew assembleDebug --no-daemon
cd ..

OUT="android/app/build/outputs/apk/debug/app-debug.apk"
ls -lh "$OUT"
echo "=== 构建完成: $OUT ==="
