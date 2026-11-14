#!/bin/sh
# Compila e roda o teste de JVM dos comandos da casca (sem Android). Precisa do JDK e do pacote libandroid-json-org-java
# (o org.json que o Android já traz): sudo apt install default-jdk-headless libandroid-json-org-java
set -eu
cd "$(dirname "$0")"
JSON="${JSON_JAR:-/usr/share/java/json-android.jar}"
OUT="${TMPDIR:-/tmp}/kof-android-teste"
rm -rf "$OUT" && mkdir -p "$OUT"
javac -encoding UTF-8 -cp "$JSON" -d "$OUT" src/dev/kofstation/android/Comandos.java teste/ComandosTeste.java
java -cp "$OUT:$JSON" ComandosTeste
