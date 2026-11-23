# 本地缺少 gradle wrapper jar 时的下载脚本
# CI 用 runner 自带的 Gradle，无需此文件；本地可手动执行： ./setup-gradle.sh
set -e
GRADLE_VERSION="8.5"
WRAPPER_DIR="gradle/wrapper"
mkdir -p "$WRAPPER_DIR"
echo "==> Downloading gradle-wrapper.jar ..."
curl -sSL -o "$WRAPPER_DIR/gradle-wrapper.jar" \
  "https://raw.githubusercontent.com/gradle/gradle/v${GRADLE_VERSION}/gradle/wrapper/gradle-wrapper.jar"
echo "==> Done. Now run: ./gradlew assembleDebug"
