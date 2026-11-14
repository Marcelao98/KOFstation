#!/usr/bin/env bash
# Monta o KOFstation-novo.apk: a casca Java (android/src) com o app novo (apps/desktop/dist) dentro dos assets.
# Sem Gradle e sem o SDK completo, como o do antigo: usa as ferramentas do Ubuntu + JDK:
#   sudo apt install aapt apksigner zipalign libandroid-23-java dalvik-exchange android-sdk-platform-23 libandroid-json-org-java
# As bibliotecas nativas do PS1 e do N64 (ARM64: libkofps1, libkofn64, libretro, libn64) vêm do APK do antigo, que já as traz
# compiladas (sem NDK aqui): KOF_APK_ANTIGO=<kofstation-old>/android/apk/KOFstation.apk (nada de binário no histórico deste repositório).
# Antes: pnpm build (gera apps/desktop/dist com os núcleos). Uso: android/construir-apk.sh [saída.apk]
# A chave (android/kofstation-teste.keystore) é de TESTE (como a do antigo): serve pra instalar e atualizar por cima.
# Pra Play Store vai precisar de uma chave de verdade, guardada fora do repositório.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(dirname "$AQUI")"
DIST="$RAIZ/apps/desktop/dist"; [ -f "$DIST/index.html" ] || { echo "falta $DIST (rode pnpm build antes)"; exit 1; }
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
JSON_JAR="${JSON_JAR:-/usr/share/java/json-android.jar}"
APK_ANTIGO="${KOF_APK_ANTIGO:-$RAIZ/../marcelao98/kofstation-old/android/apk/KOFstation.apk}"
OUT="${1:-$RAIZ/target/KOFstation-novo.apk}"
W="${W:-$RAIZ/target/apk-work}"; rm -rf "$W"; mkdir -p "$W/classes" "$W/assets/web" "$W/res" "$W/src" "$(dirname "$OUT")"
# versão: código cresce a cada build (minutos desde 1/1/2026), nome = data
CODIGO="$(python3 -c 'import time; print((int(time.time()) - 1767225600) // 60)')"; NOME="$(date -u +%Y.%m.%d.%H%M)"
cp -r "$AQUI/res/." "$W/res/"; cp -r "$AQUI/src/." "$W/src/"
sed "s/@VERSAO_CODE@/$CODIGO/; s/@VERSAO_NOME@/$NOME/" "$AQUI/AndroidManifest.xml" > "$W/AndroidManifest.xml"
find "$W/src" -name '*.java' -exec sed -i "s/@VERSAO_NOME@/$NOME/" {} +
cp -r "$DIST/." "$W/assets/web/"
# PS1 e N64 vão nativos (abaixo). O WebAssembly deles fica no APK só de reserva (o app cai nele se a .so não carregar)
# ícone: o da xícara do app, em vários tamanhos
mkdir -p "$W/icone" && python3 "$RAIZ/tools/icone.py" "$W/icone" >/dev/null
python3 - "$W/icone/icone.png" "$W/res" <<'PY'
import os, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
for d, n in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
    os.makedirs(f"{sys.argv[2]}/mipmap-{d}", exist_ok=True)
    im.resize((n, n), Image.LANCZOS).save(f"{sys.argv[2]}/mipmap-{d}/ic_launcher.png")
PY
javac -encoding UTF-8 --release 8 -Xlint:-options -cp "$ANDROID_JAR:$JSON_JAR" -d "$W/classes" $(find "$W/src" -name '*.java') 2>&1 | grep -v "^Picked up" || true
[ -n "$(find "$W/classes" -name '*.class' | head -1)" ] || { echo "a compilação do Java falhou"; exit 1; }
dalvik-exchange --dex --min-sdk-version=24 --output="$W/classes.dex" "$W/classes" 2>&1 | grep -v "^Picked up" || true
aapt package -f -M "$W/AndroidManifest.xml" -S "$W/res" -A "$W/assets" -I "$ANDROID_JAR" --min-sdk-version 24 --target-sdk-version 34 -F "$W/base.apk"
(cd "$W" && aapt add base.apk classes.dex >/dev/null)
# PS1 e N64 nativos: as .so ARM64 do APK do antigo (sem elas o app usa o WebAssembly, que é bem mais lento)
if [ -f "$APK_ANTIGO" ]; then
  mkdir -p "$W/lib/arm64-v8a" && (cd "$W" && unzip -qo "$APK_ANTIGO" 'lib/arm64-v8a/libkofps1.so' 'lib/arm64-v8a/libkofn64.so' 'lib/arm64-v8a/libretro.so' 'lib/arm64-v8a/libn64.so' 'lib/arm64-v8a/libkofrede.so')
  (cd "$W" && aapt add base.apk lib/arm64-v8a/libkofps1.so lib/arm64-v8a/libkofn64.so lib/arm64-v8a/libretro.so lib/arm64-v8a/libn64.so lib/arm64-v8a/libkofrede.so >/dev/null)
else
  echo "AVISO: sem $APK_ANTIGO: o APK sai SEM o PS1/N64 nativos (diga KOF_APK_ANTIGO=...)"
fi
zipalign -f -p 4 "$W/base.apk" "$W/alinhado.apk"
KS="$AQUI/kofstation-teste.keystore"
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass kofstation-teste -keypass kofstation-teste -alias kofstation -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=KOFstation teste, O=KOFstation, C=BR" 2>&1 | grep -v "^Picked up"
apksigner sign --ks "$KS" --ks-pass pass:kofstation-teste --key-pass pass:kofstation-teste --ks-key-alias kofstation --out "$OUT" "$W/alinhado.apk" 2>&1 | grep -v "^Picked up" || true
apksigner verify -v "$OUT" 2>&1 | grep -v "^Picked up" | head -4 || true
ls -l "$OUT"
