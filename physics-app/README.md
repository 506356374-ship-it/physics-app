# 物理学习 App · Capacitor 套壳工程

把「初高中物理学习 App」网页版打包成安卓 APK 的工程，**支持 GitHub Actions 云端自动构建**——Win7 本地可以不装 JDK/Android SDK，只管 `git push`。

## 目录结构

```
physics-app/
├── www/                       网页资产（index.html 用 ./ 相对路径，套壳不白屏）
├── capacitor.config.ts        Capacitor 5 配置（包名 com.physics.learn）
├── package.json              依赖：@capacitor/core@5.7 / cli@5.7
├── tsconfig.json
├── build.bat                 Win 一键打包（环境自检 → 装依赖 → 同步 → 出包）
├── build.sh                  Linux/Mac 一键打包
├── make-icons.js             生成占位启动图标
├── gradle/wrapper/           Gradle 8.5 wrapper 配置
├── android/                  Android 工程（需本地先跑 npx cap add android 生成）
│   ├── build.gradle          项目级：AGP 8.1.4 + JDK 17
│   ├── settings.gradle
│   ├── gradle.properties     daemon 关闭 / JVM 2G
│   ├── keystore.properties.example   签名配置模板
│   └── app/
│       ├── build.gradle      模块级：compileSdk 34 / minSdk 22
│       ├── proguard-rules.pro
│       └── src/main/         Manifest + res（图标/主题/file_paths）
└── .github/workflows/
    ├── build-debug.yml       push 到 main 自动出 debug APK
    └── build-release.yml     tag 推送或手动触发，出签名 release APK
```

## 方案对比

| 方式 | 本地需装 | 适合场景 |
|------|----------|----------|
| **吐司** | 只装 App | 快速出包、不看代码 |
| **Win7 本地 Capacitor** | JDK8 + Node14 + SDK28 | 能改代码、能离线 |
| **GitHub Actions** | Git 即可 | 代码在仓库、云端出包、免费、可签名 |

## 一、GitHub Actions 云端打包（推荐，零本地环境）

### 1. 把本仓库推到 GitHub

```bash
git init
git add .
git commit -m "init: physics app capacitor project"
git branch -M main
git remote add origin https://github.com/<你的用户名>/physics-app.git
git push -u origin main
```

### 2. 自动出 Debug APK

推送后到仓库 **Actions** 标签，点 `Build Android Debug APK` 运行记录 → 底部 **Artifacts** → 下载 `physics-debug-apk` → 解压即得 `app-debug.apk`。

### 3. 出正式签名 Release APK

**a) 本地生成 keystore（只需一次）**
```bash
keytool -genkeypair -v -keystore android/release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias physics-key
```
把 `android/keystore.properties.example` 复制成 `android/keystore.properties`，填入密码和别名。

**b) 把 keystore 转成 base64**
```bash
# Linux/Mac
base64 -w0 android/release.jks > release.b64
# Win7（需装 Git Bash 或用 certutil）
certutil -encode android/release.jks release.b64
```

**c) 在 GitHub 仓库添加 4 个 Secrets**
仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Secret 名称 | 值 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | release.b64 文件全部内容 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码 |
| `ANDROID_KEY_ALIAS` | `physics-key` |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

**d) 触发构建**
- 推送 tag：`git tag v1.0 && git push origin v1.0`，自动构建并发布到 GitHub Releases
- 或到 Actions 页面手动 Run workflow 选 `Build Android Signed Release APK`

构建完会自动签名并验证（`apksigner verify`），产物同时作为 Artifact 和 Release 附件留存。

## 二、本地打包（Win7 也能跑，但要装 JDK17+Node20+SDK34）

> 注意：本工程升级到了 **Capacitor 5 + AGP 8.1 + JDK 17**。Win7 上 JDK 17 仍可运行（Temurin 17 官方支持 Win7），但 Android Studio 新版不行，建议纯命令行。若坚持 Win7 老栈，用上一版手册里的 Capacitor 4 + JDK8 + AGP 4.1。

```bat
build.bat
```
脚本会自检 JDK/Node/Gradle → 装依赖 → `cap sync` → 让你选 Debug 或 Release → 出包。

## 三、常见问题

| 问题 | 原因/解决 |
|------|-----------|
| `./gradlew: Permission denied` | CI 脚本里已含 `chmod +x`，本地 Mac/Linux 手动执行一次 |
| `Unsupported class file major version` | JDK 版本不对，必须用 **17** |
| `SDK location not found` | 设 `ANDROID_HOME` 或在 `local.properties` 写 `sdk.dir=` |
| 套壳后白屏 | `www/index.html` 里资源必须是 `./app.js` 相对路径 |
| Artifact 找不到 | 看 Actions 运行日志，绿色勾≠产物成功，要点进看 Steps |
| `keystore was tampered` | base64 转码时带了换行或头尾标记，用 `-w0` 或去干净 |

## 四、版本说明

- 包名：`com.physics.learn`
- compileSdk 34 / minSdk 22 / targetSdk 34
- 应用无联网权限，纯离线；localStorage / Blob 导出均可用
