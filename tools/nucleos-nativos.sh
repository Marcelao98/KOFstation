#!/bin/sh
# Compila os núcleos nativos (M11b) que o KOFstation leva: hoje o PCSX-ReARMed (PS1, GPL-2) com o recompilador
# lightrec, no MESMO commit do núcleo em wasm do antigo (nucleo-libretro/construir.sh do kofstation-old), pra estados e
# cartões de memória abrirem nos dois. Saída: third_party/cores/nativos/<plataforma>/ (fora do git).
# Uso: sh tools/nucleos-nativos.sh [linux-x64] [windows-x64]   (sem argumento: os dois)
# Precisa: git, make, gcc; pro Windows, o mingw-w64 (apt install mingw-w64 / dnf install mingw64-gcc).
# Quem publica: o workflow .github/workflows/nucleos-nativos.yml (anexos da Release; o manifesto guarda o SHA-256).
set -eu
cd "$(dirname "$0")/.."
PCSX_COMMIT=c8816799b50388e61cfe237fe2cdbb7d8175f20a
T="${T:-${TMPDIR:-/tmp}/kof-nucleos-nativos}"
J="$(nproc 2>/dev/null || echo 4)"
mkdir -p "$T"

fonte() {
  d="$T/pcsx-$1"
  if [ ! -d "$d/.git" ]; then
    git init -q "$d"
    git -C "$d" remote add origin https://github.com/libretro/pcsx_rearmed.git
  fi
  git -C "$d" fetch -q --depth 1 origin "$PCSX_COMMIT"
  git -C "$d" checkout -q -f FETCH_HEAD
  git -C "$d" clean -qfdx
  echo "$d"
}

linux() {
  d=$(fonte linux)
  make -C "$d" -f Makefile.libretro -j"$J" >"$T/linux.log" 2>&1 || { tail -30 "$T/linux.log"; exit 1; }
  mkdir -p third_party/cores/nativos/linux-x64
  strip -o third_party/cores/nativos/linux-x64/pcsx_rearmed_libretro.so "$d/pcsx_rearmed_libretro.so"
}

windows() {
  d=$(fonte windows)
  make -C "$d" -f Makefile.libretro -j"$J" platform=win \
    CC=x86_64-w64-mingw32-gcc CXX=x86_64-w64-mingw32-g++ AR=x86_64-w64-mingw32-ar >"$T/windows.log" 2>&1 ||
    { tail -30 "$T/windows.log"; exit 1; }
  mkdir -p third_party/cores/nativos/windows-x64
  x86_64-w64-mingw32-strip -o third_party/cores/nativos/windows-x64/pcsx_rearmed_libretro.dll \
    "$d/pcsx_rearmed_libretro.dll"
}

[ $# -eq 0 ] && set -- linux-x64 windows-x64
for p in "$@"; do
  case "$p" in
    linux-x64) linux ;;
    windows-x64) windows ;;
    *) echo "plataforma desconhecida: $p (use linux-x64 ou windows-x64)"; exit 1 ;;
  esac
  echo "✓ PCSX-ReARMed nativo $p (${PCSX_COMMIT%"${PCSX_COMMIT#???????}"})"
done
ls -l third_party/cores/nativos/*/
