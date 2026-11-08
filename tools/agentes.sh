#!/bin/sh
# Roda várias tarefas de docs/agentes/ ao mesmo tempo, sem precisar de ninguém digitando:
#   sh tools/agentes.sh A B
# Prepara a pasta de cada uma (tools/agente.sh), roda o agente em modo automático com o log em ../agente-<letra>.log,
# espera todos terminarem e mostra o que cada um enviou pro GitHub. O programa do agente vem de KOF_AGENTE_LOTE
# (padrão: o modo sem conversa do Codex, "codex exec --full-auto").
set -eu
cd "$(dirname "$0")/.."
[ $# -gt 0 ] || { echo "diga as tarefas: sh tools/agentes.sh A B"; exit 1; }
AGENTE="${KOF_AGENTE_LOTE:-codex exec --full-auto}"
RAIZ=$(cd .. && pwd)
for L in "$@"; do
  KOF_AGENTE=true sh tools/agente.sh "$L" # só prepara a pasta e o pedido
done
for L in "$@"; do
  m=$(printf '%s' "$L" | tr '[:upper:]' '[:lower:]')
  (
    cd "$RAIZ/KOFStation-agente-$m"
    # shellcheck disable=SC2086 # AGENTE pode ter mais de uma palavra
    if $AGENTE "$(cat .pedido-do-agente.txt)" > "$RAIZ/agente-$m.log" 2>&1; then
      echo "✓ agente $L terminou (log: $RAIZ/agente-$m.log)"
    else
      echo "✗ agente $L parou com erro (log: $RAIZ/agente-$m.log)"
    fi
  ) &
  echo "▶ agente $L rodando (acompanhe: tail -f $RAIZ/agente-$m.log)"
done
wait
echo
for L in "$@"; do
  m=$(printf '%s' "$L" | tr '[:upper:]' '[:lower:]')
  b=$(cd "$RAIZ/KOFStation-agente-$m" && git branch --show-current)
  echo "── $b no GitHub:"
  git fetch -q origin "$b" 2>/dev/null && git log --oneline -5 "origin/$b" || echo "   (nada enviado ainda)"
done
echo
echo "Agora volte no Claude (o orquestrador) e mande: \"os agentes $* terminaram, revisa e junta\"."
