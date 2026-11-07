#!/bin/sh
# Monta a pasta do KOFstation pra distribuir, igual à do antigo (D33):
#   KOFstation/kofstation (ou KOFstation.exe), nucleos/ (núcleos wasm com o hash no nome + lista.json),
#   nativo/ (PCSX nativo), versao.txt
# Uso (depois de `pnpm nucleos`, `KOF_NATIVOS=todas` se for montar pro Windows, `pnpm build` e o cargo build):
#   sh tools/empacotar.sh linux-x64|windows-x64 [pasta-de-saída]   (padrão: target/pacote/<plataforma>/KOFstation)
set -eu
cd "$(dirname "$0")/.."
PLAT="${1:?diga a plataforma: linux-x64 ou windows-x64}"
SAIDA="${2:-target/pacote/$PLAT/KOFstation}"
case "$PLAT" in
  linux-x64) EXE=target/release/kofstation; NOME=kofstation; NAT=pcsx_rearmed_libretro.so ;;
  windows-x64) EXE=target/x86_64-pc-windows-gnu/release/kofstation.exe; NOME=KOFstation.exe; NAT=pcsx_rearmed_libretro.dll ;;
  *) echo "plataforma desconhecida: $PLAT"; exit 1 ;;
esac
[ -f "$EXE" ] || { echo "falta compilar: $EXE"; exit 1; }
rm -rf "$SAIDA"
mkdir -p "$SAIDA/nucleos" "$SAIDA/nativo"
cp "$EXE" "$SAIDA/$NOME"
# núcleos em WebAssembly e dados: <nome>-<hash8>.<ext>, e a lista que o kofstation lê
lista="{"
sep=""
for f in apps/desktop/public/nucleos/*; do
  base=$(basename "$f")
  h=$(sha256sum "$f" | cut -c1-8)
  arq="${base%.*}-$h.${base##*.}"
  cp "$f" "$SAIDA/nucleos/$arq"
  lista="$lista$sep\"$base\": \"$arq\""
  sep=", "
done
printf '%s}\n' "$lista" > "$SAIDA/nucleos/lista.json"
NATIVO="third_party/cores/nativos/$PLAT/$NAT"
if [ -f "$NATIVO" ]; then cp "$NATIVO" "$SAIDA/nativo/$NAT"; else echo "aviso: sem $NATIVO (o PS1 roda só no WebAssembly)"; fi
{
  echo "versao=$(date -u +%Y%m%d%H%M)"
  echo "commit=$(git rev-parse --short HEAD 2>/dev/null || echo desconhecido)"
  echo "plataforma=$PLAT"
} > "$SAIDA/versao.txt"
du -sh "$SAIDA" "$SAIDA/$NOME" "$SAIDA/nucleos" "$SAIDA/nativo"
