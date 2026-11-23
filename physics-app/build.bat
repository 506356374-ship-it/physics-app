@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ============================================================
echo   物理学习 App · 本地打包脚本 (Win7/Win10)
echo ============================================================
echo.

REM --- 1. 环境自检 ---
echo [1/4] 检查环境...
where java >nul 2>nul
if errorlevel 1 (
  echo   [ERROR] 未检测到 JDK，请安装 JDK 17 并配置 JAVA_HOME
  pause & exit /b 1
)
java -version 2>&1 | findstr /i "version" | findstr /i "17" >nul
if errorlevel 1 (
  echo   [WARN] 推荐 JDK 17，其他版本可能不兼容 AGP 8.x
)

where node >nul 2>nul
if errorlevel 1 (
  echo   [ERROR] 未检测到 Node.js，请先安装
  pause & exit /b 1
)

if not exist "android\gradlew.bat" (
  echo   [WARN] 缺少 gradlew.bat，正在下载 gradle wrapper ...
  call :download_wrapper
)

echo   OK: JDK + Node + Gradle wrapper 就绪
echo.

REM --- 2. 安装依赖并同步 ---
echo [2/4] 安装依赖并同步 Capacitor ...
call npm ci
if errorlevel 1 (
  echo   [ERROR] npm ci 失败
  pause & exit /b 1
)
call npx cap sync android
if errorlevel 1 (
  echo   [WARN] npx cap sync 失败（首次需先 npx cap add android）
  call npx cap add android
  call npx cap sync android
)
echo.

REM --- 3. 选择构建类型 ---
echo [3/4] 选择打包类型：
echo   1) Debug  （开发调试，可快速验证）
echo   2) Release（正式签名，需先配好 keystore.properties）
set /p choice="输入 1 或 2 [默认 1]: "
if "%choice%"=="" set choice=1

if "%choice%"=="1" (
  echo.
  echo [4/4] 开始构建 Debug APK ...
  cd android
  call gradlew.bat assembleDebug --no-daemon
  cd ..
  set OUT=android\app\build\outputs\apk\debug\app-debug.apk
) else (
  if not exist "android\keystore.properties" (
    echo   [ERROR] 未找到 android\keystore.properties，请参考 keystore.properties.example 创建
    pause & exit /b 1
  )
  echo.
  echo [4/4] 开始构建 Release APK（签名）...
  cd android
  call gradlew.bat assembleRelease --no-daemon
  cd ..
  set OUT=android\app\build\outputs\apk\release\app-release.apk
)

echo.
if exist "%OUT%" (
  echo ============================================================
  echo   构建成功！
  echo   输出文件: %CD%\%OUT%
  echo ============================================================
  for %%I in ("%OUT%") do echo   大小: %%~zI 字节
) else (
  echo   [ERROR] 构建失败，请检查上面的错误日志
  pause & exit /b 1
)
echo.
pause
exit /b 0

:download_wrapper
REM 简单提示：本地需手动下载或使用 setup-gradle.sh
echo   请手动执行: gradle wrapper --gradle-version 8.5
echo   （需要先单独安装一个 Gradle 用于生成 wrapper）
exit /b 0
