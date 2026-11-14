#!/bin/sh
# Publica o pacote de teste na branch órfã `teste-binarios` (um commit só, substituído a cada versão).
# Uso: sh tools/publicar-teste.sh <pasta com os 3 arquivos> <arquivo LEIA-ME.md> "<mensagem do commit>"
# Não usa a árvore de trabalho: monta um repositório temporário, commita e empurra com --force.
set -eu
PASTA="${1:?pasta com KOFstation-linux.tar.gz, KOFstation-instalar.exe e KOFstation-windows.zip}"
LEIA="${2:?o LEIA-ME.md da branch}"
MSG="${3:?mensagem do commit}"
REMOTO=$(git -C "$(dirname "$0")/.." remote get-url origin)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp "$PASTA/KOFstation-linux.tar.gz" "$PASTA/KOFstation-instalar.exe" "$PASTA/KOFstation-windows.zip" "$TMP/"
cp "$LEIA" "$TMP/LEIA-ME.md"
cd "$TMP"
git init -q -b teste-binarios
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-Marcelo}" -c user.email="${GIT_AUTHOR_EMAIL:-noreply@anthropic.com}" commit -q -m "$MSG"
git push -f "$REMOTO" teste-binarios
git log --oneline | head -1
