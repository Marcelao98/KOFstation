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

**e2e:** `pnpm e2e` 44 passou, 1 pulado (visual-paridade, já era assim). `pnpm check` verde.

**Nota:** o pedido falava em `B-ritmo-wasm.md`, que não existe; a tarefa de ritmo é esta (`A-ritmo-wasm.md`). Branch usada:
`claude/fervent-brahmagupta-zq12qz` (a partir da `claude/busy-ritchie-wrvk8h`), e não `agente-a/ritmo-wasm`.

**Causa.** O Worker produz quadros por timer (`setTimeout(4)`) segurando ~60 ms de som no anel, então os quadros chegam
na página em rajadas (0, 2, 1...). A tela mostrava "o último que chegou" a cada vsync: rajada de 2 = um some (pulado);
passo sem quadro = o anterior repete. Não é o `postMessage` nem o alvo do anel: é a falta de uma fila entre a chegada e o vsync.

**Correção** (só `packages/engine/src/jogo.ts`, lado da página): os quadros do Worker entram numa fila e saem **um por
vsync** (`requestAnimationFrame`), com 1 quadro de folga (um quadro sozinho espera o próximo por até 34 ms; depois sai,
pra pausa e estado carregado não ficarem presos). Fila acima de 3 descarta os mais velhos (`descartados`). Worker,
som, turbo, rebobinar, caçador/replay e `porQuadro` ficaram intactos (nada mudou no Worker nem no anel).

**Medição** (`tools/medir-ritmo.mjs`, ROM de Game Boy gerada que anda o fundo 1 px por quadro; por minuto):

| | novos | repetidos | pulados | p50 / p95 / p99 (ms) |
|---|---|---|---|---|
| novo ANTES (20 s, CPU 1x) | 3141 | 476 | 440–461 | 16,67 / 33,34 / 33,34 |
| novo DEPOIS (30 s, CPU 1x) | 3574 | 20 | 8 | 16,67 / 16,67 / 16,67 |
| antigo (30 s, CPU 1x) | 3582 | 0 | 2 | 16,7 / 16,8 / 16,8 |
| novo DEPOIS (20 s, CPU 4x) | 3327 | 9 | 255 | 16,67 / 33,33 / 33,34 |
| antigo (20 s, CPU 4x) | 2982 | 0 | 603 | 16,7 / 33,4 / 33,4 |

Leitura: pulados e p95/p99 empatam com o antigo; os repetidos (~10–20/min) são o que sobra de 60 Hz da tela contra
59,73 do console (o antigo mostra 0 porque o medidor não separa esses quadros; os "novos" dele somam um pouco menos
de 60/s também). Com CPU 4x o novo fica melhor (255 contra 603 pulados). Faltas de som: o Worker/anel não foram
tocados. O custo é ~1 quadro (16 ms) de atraso de imagem. Rodei no Chromium com SwiftShader, vsync de 60 Hz; num monitor de
144 Hz ou VRR os números mudam, e não medi o som de ouvido.

**De fora:** não mexi em `stores/jogo.ts` (`med.chegou()` agora conta a chegada no vsync, não a do Worker; o
`porQuadro` do Worker continua com a verdade do lado do núcleo), nem em turbo (a fila corta pra 3 e o turbo mostra
menos quadros, como já era com "último que chegou"). Não escrevi spec e2e nova.

**Conferir:**
```bash
pnpm build && node tools/medir-ritmo.mjs --segundos 30
node tools/medir-ritmo.mjs --so novo --segundos 20 --cpu 4
```
(precisa do clone do antigo em `../kofstation-old`, ou `--antigo <pasta>`; `RITMO_DEBUG=1` mostra a sequência de imagens.)
