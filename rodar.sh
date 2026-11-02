#!/bin/sh
# Compila e abre o KOFstation (app novo) a partir do código. Uso: sh rodar.sh
# Precisa de: Node 22+, Rust pelo rustup e um navegador da família Chrome (Chrome, Chromium, Edge, Brave, Vivaldi).
set -eu
cd "$(dirname "$0")"

falta=""
command -v node >/dev/null 2>&1 || falta="$falta node"
command -v cargo >/dev/null 2>&1 || falta="$falta rust"
command -v cc >/dev/null 2>&1 || falta="$falta gcc"
# som dos núcleos nativos (cpal): cabeçalhos do ALSA
if [ "$(uname -s)" = Linux ]; then
  pkg-config --exists alsa 2>/dev/null || falta="$falta alsa(cabeçalhos-do-som)"
fi
if [ -n "$falta" ]; then
  echo "Falta instalar:$falta"
  if command -v dnf >/dev/null 2>&1; then
    echo "  sudo dnf install -y nodejs gcc git alsa-lib-devel pkgconf-pkg-config"
  elif command -v apt-get >/dev/null 2>&1; then
    echo "  sudo apt install -y nodejs npm gcc git curl libasound2-dev pkg-config"
  fi
  echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   (Rust; depois abra um terminal novo)"
  exit 1
fi
v=$(node -p 'process.versions.node.split(".")[0]')
if [ "$v" -lt 22 ]; then echo "O Node é $v: precisa do 22 ou mais novo."; exit 1; fi
if ! command -v rustup >/dev/null 2>&1; then
  echo "Aviso: Rust sem rustup. Se der erro de versão, instale pelo rustup (https://rustup.rs)."
fi

PNPM="npx --yes pnpm@10.28.0"
command -v pnpm >/dev/null 2>&1 && PNPM=pnpm

echo "== 1/4 dependências do app"
$PNPM install --frozen-lockfile
echo "== 2/4 núcleos dos emuladores (do kofstation-old, conferidos por SHA-256)"
node tools/baixar-nucleos.mjs
echo "== 3/4 app web"
$PNPM build
echo "== 4/4 executável (a primeira vez demora uns minutos)"
cargo build --release -p kof-app
echo "== abrindo: target/release/kofstation"
exec ./target/release/kofstation "$@"
