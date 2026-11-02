#!/bin/sh
# Compila núcleos em WebAssembly que o app novo precisa com remendo próprio (M11b N.4): hoje o Snes9x com a sonda
# (tools/remendos/snes9x-sonda.patch: a onda de cada uma das 8 vozes e o mudo por voz, pra jukebox do SNES).
# Usa o construir.sh e a ponte.cpp do kofstation-old num commit fixo (baixados, nada muda no antigo) e o mesmo commit
# do Snes9x que ele usa, com o emscripten 3.1.6 do Ubuntu (o mesmo do antigo). Saída: third_party/cores/wasm/ (fora do git).
# Uso: sh tools/nucleos-wasm.sh          Precisa: emscripten (apt install emscripten), git, make, curl.
# Quem publica: o workflow .github/workflows/nucleos.yml (Release; o manifesto guarda o SHA-256).
set -eu
cd "$(dirname "$0")/.."
ANTIGO=ceba493fc494165de6f561b77a699fb8c22b295f
T="${T:-${TMPDIR:-/tmp}/kof-nucleos-wasm}"
C="$T/construir"
mkdir -p "$C" third_party/cores/wasm
for f in construir.sh ponte.cpp; do
  curl -fsSL -o "$C/$f" "https://raw.githubusercontent.com/Marcelao98/kofstation-old/$ANTIGO/nucleo-libretro/$f"
done
cp tools/remendos/snes9x-sonda.patch "$C/snes9x-sonda.patch"
T="$T/fontes" bash "$C/construir.sh" snes9x >"$T/snes9x.log" 2>&1 || { tail -40 "$T/snes9x.log"; exit 1; }
cp "$C/saida/snes9x.js" third_party/cores/wasm/snes9x-sonda.js
ls -l third_party/cores/wasm/
