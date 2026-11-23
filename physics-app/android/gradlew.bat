@if "%DEBUG%"=="" @echo off
@rem Gradle startup script (Windows) — 本地若无 gradle-wrapper.jar，
@rem 需先执行： gradle wrapper --gradle-version 8.5
set DIR=%~dp0
java -classpath "%DIR%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
