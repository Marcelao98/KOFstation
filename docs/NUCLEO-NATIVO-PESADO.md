# Console pesado nativo: tudo o que o PS2 ensinou (pra fazer o próximo, ex.: GameCube/Wii)

Resumo pra agente: como o PS2 (LRPS2) roda no app, **todas as otimizações feitas e por quê**, as armadilhas que já
custaram horas e um roteiro pra pôr o próximo núcleo pesado (Dolphin = GameCube/Wii, ou outro) sem repetir os erros.
Os números e o diário estão em [PS2-LISO.md](PS2-LISO.md); o celular (PS1/N64) em [NATIVO-LISO.md](NATIVO-LISO.md);
o passo a passo de "sistema novo" em [EXPANDIR.md](EXPANDIR.md). Nome de jogo nunca entra no repositório ("jogo
pesado A/B"); jogo, BIOS e caminhos só em variável de ambiente ou fora do repo (`~/kof-medidas/`).

Situação em 17/11/2026 (branch `agente-d/ps2-liso`): o jogo pesado A roda liso no PC do Marcelo (Ryzen com vídeo
integrado, 7,2 GB de RAM), salvar/carregar estado sem travar a tela, cartão de memória sobrevive a fechar a janela,
painel de opções completo. Ele jogou com resolução interna maior e "dá pra jogar de boa"; o ✨ Bonito inteiro (2x +
anisotrópico 8x + MTVU) engasgou: a peça culpada ainda não foi medida (ver "O que falta").

## 1. O caminho de um quadro (onde mora o custo)

```
processo kofstation --nativo (crate kof-nativo)              processo do app            página (Chrome)
núcleo libretro ── OpenGL sem janela (EGL, FBO RGBA8) ──┐
                   gl.rs: glReadPixels → 3 PBOs + fence │ (leitura assíncrona: lê o quadro de 2 atrás, sem esperar a placa)
                   cópia linha a linha (vira de cabeça) │
canal.rs: fila de até 6 quadros (MAX_NA_FILA) ──────────┴──── WebSocket ──→ engine/nativo.ts → fila-de-quadros.ts
                                                                               (um quadro por vsync) → WebGL no canvas
```

- O núcleo roda **num processo filho** (`supervisor.rs`): se ele cair, o app não cai; fechar = mandar sair e esperar
  (até 10 s) antes de matar.
- **Cada quadro atravessa a página.** Em 1x é ~640×448×4 ≈ 1,1 MB; em 2x, ~4,7 MB; a 60 fps isso é muita cópia e
  memória na página (o Chrome guarda a fila). É o custo estrutural; as saídas planejadas (o "A"):
  1. reduzir na placa pro tamanho da janela antes de ler (blit), quando a resolução interna for maior que a janela;
  2. mandar YUV 4:2:0 (1,5 B/pixel em vez de 4) e converter de volta num shader WebGL da engine.
  A saída radical (o "B", "janela própria": o núcleo desenha numa janela nativa sem Chrome) é mais difícil no Wayland
  (não dá pra encaixar janela de outro processo) — 3 a 5 sessões, mostrar o desenho ao Marcelo antes.
- **Ritmo**: o processo do jogo manda **todo** quadro que o núcleo fez (antes jogava fora no laço) e a página
  apresenta **um por vsync** (`fila-de-quadros.ts`, o mesmo módulo do WebAssembly). Tarefa C; teste `tests/ritmo.rs`.

Pra um núcleo novo que desenha com OpenGL (Dolphin também pode usar OpenGL), **o mesmo `gl.rs` serve**: o contexto
sem janela, o FBO e a leitura por PBO não dependem do núcleo. Conferir só o que o núcleo pede no
`RETRO_ENVIRONMENT_SET_HW_RENDER` (versão de contexto, profundidade/estêncil, `bottom_left_origin`).

## 2. As otimizações, uma por uma (o que travava → o que resolveu)

| # | Problema | Causa (medida) | Correção | Onde |
|---|---|---|---|---|
| 1 | F5/F8 (salvar/carregar estado) travavam a tela 1,5–2,2 s; o salvar automático a cada 2 min também | O estado do PS2 tem **48 MB**. No núcleo custa 35–42 ms; quem travava era a página: base64 byte a byte (2,1 s), `JSON.stringify` (0,19 s), gzip na linha da página (1,6 s), `fetch` copiando 18 MB (0,5 s) | base64 nativo (`toBase64`/`fromBase64`, com reserva em pedaços múltiplos de 3); texto JSON montado/recortado à mão; empacotar/desempacotar num **Worker** (≥ 1 MB); o Worker devolve um **Blob** e o `fetch` lê sem copiar | `domain/estado-texto.ts`, `engine/estado-worker.ts` + `estado-trabalho.ts`, `app-core/armazem.ts` |
| 2 | Save no cartão de memória sumia | O núcleo grava o cartão por `FILE*` com buffer de 64 KB e só descarrega no `retro_unload_game`; o app saía com `process::exit(0)` sem fechar o jogo | Antes de sair (janela fechada, sem sinal de vida), o app fecha o jogo e espera (`nativo::Fechador`); espera de 3 → 10 s | `kof-app/src/{main,nativo,servidor}.rs`, `kof-nativo/src/supervisor.rs` |
| 3 | Engasgos esporádicos mesmo com o núcleo folgado | Máquina sem RAM: 4,6 GB na swap, o processo do jogo com 200+ MB na swap | Fora do app: fechar o Firefox (~2 GB). No app: a fila de quadros da página ainda pesa (próximo passo) | — |
| 4 | Opções do núcleo "escondidas", menu pequeno | Só ~25 opções curadas | Lista **gerada** do cabeçalho do núcleo (82 do LRPS2), traduzida, em seções como no PCSX2, perfis prontos, busca; tela própria com aba Geral + uma por console | ver seção 4 |

Resultado medido (jogo pesado A, 3 min jogando, sonda leve): F5 de ~2,2 s → **0,6–0,7 s**; F8 até 1,7 s → **~0,5 s**;
engasgos/min 106–115 → 15–33. O que sobra (~0,5 s) é o Chrome recebendo/mandando os 48 MB pela WebSocket; a saída é o
estado **não passar pela página** (o processo do jogo grava num arquivo e o Rust do app guarda).

**Lição geral:** o núcleo quase nunca é o gargalo de salvar/carregar; é a página tratando dezenas de MB na linha que
desenha. Pra o Dolphin (estados de dezenas a centenas de MB), já começar com o estado fora da página.

## 3. Armadilhas que já custaram tempo

- **Controles**: no PS2 as setas são o **analógico** e o direcional fica em **T F G H** (`DIRECIONAL_ANALOG`,
  `domain/entrada.ts`). Menus que só leem o direcional (ex.: "salvar no cartão?") "não descem" com as setas: é o G.
  Fazer o analógico apertar o direcional junto ("misto") quebrou o jogo (as setas trocavam de arma). **Não mexer nos
  controles sem o Marcelo pedir.**
- **Tudo que o núcleo escreve em arquivo** (cartão, HD, configuração) só está seguro depois de `retro_unload_game`:
  nunca sair do app sem fechar o jogo. Se o processo cair, até o tamanho do buffer do núcleo pode se perder.
- **Bateria (`SAVE_RAM`) do PS2 tem 0 bytes**: o save é o cartão. Não confiar no fluxo de bateria pra consoles de
  cartão/HD (GameCube também usa cartão; Wii usa NAND).
- **O binário do app embute a página** (`build.rs`): depois de `pnpm build`, `touch crates/kof-app/build.rs` antes do
  `cargo build`, senão sai a página velha. `grep` no binário precisa de `-a`.
- **Compilar no Linux do Marcelo**: `PATH=$HOME/.cargo/bin:$PATH` e
  `PKG_CONFIG_PATH=$HOME/.local/kof-alsa/usr/lib64/pkgconfig` (alsa).
- **Camadas** (ESLint): o formato do estado é `domain`; o Worker é `engine` (a engine não importa `app-core`, por isso
  o aviso de log é injetado com `avisarEstados`). Tela não fala com engine.
- **Não testar nem abrir janela enquanto o Marcelo joga** sem avisar; medir abre o jogo na tela dele.
- O teste `opengl` falha (62–64 de 120 quadros) nesta máquina já antes destas mudanças (conferido no `c21cf8b`).

## 4. Opções do núcleo (como foi montado, pra repetir)

1. **Gerar a lista do que o núcleo declara.** Duas fontes:
   - do cabeçalho `libretro_core_options.h` do commit exato do núcleo: `tools/opcoes-lrps2.mjs` (resolve `#ifdef`
     de arquitetura pro x86, expande macros, aceita lista vazia) → `domain/opcoes-lrps2.ts`;
   - do núcleo rodando, quando o cabeçalho depende de como foi compilado:
     `KOF_LISTA_OPCOES=<pasta> cargo test -p kof-nativo --test opcoes -- --nocapture` e
     `node tools/opcoes-do-nucleo.mjs <sis> <pasta>/<sis>.json "<núcleo> <commit>"` → `domain/opcoes-<sis>-declaradas.ts`
     (pronto pro PS1; ainda não rodado).
2. **Traduzir** só o nome/dica/aviso (`domain/opcoes-lrps2-pt.ts`); o que não tiver tradução aparece com o nome do
   núcleo — nada escondido. Aviso (⚠) quando a opção pode quebrar o jogo ou derrubar o fps.
3. **Curar as principais** em `domain/opcoes-nucleo.ts` (`PS2_CURADO`): grupo (Gráficos, Emulação, Som, Cartão,
   Correções, Sistema, Controle), "vale na hora" × "ao reabrir" (no LRPS2, "(Restart)" no texto), e os 4 perfis
   (⚡ Rápido, ⚖ Equilibrado = o que o app sempre usou, 🎯 Fiel, ✨ Bonito). As fixas pelo app (BIOS, renderizador)
   ficam em `FIXAS_PELO_APP` e não são editáveis.
4. **Camadas**: geral → console → jogo (`opcoes-camadas.ts`); a tela é `apps/desktop/src/screens/Emulacao/`.
5. Testes: completude (todas as declaradas no catálogo, traduções válidas) e a fixture
   `packages/contracts/fixtures/opcoes-nucleo.json` regravada quando o catálogo muda.

## 5. Como medir (antes de mexer, depois de mexer)

```bash
source ~/kof-medidas/ambiente.sh      # KOF_APP, KOF_JOGO_A/B, KOF_BIOS_PS2 (fora do repo)
node tools/medir-ps2.mjs --jogo A --rodadas 1 --aquecer 20 --segundos 180 \
  --estado <.bin> --teclas --mexer --sonda-leve [--perfil] [--opcao chave=valor] [--fechar-janela]
KOF_JOGO=... KOF_BIOS_PS2=... KOF_ESTADO=... \
  cargo test -p kof-nativo --release --test ps2_de_verdade -- --ignored --nocapture   # núcleo sozinho
```

- `--sonda-leve` (só o relógio do vsync) é o certo pra engasgo; a sonda pesada faz `getImageData` e engasga sozinha.
- `--perfil` mostra quem parou a página (inclui "(program)" = o próprio Chrome, ex.: WebSocket).
- `ps2_de_verdade` separa o custo do núcleo (quadro p50/p99, salvar/carregar estado, fechar) do custo da página.
- Pra jogar de verdade: o app de medição em `~/kof-medidas/app/` usa os dados reais do Marcelo; um monitor simples de
  memória/CPU a cada 5 s (`free`, `ps -C kofstation`) mostra swap e quem cresce.

Separar sempre: **núcleo** (placa/processador) × **leitura** do quadro × **envio** × **página**. Se o núcleo sozinho já
passa de 16,6 ms, nada do lado do app resolve; mudar opção (resolução, MTVU, ciclos) é o caminho.

## 6. Roteiro pra o próximo núcleo pesado (ex.: Dolphin)

1. Núcleo no manifesto, commit exato anotado; teste Rust que abre e roda N quadros sem janela (copiar `lrps2.rs`).
2. Conferir o `SET_HW_RENDER` dele e se o `gl.rs` serve; se pedir Vulkan, o caminho de leitura muda (planejar antes).
3. Estado: medir o tamanho cru no primeiro dia. Se > 10 MB, já nascer com o estado fora da página.
4. Saves de cartão/NAND: achar onde o núcleo grava e confirmar que fechar o app descarrega (teste como o do
   `ps2_de_verdade`, que confere o arquivo do cartão modificado depois de fechar).
5. Controles: mapear com o Marcelo antes (analógico × direcional; no Wii, Wiimote/ponteiro — ver a ideia do celular
   como Wiimote no ROADMAP, fase 9).
6. Opções: gerar a lista (seção 4), traduzir, curar as principais, perfis com o ⚖ Equilibrado = padrão do núcleo.
7. Medir com o banco (generalizar o `medir-ps2.mjs` com `--sistema`) e anotar num diário como o PS2-LISO.

## 7. O que falta (17/11)

- **A**: reduzir o quadro na placa + YUV 4:2:0 (seção 1). Medir antes se o ✨ Bonito engasga pela volta dos quadros ou
  pela placa: o Marcelo jogou com resolução maior e ficou jogável, então a suspeita agora é o anisotrópico 8x ou o MTVU.
  Medir peça por peça e deixar no Bonito só o que couber liso.
- Estado fora da página (arquivo de troca) e o F8 sem `WebSocket.send` de 48 MB.
- Peso da página (fila de quadros, GC), cache de shader, lista completa de opções do PS1.
- Janela própria (B) depois, com desenho aprovado.
