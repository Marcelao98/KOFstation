#!/bin/sh
# Pacote do Windows (M15.3): completa a pasta do tools/empacotar.sh com o ícone e o LEIA-ME e faz o instalador
# (KOFstation-instalar.exe, NSIS, sem administrador) e a versão sem instalar (KOFstation-windows.zip).
# Uso: sh tools/pacote-windows.sh <pasta KOFstation> <pasta de saída>   (precisa do python3 com Pillow, makensis e zip)
set -eu
cd "$(dirname "$0")/.."
PASTA="${1:?a pasta montada pelo empacotar.sh}"
SAIDA="${2:?onde pôr os pacotes}"
[ -f "$PASTA/KOFstation.exe" ] || { echo "falta $PASTA/KOFstation.exe (rode o tools/empacotar.sh windows-x64)"; exit 1; }
python3 tools/icone.py "$PASTA"
rm -f "$PASTA/icone.png"
# fim de linha do Windows (o Bloco de Notas antigo mostra tudo numa linha só sem isso)
sed 's/$/\r/' tools/pacote/LEIA-ME-windows.txt > "$PASTA/LEIA-ME.txt"
mkdir -p "$SAIDA"
SAIDA=$(cd "$SAIDA" && pwd)
PASTA=$(cd "$PASTA" && pwd)
VERSAO=$(sed -n 's/^versao=//p' "$PASTA/versao.txt")
makensis -V2 -DORIGEM="$PASTA" -DSAIDA="$SAIDA/KOFstation-instalar.exe" -DVERSAO="$VERSAO" tools/pacote/instalador.nsi
rm -f "$SAIDA/KOFstation-windows.zip"
(cd "$(dirname "$PASTA")" && zip -qr -X "$SAIDA/KOFstation-windows.zip" "$(basename "$PASTA")")
ls -l "$SAIDA/KOFstation-instalar.exe" "$SAIDA/KOFstation-windows.zip"
