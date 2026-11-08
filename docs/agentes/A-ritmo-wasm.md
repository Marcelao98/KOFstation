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

Branch: `claude/stoic-bardeen-ed0dvt` (a da sessão, a partir da `claude/busy-ritchie-wrvk8h`, com o ok do Marcelo).

### Números (Game Boy, Chromium do container, tela de 60 Hz, `tools/medir-ritmo.mjs`)

| | novos/s | repetidos/min | pulados/min | intervalo p50 / p95 / p99 (ms) | falta de som |
|---|---|---|---|---|---|
| **novo antes** | 51–53 | 432–529 | 414–511 | 16,67 / 33,33 / 33,34 | 0 ms |
| **antigo** | 59,7 | 16–18 | 0 | 16,7 / 16,8 / 16,8 | 0 ms |
| **novo depois** (10 s) | 60 | **0** | **0** | 16,66 / 16,67 / 16,67 | 0 ms |
| **novo depois** (30 s) | 59,8 | 4 | 0 | 16,67 / 16,67 / 16,67 | 0 ms |
| **novo depois** (CPU 4x mais lenta) | 60 | 0 | 0 | 16,66 / 16,67 / 16,67 | 0 ms |

Os 16–18 repetidos/min do antigo são inevitáveis no jeito dele: o GB tem 59,73 quadros/s e a tela 60, então ~16 vsyncs
por minuto não têm quadro novo (coluna `inevitaveisSemTravaPorMin`). Os 4/min do novo em 30 s são um vsync que o
próprio Chromium perdeu (a tela deu 59,87 Hz nessa medida). Rodei várias vezes; nos trancos do container os dois apps
perdem alguns quadros iguais.

### A causa

O Worker rodava pelo **som** (encher o anel até 60 ms, `setTimeout(4)`), num relógio que não tem nada a ver com o vsync
da tela. Os quadros saíam em rajadas (0, 1 ou 2 por passo) e a página desenhava o último que tinha chegado: num vsync
chegavam dois (um some = pulado), no seguinte nenhum (repetido). O antigo não tinha isso porque rodava o quadro dentro
do `requestAnimationFrame`.

### O que mudou

- **Ritmo pelo vsync** (`jogo.ts`, `worker.ts`, `mensagens.ts`): a página manda `{tipo:'vsync', t}` a cada
  `requestAnimationFrame` e o Worker roda o quadro na hora; a imagem chega antes do vsync seguinte e o
  `useTelaDoJogo` (sem mudança) desenha. Igual ao antigo, só que o núcleo continua no Worker.
- **Trava no monitor** (`tempo.ts`, `criarRitmoDoVsync`): mede o período do vsync; se o fps do console está a até 1% do
  monitor (GB 59,73 / NES 60,1 / SNES 60,1 num de 60 Hz; também 120 Hz = 1 quadro a cada 2 vsyncs), roda exatamente
  1 quadro por vsync. Por isso o novo fica **melhor** que o antigo (0 repetidos em vez de 16/min). O jogo anda até 1%
  mais rápido/lento que o console (GB +0,46%), como o RetroArch com sincronia de vídeo. Sem trava (144 Hz, PAL 50 Hz)
  soma o tempo como o antigo. A sobra começa em meio quadro, então tremido de vsync não vira 0/2 quadros.
- **O som segue a imagem** (`reamostrador.ts` ganhou `velocidade`; `worker.ts` `ajusteDoSom`): o reamostrador compensa o
  fator da trava e mais ±0,5% pra manter o anel em ~60 ms (controle dinâmico de taxa do RetroArch). Som quase acabando
  (começo, volta da pausa) é completado com silêncio até o alvo (`encherComSilencio`).
- **Sem vsync, o de antes:** aba escondida/minimizada (100 ms sem vsync) volta ao passo de 4 ms pelo som (ou relógio).
  E se a página trava um pouco com o vsync ligado (o salvar automático a cada 30 s fazia isso: dava ~15–30 ms de falta
  de som na primeira versão), o Worker roda pelo som enquanto o anel estiver abaixo de 15 ms e o vsync seguinte não
  corre atrás (`rodouNoBuraco`). Resultado: 0 ms de falta de som em todas as medidas.
- Turbo (4 por vsync, como o antigo), rebobinar (60 voltas/s pelo tempo do vsync), pausa, caçador/replay (os botões
  continuam por quadro), `porQuadro` do M16 e o PS1 de reserva passam pelo mesmo caminho; os nativos não mudaram.

Arquivos fora da lista da tarefa (mínimo): `packages/engine/src/reamostrador.ts` (o campo `velocidade`) e
`apps/desktop/e2e/roms.ts` (a `romGbContador`, usada pelo script e pelo e2e).

### Testes

- `tempo.test.ts`: trava em 1 por vsync (GB/NES, com vsync tremendo ±3 ms), vsync perdido roda 2, 120 Hz alterna, 144 Hz e
  PAL não travam, engasgo grande no máximo 4. `som.test.ts`: velocidade do reamostrador.
- `apps/desktop/e2e/ritmo.spec.ts`: 5 s de GB, no máximo 12 repetidos e 12 pulados em ~300 vsyncs (sem a correção dá 53).
- `pnpm check` verde; `pnpm e2e` 45 passaram, 1 pulado (o `visual-paridade`, que já pulava). Não mexi no Rust.

### Ficou de fora

- Medi só o Game Boy (é o que tem uma ROM-contador). Núcleos pesados (N64, PS1 de reserva) também rodam 1 por vsync, mas
  se o quadro levar mais que ~16 ms o Worker atrasa e a página repete; o antigo também. Uma fila de 1 quadro na página
  seria o próximo passo se o M16 mostrar isso.
- O headless tem vsync perfeito; num monitor de verdade (Linux/Windows do Marcelo) vale rodar o 🩺 diagnóstico ou o F3.

### Pra conferir

```bash
pnpm build && node tools/medir-ritmo.mjs --antigo ../kofstation-old
```

```bash
node tools/medir-ritmo.mjs --segundos 30 --lento 4
```

```bash
pnpm --filter @kof/desktop exec playwright test e2e/ritmo.spec.ts
```

(`KOF_RITMO_FILA=1` mostra o som no anel segundo a segundo do novo.)
