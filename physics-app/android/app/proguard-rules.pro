# 网页资源全部打包进 assets，ProGuard 只处理原生桥，保持默认即可
-keep class com.getcapacitor.** { *; }
-keep class com.physics.learn.** { *; }
-keepattributes *Annotation*
