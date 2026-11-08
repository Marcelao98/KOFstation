# Tarefa A · Ritmo dos quadros no WebAssembly

**Branch:** `agente-a/ritmo-wasm` (a partir da `claude/busy-ritchie-wrvk8h`). Leia antes o [LEIA-ME](LEIA-ME.md).

## O problema

O Marcelo disse que **o app antigo (`kofstation-old`) roda bem mais liso** que o novo. Isso já aparece em número:
no Game Boy rodando no WebAssembly, o medidor novo (M16) deu **p50 18,75 ms e p95 22,75 ms entre quadros, com o certo
16,74 ms** (59,73 fps). O quadro chega numa média certa, mas desigual. Na tela, isso é tremido: um quadro repetido aqui,
um pulado ali.

Esta tarefa é só sobre os consoles que rodam **em WebAssembly**: SNES, GB/GBC/GBA, NES, Mega/Master/Game Gear, Neo Geo,
N64 e o PS1 de reserva. O PS1 e o PS2 nativos rodam num processo à parte (`crates/kof-nativo`) e **ficam fora**.

## Como o novo funciona hoje

- `packages/engine/src/worker.ts`: o núcleo roda num Worker. `passoSemErro()` se agenda com `setTimeout(passo, 4)`.
  Com som, roda quadros enquanto o anel de som tiver menos de 60 ms (`taxaSaida * 0.06`), no máximo
  `MAX_QUADROS_POR_PASSO` (4). Sem som, usa o relógio (`tempo.ts`, `criarRelogio`). A imagem vai pra página por
  `postMessage` uma vez por passo (`mandarQuadro`).
- `packages/engine/src/anel.ts`: o anel de som em SharedArrayBuffer. O AudioWorklet consome no relógio da placa de som.
- `packages/engine/src/jogo.ts`: o lado da página. Cria o Worker e o AudioWorklet e recebe os quadros.
- `apps/desktop/src/hooks/useTelaDoJogo.ts`: a cada `requestAnimationFrame` desenha o **último** quadro que chegou.
  Se chegaram dois entre um vsync e outro, um some; se não chegou nenhum, repete.
- Medição (M16, já pronta): `domain/desempenho.ts` (percentis, engasgos e o culpado), `app-core/desempenho.ts`
  (`MedidorDaSessao`, que junta o desenho da página), F3 com gráfico, e o 🩺 modo diagnóstico (Ajuda), que grava
  `quadros.csv`. O Worker manda `porQuadro` (6 números por quadro, em µs) a cada segundo.

## Como o antigo fazia

Tudo na linha principal, num laço de `requestAnimationFrame` (`laco` em `app.js:1141`, `rodarQuadro` em `app.js:1708`,
`QUADRO_MS`, pular quadros por `lr_audio_status`). Leia **só essas linhas** (o `app.js` tem 308 KB). O vsync dita a
hora de rodar e de desenhar, então quadro rodado e quadro mostrado andam juntos.

## O que fazer

1. **Medir antes, do jeito que o olho vê.** Escreva `tools/medir-ritmo.mjs`, um script Playwright (o Chromium do
   container já serve: `require('playwright')`) que abre o app novo (`pnpm build && pnpm preview`, igual ao e2e) e o
   antigo (servido como página estática da pasta do clone) com **a mesma ROM gerada pelos testes**
   (`apps/desktop/e2e/roms.ts`; nunca ROM de verdade). Por ~10 s, em cada `requestAnimationFrame`, conte se o quadro
   na tela é novo, repetido ou se pulou um (assinatura do canvas, ou o número do quadro se a ROM desenhar um
   contador). Saída: quadros repetidos e pulados por minuto, e o p50/p95/p99 do intervalo entre quadros novos.
   Rode nos dois apps e anote.
2. **Achar a causa.** Hipóteses, não receitas: o `setTimeout(4)` acorda atrasado e em lote; o ritmo pelo som e o
   vsync da tela brigam; dois quadros chegam no mesmo vsync; o `postMessage` com cópia; o alvo de 60 ms no anel.
3. **Corrigir** sem perder o que existe: som sem picote (as faltas de som não podem subir), turbo, rebobinar
   (`rebobinador.ts`), caçador de bugs/replay (o determinismo: os mesmos botões no mesmo quadro), pausa, os
   `porQuadro` do medidor e o PS1 de reserva. Caminhos possíveis: o Worker esperar com `Atomics.wait` em vez de
   `setTimeout`; a página pedir o quadro no rAF; uma fila de 1–2 quadros apresentada no vsync; outro alvo pro anel.
   Escolha pelo número.
4. **Medir depois** com o mesmo script e deixar o novo **igual ou melhor que o antigo** em repetidos/pulados por
   minuto, sem subir as faltas de som.

## Pode mexer

`packages/engine/src/{worker,tempo,jogo,anel,mensagens}.ts` (e testes), `apps/desktop/src/hooks/useTelaDoJogo.ts`,
`packages/app-core/src/desempenho.ts` (só se precisar de uma medida nova), `tools/medir-ritmo.mjs` (novo), um teste
e2e novo se quiser (`apps/desktop/e2e/ritmo.spec.ts`).

**Não mexa:** Rust (`crates/`), `packages/domain/src/desempenho.ts` (pode acrescentar, não mudar o que existe), o
contrato do nativo, docs fora desta pasta.

## Pronto quando

- `tools/medir-ritmo.mjs` roda com um comando e imprime os números do novo e do antigo.
- Número de antes e depois no relatório, e o novo no mínimo empatado com o antigo.
- `pnpm check` e `pnpm e2e` verdes (incluindo `rebob.spec`, `saves.spec`, `jogo.spec`).

## Relatório

_(preencha ao terminar: o que mudou e por quê, os números de antes e depois do novo e do antigo, o que ficou de fora,
e os comandos pra conferir)_
