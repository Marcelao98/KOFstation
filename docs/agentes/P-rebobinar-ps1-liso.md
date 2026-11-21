# Tarefa P · Rebobinar no PS1 nativo, liso (e sem encostar no PS2)

**Quem faz:** o Claude Code **no PC do Marcelo** (jogos de PS1 de verdade). **Branch:** `agente-p/rebob-ps1`, a partir
da branch da tarefa anterior (ou da `claude/busy-ritchie-wrvk8h`). Leia antes o [AGENTS.md](../../AGENTS.md), o
[LEIA-ME](LEIA-ME.md), o [REBOBINAR.md](../REBOBINAR.md) e as entradas do JORNAL de 19/11 sobre o rebobinar ("Regressão
da fase R no PS2" e "Rebobinar do PS1 aos trancos").

**Regras de sempre** (nome de jogo nunca no repositório: "jogo de teste PS1 A"; uma mudança por vez, medida; commits em
português, sem nome de modelo de IA; não abra PR). **Toda mudança no `kof-nativo` passa pelo banco do PS2**
(`tools/medir-ps2.mjs`): foi assim que o chiado do PS2 apareceu em 19/11.

## O pedido (21/11)

"Rebobinar no PS1 rodando liso: obrigatório."

## Onde está

- O rebobinar do PS1 nativo existe e funciona (`crates/kof-nativo/src/rebobinar.rs`, fase R.3/R.5: foto de ~1,1 ms,
  estado de 4,3 MB, até 96 MB de fotos, som invertido com fita e crossfade), mas está **desligado** desde 19/11:
  `SEM_REBOBINAR = new Set(['ps1', 'ps2'])` em `packages/engine/src/nativo.ts`.
- Por que desligou: o processo nativo ligava o rebobinar **em qualquer jogo**, inclusive no PS2 (foto de 48 MB a cada 2
  quadros → chiado e ~1000 engasgos/min). Hoje a página não liga no PS2 e o processo recusa estado > 24 MB
  (`FOTO_MAXIMA` em `filho.rs`).
- O "aos trancos" que ele sentiu no PS1 (jogo de plataforma a 30 quadros/s) foi medido em 19/11 sem defeito achado no
  processo (3–4 ms por passo pra trás, 60 imagens/s); as paradas medidas eram a tela preta do próprio jogo. **Falta
  saber em que momento ele sentiu o tranco.**

## Os passos

1. **Perguntar ao Marcelo** em que momento sentiu o tranco (logo ao apertar? correndo? depois de morrer? ao soltar?) e
   pedir um estado salvo naquele trecho (fora do repositório).
2. **Religar só o PS1** (`SEM_REBOBINAR` fica só com `ps2`) e medir no trecho dele com `tools/medir-rebob.mjs` (imagens
   novas/s, maior parada, som) e, **no mesmo dia, o PS2 com o `medir-ps2.mjs`** (tem que continuar como estava: 60 fps,
   0 faltas de som).
3. **Achar o tranco**, suspeitos pra conferir com número: jogo a 30 quadros/s (metade dos passos pra trás repetindo a
   mesma imagem — talvez voltar no ritmo do jogo, não de 60/s); o primeiro passo pra trás (montar a pilha de som,
   carregar o estado) e o soltar (crossfade + `terminarRebobinar`); linhas de vídeo/som do PCSX
   (`gpu_thread_rendering`, `spu_thread`) e a foto; fila de quadros da página durante o rebobinar.
4. **Corrigir** um por vez, medido, com teste (Rust e/ou e2e).

**Pronto quando:** ⏸ o Marcelo rebobina no trecho que tinha tranco e diz que está liso; o PS2 medido igual a antes; o
REBOBINAR.md e a fase R do ROADMAP atualizados (o PS1 religado).

## Relatório

Feito em 21/11, no modo automático (branch `agente-p/rebob-ps1`). Sem resposta dele sobre o momento do tranco: medi
os momentos que dá pra automatizar.

- **Religado só o PS1** (`SEM_REBOBINAR = new Set(['ps2'])`); teste em `engine/nativo.test.ts` trava PS1 ligado e
  PS2 desligado.
- **`tools/medir-rebob.mjs`:** abre com os dados da pasta de medidas (antes usava os de quem joga), mede três
  momentos (ao apertar, voltando, ao soltar), continua andando depois de soltar (parado, a tela quase não muda e
  parecia travada) e mostra, quadro a quadro, se a imagem que chega em volta do soltar é nova ou repetida.
- **Jogo de teste PS1 A** (do save automático dele, copiado pra pasta de medidas), 3 rodadas, soltando no meio da
  fita: ao apertar 54 imagens novas/s (maior intervalo 38 ms), voltando 51/s (23 ms), ao soltar 30/s (41 ms; o jogo
  roda a 30). **Nenhum tranco medido.**
- **A fita acabando com o botão apertado** (5 s de jogo voltam em 2,5 s): a imagem para e o jogo volta a andar sozinho;
  é o mesmo comportamento do WebAssembly. Primeira suspeita pro que ele sentiu, se não for o momento "depois de morrer".
- **PS2 no mesmo dia** (`medir-ps2.mjs`, jogo A, 2 rodadas): 59,9 fps, p99 24,5–25 ms, 18–28 engasgos/min, 0 faltas
  de som (19/11: 61/min).

**Ficou de fora:** ⏸ o momento "depois de morrer" precisa de um estado salvo dele naquele trecho; ⏸ ele rebobinar e
dizer se está liso.

**Conferir:** `node tools/medir-rebob.mjs "<nome na biblioteca>" --voltar 1.5 --soltar 2` (resultados em
`~/kof-medidas/resultados/2026-11-21-P-*.txt`).
