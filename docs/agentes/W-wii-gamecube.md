# Tarefa W · Wii e GameCube (Dolphin), com tudo o que o PS2 ensinou

**Quem faz:** o Claude Code **no PC do Marcelo** (placa de vídeo, jogos de verdade). **Branch:** `agente-w/wii`, a
partir da `claude/busy-ritchie-wrvk8h`. Leia antes, nesta ordem: [AGENTS.md](../../AGENTS.md), [LEIA-ME](LEIA-ME.md),
[NUCLEO-NATIVO-PESADO.md](../NUCLEO-NATIVO-PESADO.md) (o guia que o PS2 deixou **exatamente pra este momento**: siga a
seção 6 "Roteiro pra o próximo núcleo pesado"), [EXPANDIR.md](../EXPANDIR.md) (sistema novo passo a passo) e a
decisão D36 em [DECISIONS.md](../DECISIONS.md) (como o PS2 entrou).

**Regras de sempre:** nome de jogo **nunca** no repositório ("jogo de teste Wii A", "jogo de teste GameCube A");
jogos, NAND, BIOS/IPL e caminhos só em variável de ambiente; relatórios fora do repositório (`~/kof-medidas/`); uma
mudança por vez, medida antes e depois; commits em português, sem nome de modelo de IA, com as linhas de co-autoria que
o sistema indicar; não abra PR. Antes de cada push: `pnpm check`, `pnpm check:rust`, `cargo test --workspace
--no-fail-fast` e `pnpm e2e` se tocou na página. **Toda mudança no `kof-nativo` passa também pelo banco do PS2**
(`tools/medir-ps2.mjs`): o PS2 divide o mesmo processo (a fase R ligou o rebobinar no PS2 sem querer e trouxe
chiado; não repetir).

## O que o Marcelo decidiu (19/11)

- **Wii e GameCube juntos** (o mesmo núcleo).
- **Primeiro jogo de teste: um de Wii que usa o ponteiro do Wiimote e o "chacoalhar"** (ele diz qual na conversa; no
  repositório é o "jogo de teste Wii A").
- **Celular como Wiimote fica pra depois** (W.6), quando o Wii já rodar com mouse/controle.
- Ele quer o esquema completo do KOFstation (filtros, molduras, menus, opções, medição), não um atalho pra fora:
  **"roda redondo, com as mesmas configurações e tudo o que fizemos pro PS2"** (21/11): o mesmo processo nativo,
  OpenGL sem janela, estado fora da página, fechar com calma, opções geradas e traduzidas com os 4 perfis, medição.
- **A rede com papéis (tarefa N) já estará pronta:** o Wii entra nos arranjos (núcleo só no PC).

## O que já se sabe (pesquisa de 19/11)

- **Núcleo:** `libretro/dolphin` (GitHub), GPL-2.0+. Em outubro de 2025 foi rebaseado no Dolphin atual (fórum do
  libretro: "DOLPHIN cores has been updated to current stream october 2025"). Desenha com OpenGL, Vulkan ou D3D11.
- **Ponto fraco:** o "dual core" do Dolphin não combina com o jeito libretro de cuidar das linhas; alguns jogos caem e
  sem ele pesa mais no processador. **Medir no 1º dia** (fps e p99 do jogo A), e conferir a opção do núcleo.
- **Wiimote:** a opção do núcleo `dolphin_ir_mode` põe o ponteiro no **analógico direito** (relativo ou absoluto) ou no
  **mouse** (docs.libretro.com/library/dolphin). Extensões (Nunchuk, Classic) e "de lado" também são opções do núcleo:
  gerar a lista e conferir.
- **De onde vem o arquivo (decidido 21/11: "traz o núcleo do RetroArch"):** o `dolphin_libretro` **pronto, do
  buildbot do libretro** (o mesmo que o RetroArch baixa), Linux x86_64 e Windows x86_64, de uma data fixa. Não
  compilar. Pra não depender do buildbot mudar: **copiar os dois arquivos pra uma Release nossa** (como os
  `nucleos-<VERSAO>`) e pôr no `third_party/cores/manifest.json` a URL da nossa cópia + o SHA-256 + de onde e de quando
  veio (data, URL original, versão/commit que o núcleo informa em `retro_get_system_info`). Registrar como **D40**. O
  Dolphin é GPL-2.0+: anotar a licença e o link do código-fonte (github.com/libretro/dolphin) junto, como manda a GPL.
- **Hardware dele:** Ryzen com vídeo integrado, 7,2 GB de RAM (com o Firefox aberto a máquina vai pra swap: medir com
  ele fechado). Rodou jogos pesados de Switch no Yuzu, então o Wii deve caber; o que pesa é o processador.

## Os passos (pare e mostre ao Marcelo ao fim de cada um)

### W.1 · O núcleo no manifesto e rodando sem janela
1. Baixar o `dolphin_libretro` pronto do buildbot do libretro (Linux e Windows, uma data fixa), copiar pra uma Release
   nossa, manifesto com SHA-256 e a origem anotada (D40); `pnpm nucleos` baixa e confere.
2. Teste Rust `crates/kof-nativo/tests/dolphin.rs` (copiar o `lrps2.rs`): abre, roda N quadros sem janela, sem jogo de
   verdade no CI (um `.dol`/homebrew gerado pelo teste, ou o núcleo sem jogo se ele aceitar; o de verdade só com
   `KOF_JOGO`, teste ignorado no CI).
3. Conferir o `RETRO_ENVIRONMENT_SET_HW_RENDER` que ele pede: se o `gl.rs` serve (versão de contexto, profundidade,
   `bottom_left_origin`). Se pedir Vulkan, **pare e mostre** antes (o caminho de leitura muda).
4. **Medir o tamanho do estado** (`retro_serialize_size`) no 1º dia: já nasce com o estado fora da página (como o
   `pacote.rs` do PS2) e **sem rebobinar** (o `FOTO_MAXIMA` de 24 MB do `filho.rs` já recusa).

### W.2 · Os consoles no app
`gc` e `wii` como sistemas (`packages/domain` — nome, extensões `.iso`, `.gcm`, `.rvz`, `.wbfs`, `.ciso`, `.gcz`,
`.wad`, `.dol`, `.elf` conforme o núcleo aceitar —, `engine/nucleos.ts` com `soNativo`, a biblioteca e a pasta
`Kof Games/Games/{gamecube,wii}`, ícones, capas pela base que já existe se tiver). O disco é lido direto do disco pelo
processo do jogo (nunca passa pela página, como o PS2). Testes unit + e2e com a casca nativa falsa.

### W.3 · Saves que não se perdem
GameCube: cartão de memória; Wii: a NAND (pasta do usuário do Dolphin). Achar onde o núcleo grava (diretório de saves
/sistema que o `kof-nativo` passa) e confirmar que **fechar o app descarrega tudo** (o `nativo::Fechador` já fecha com
calma; o Dolphin pode precisar de mais que 10 s?). Teste como o do `ps2_de_verdade`: o arquivo muda depois de fechar.
O IPL/BIOS do GameCube é opcional no Dolphin (HLE): não pedir se não precisar.

### W.4 · Controles
Com o Marcelo **antes** de fixar (regra do guia: controles só com ele). Proposta pra mostrar: GameCube = controle do
jeito do console (A grande, B, X/Y, Z, L/R analógicos, C-stick no analógico direito); Wii = Wiimote **com o ponteiro no
mouse** (`dolphin_ir_mode` = mouse) e o "chacoalhar" num botão fácil (do teclado e do controle), mais o Nunchuk
(analógico esquerdo, C/Z); Wiimote "de lado" e Classic como opção por jogo. No PC: mouse sobre a área do jogo vira o
ponteiro (a página manda a posição relativa à área; o `kof-nativo` entrega como `RETRO_DEVICE_POINTER` ou mouse,
conforme o núcleo). Testes do mapeamento no `domain`.

### W.5 · Opções e medição
1. Gerar a lista do que o núcleo declara (`tools/opcoes-do-nucleo.mjs` ou do `libretro_core_options.h` do commit),
   traduzir (`domain/opcoes-dolphin-pt.ts`), curar as principais (resolução interna, renderizador, ubershaders/cache
   de shaders, dual core, sincronizar a GPU, MMU, velocidade da CPU, tela larga, ponteiro), os 4 perfis (⚡ ⚖ 🎯 ✨) com
   o ⚖ Equilibrado = padrão do núcleo. Tudo aparece no menu (nada escondido), como no PS2.
2. Generalizar o `tools/medir-ps2.mjs` com `--sistema wii|gc` e medir o jogo A: fps, p99, engasgos/min, faltas de som,
   memória por processo. **Shader na 1ª vez** é o engasgo clássico do Dolphin: medir com e sem ubershaders/cache.
3. Diário em `docs/WII-LISO.md` (como o `PS2-LISO.md`).
**Checkpoint:** ⏸ o Marcelo joga o jogo A 10 min e diz se está liso.

### W.6 · Celular como Wiimote (depois, quando ele pedir)
O celular já manda analógicos pro PC pelo canal `pad` da rede pareada (`stores/modoControle.ts`). O giroscópio vira o
ponteiro (analógico direito absoluto, `dolphin_ir_mode`), o chacoalhar (acelerômetro) vira o botão de chacoalhar, a
tela vira os botões do Wiimote/Nunchuk. Escrever a tarefa própria antes de fazer.

## Documentar

`docs/WII-LISO.md` (números e tentativas), a fase W no `docs/ROADMAP.md` (estado de cada W.x), e o que valer pro
próximo núcleo no `docs/NUCLEO-NATIVO-PESADO.md`. Decisão nova (de onde vem o binário) em `docs/DECISIONS.md` (D40).

## Relatório

Feito em 21/11, no modo automático (branch `agente-w/wii`). Diário com os números: [WII-LISO.md](../WII-LISO.md).

- **W.1 ✅** `dolphin_libretro` pronto do buildbot (Linux de 21/11, Windows de 20/11), `dolphin-emu
  2609.0.168+0863ee3700`, copiado pra Release `nucleos-dolphin-0863ee37` (D40, licença no `THIRD_PARTY.md`).
  `tests/dolphin.rs` abre com OpenGL Core e um `.dol` gerado no teste; estado de 85 MB (sem rebobinar, fora da página).
- **W.2 ✅** `gc` e `wii` no domain (extensões, `.iso` pela assinatura do disco, pastas `gamecube`/`wii`), só nativos
  como o PS2, Wikidata, e2e (sem o nativo avisa). Fumaça pelo app de verdade com o `.dol`: abre pela biblioteca,
  59,5 fps, 0 faltas de som.
- **W.3 🟡** os arquivos de sistema (`dolphin-sys.zip`, extraídos uma vez) e os saves em
  `<dados>/nativo/saves/dolphin/User` (NAND, cartões, cache de shaders). **Falta:** o teste "o save mudou depois de
  fechar" com o jogo de verdade.
- **W.4 ⏸** a proposta da tarefa: Wiimote + Nunchuk, ponteiro no mouse (mensagem `PONTEIRO` nova →
  `RETRO_DEVICE_POINTER`), botões do mouse = A/B/chacoalhar, R = chacoalhar; GameCube como o console. Os outros
  consoles não mudaram. **Ele aprova.**
- **W.5 🟡** 113 opções declaradas (gerador `tools/opcoes-dolphin.mjs`), 91 no menu, as principais traduzidas e
  curadas, 4 perfis (⚖ = padrão do núcleo), conferidas contra o núcleo de verdade (`tests/opcoes.rs`).
  `tools/medir-ps2.mjs --sistema wii|gc`. **Falta:** medir o jogo de teste Wii A.

**Por que parou:** o jogo de teste Wii A ainda estava baixando (~400 MB às 17:30, devagar). Pra terminar: extrair o
`.7z` pra `<Kof Games>/Games/wii/`, apontar `KOF_JOGO_WII_A` em `~/kof-medidas/ambiente.sh` e rodar:

```bash
source ~/kof-medidas/ambiente.sh
KOF_JOGO_WII="$KOF_JOGO_WII_A" cargo test --release -p kof-nativo --test dolphin -- --ignored --nocapture
KOF_APP=$PWD/target/release/kofstation node tools/medir-ps2.mjs --sistema wii --rodadas 3 --aquecer 60 --segundos 60 --print
```
