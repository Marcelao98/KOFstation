#!/bin/sh
# Copia os núcleos publicados do kofstation-old pra spike/web/nucleos/ (sem o hash no nome). Não vão pro git.
set -eu
ANTIGO="${1:?uso: spike/preparar.sh <pasta do kofstation-old>}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$AQUI/web/nucleos"
for n in snes9x genplus fceumm pcsx; do
  f="$(ls "$ANTIGO"/publicado/nucleos/"$n"-*.js | head -1)"
  cp "$f" "$AQUI/web/nucleos/$n.js"
done
ls -l "$AQUI/web/nucleos"
