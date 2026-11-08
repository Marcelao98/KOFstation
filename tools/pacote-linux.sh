#!/bin/sh
# Pacote do Linux (M15.2): completa a pasta do tools/empacotar.sh com o ícone e o LEIA-ME e faz o .tar.gz.
# Instalar = extrair onde quiser e rodar ./kofstation --instalar (menu de aplicativos), como o kofnes.sh do antigo.
# Uso: sh tools/pacote-linux.sh <pasta KOFstation> <pasta de saída>   (precisa do python3 com Pillow, pro ícone)
set -eu
cd "$(dirname "$0")/.."
PASTA="${1:?a pasta montada pelo empacotar.sh}"
SAIDA="${2:?onde pôr o .tar.gz}"
[ -x "$PASTA/kofstation" ] || { echo "falta $PASTA/kofstation (rode o tools/empacotar.sh linux-x64)"; exit 1; }
python3 tools/icone.py "$PASTA"
rm -f "$PASTA/icone.ico"
cp tools/pacote/LEIA-ME-linux.txt "$PASTA/LEIA-ME.txt"
mkdir -p "$SAIDA"
SAIDA=$(cd "$SAIDA" && pwd)
# dono e datas fixos: o mesmo conteúdo dá o mesmo arquivo
tar -C "$(dirname "$PASTA")" --owner=0 --group=0 --numeric-owner --sort=name -czf "$SAIDA/KOFstation-linux.tar.gz" "$(basename "$PASTA")"
ls -l "$SAIDA/KOFstation-linux.tar.gz"
