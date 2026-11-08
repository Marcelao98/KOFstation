# Tarefa C · Ritmo dos quadros do PS2/PS1 nativo (PS2 liso)

**Branch:** `agente-c/ritmo-nativo` (a partir da `claude/busy-ritchie-wrvk8h`). Leia antes o [LEIA-ME](LEIA-ME.md).
**Urgente:** o Marcelo quer o PS2 liso hoje.

## O problema

O PS2 (LRPS2) e o PS1 rodam num processo à parte (`crates/kof-nativo`, o `kofstation --nativo`). O núcleo desenha na
placa de vídeo, a imagem volta pra CPU e vai pra página por uma WebSocket local, e a página desenha. O Marcelo jogou o
Shadow of the Colossus: "rodou relativamente bem, umas engasgadas aqui e ali", e **o antigo é bem mais liso** (lá o
padrão era uma janela SDL própria, sem passar pela página).

Suspeitas, nesta ordem (confirme com número antes de mexer):

1. **Quadros jogados fora na origem.** Em `crates/kof-nativo/src/filho.rs` (`laco`), o laço roda quadros enquanto a
   placa de som tiver menos de 60 ms guardados (`while saida.guardado_ms() < ALVO_MS && rodou < 8`) e **só depois**
   manda a imagem, uma vez (`if novo { … n.com_quadro(…) … canal.publicar_quadro(…) }`). A placa consome o som em
   blocos, então às vezes rodam 2–3 quadros seguidos e só o último vai pra página: os outros somem (pulo na tela).
2. **A página mostra "o último que chegou".** `packages/engine/src/nativo.ts` (`JogoNativo.receber`) entrega cada
   quadro na hora e `apps/desktop/src/hooks/useTelaDoJogo.ts` desenha o último a cada vsync: dois quadros no mesmo
   vsync = um some; nenhum = repete. **A tarefa A já resolveu isso no WebAssembly** com uma fila apresentada um por
   vsync em `packages/engine/src/jogo.ts` (`fila`, `laco`, `MAX_NA_FILA`, `ESPERA_DA_FOLGA_MS`): faça o mesmo no
   `JogoNativo`, de preferência reaproveitando o código (um módulo pequeno usado pelos dois).
3. **A publicação na WebSocket** (`crates/kof-nativo/src/canal.rs`, `publicar_quadro`): confira se ela guarda só o
   mais novo e descarta os outros quando a página está lenta (pode ser outra fonte de pulo).

O medidor do M16 já ajuda: no `porQuadro` de cada segundo, um quadro com `envio == 0` é um quadro que **não foi
mandado** pra página. Use isso pra contar.

## O que fazer

1. **Medir antes.** Um teste em `crates/kof-nativo/tests/` (veja `processo.rs` e `opengl.rs`: eles já têm núcleos de
   teste compilados no próprio teste, um que desenha por software e um com OpenGL) que roda uns segundos e conta, pelo
   `porQuadro`, quantos quadros rodados não foram mandados. Anote o número.
2. **Mandar todo quadro que o núcleo fez** (ou explicar com número por que não dá): por exemplo, publicar a imagem
   logo depois de cada `n.rodar` dentro do laço, e não só no fim. Com a leitura assíncrona da placa (`gl.rs`, buffers
   em rodízio) o quadro pode chegar com 1–2 de atraso, e tudo bem, desde que não pule. Cuide do turbo (lá não precisa
   mandar todos).
3. **Fila por vsync no `JogoNativo`**, como a do A.
4. **Medir depois:** o mesmo teste com 0 (ou quase 0) quadros não mandados; o e2e e o `tools/testar-ps2.mjs` passando.
   Se der, adapte o `tools/medir-ritmo.mjs` do A pra medir também um jogo nativo (PS1 com o núcleo de teste do
   `processo.rs`, ou o PCSX: no container ele pode morrer com SIGILL; aí diga isso).

## Pode mexer

`crates/kof-nativo/src/{filho,canal}.rs`, `crates/kof-nativo/tests/` (novo teste), `packages/engine/src/nativo.ts`,
`packages/engine/src/jogo.ts` (só pra tirar a fila pra um módulo comum), um módulo novo em `packages/engine/src/`,
`tools/medir-ritmo.mjs`.

**Não mexa:** `crates/kof-nativo/src/nucleo.rs` (a tarefa B está nele), o contrato (`protocolo.rs`,
`packages/contracts`), `domain/desempenho.ts`, a tela, docs fora desta pasta.

## Pronto quando

- Teste com o número de antes e de depois (quadros rodados × mandados).
- `pnpm check`, `pnpm check:rust` (o `pcsx` com SIGILL no container é sabido: use `--no-fail-fast`) e `pnpm e2e`
  verdes; `node tools/testar-ps2.mjs` passando (precisa de `pnpm build && cargo build -p kof-app`).

## Relatório

_(preencha ao terminar: o que mudou e por quê, os números de antes e depois, o que ficou de fora e os comandos pra
conferir)_
