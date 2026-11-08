#!/bin/sh
# Abre um agente numa tarefa de docs/agentes/ (orquestração, PLANO.md), sem digitar nada:
#   sh tools/agente.sh A            → pasta ../KOFStation-agente-a, branch agente-a/ritmo-wasm, e abre o agente
#   KOF_AGENTE="claude" sh tools/agente.sh B   → outro programa (padrão: codex)
#   KOF_AGENTE="echo" sh tools/agente.sh A     → só prepara e mostra o pedido
# Cada tarefa ganha uma pasta própria (git worktree) com dependências e núcleos, pra dois agentes não se atrapalharem.
# Rodar de novo na mesma tarefa reaproveita a pasta e a branch (puxa o que já tiver no GitHub).
set -eu
cd "$(dirname "$0")/.."
BASE=claude/busy-ritchie-wrvk8h
LETRA=$(printf '%s' "${1:?diga a tarefa: A, B, ... (lista em docs/agentes/LEIA-ME.md)}" | tr '[:lower:]' '[:upper:]')
git fetch -q origin "$BASE"
ARQ=$(git ls-tree --name-only "origin/$BASE" docs/agentes/ | grep "^docs/agentes/$LETRA-" | head -n 1 || true)
[ -n "$ARQ" ] || { echo "tarefa $LETRA não existe (ainda) em docs/agentes/ da branch $BASE"; exit 1; }
NOME=$(basename "$ARQ" .md | cut -d- -f2-)
minus=$(printf '%s' "$LETRA" | tr '[:upper:]' '[:lower:]')
BRANCH="agente-$minus/$NOME"
PASTA="../KOFStation-agente-$minus"

if [ -d "$PASTA" ]; then
  echo "▶ a pasta $PASTA já existe: continuando nela"
  (cd "$PASTA" && git fetch -q origin && { git pull -q --ff-only origin "$BRANCH" 2>/dev/null || true; })
else
  if git ls-remote --exit-code --heads origin "$BRANCH" > /dev/null 2>&1; then
    git fetch -q origin "$BRANCH"
    git worktree add -q -B "$BRANCH" "$PASTA" "origin/$BRANCH"
  else
    git worktree add -q -b "$BRANCH" "$PASTA" "origin/$BASE"
  fi
  echo "▶ pasta $PASTA na branch $BRANCH"
  (cd "$PASTA" && pnpm install --frozen-lockfile > /dev/null)
  # os núcleos: copia da pasta principal se já tiver (conferidos pelo SHA-256 do manifesto); senão baixa
  if [ -d third_party/cores/nativos ]; then
    cp -R third_party/cores/. "$PASTA/third_party/cores/"
  fi
  (cd "$PASTA" && KOF_NATIVOS=todas pnpm nucleos > /dev/null)
fi

PEDIDO="Repositório Marcelao98/KOFStation. Você está na pasta $(cd "$PASTA" && pwd), branch $BRANCH (criada a partir da $BASE). Leia o AGENTS.md, depois docs/agentes/LEIA-ME.md e faça a tarefa de $ARQ. Trabalhe e faça push só na branch $BRANCH (git push -u origin $BRANCH), sem abrir PR. Antes de cada push: pnpm check (e pnpm check:rust se mexer no Rust, pnpm e2e se mexer em tela ou jogo). Ao terminar, preencha a seção Relatório no fim de $ARQ e faça o último push."
printf '%s\n' "$PEDIDO" > "$PASTA/.pedido-do-agente.txt"
echo "▶ pedido salvo em $PASTA/.pedido-do-agente.txt"
cd "$PASTA"
# shellcheck disable=SC2086 # KOF_AGENTE pode ter mais de uma palavra (ex.: "happier codex")
exec ${KOF_AGENTE:-codex} "$PEDIDO"
