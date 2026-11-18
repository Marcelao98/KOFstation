# Tarefa R · Rebobinar no PS1 e no N64, com a música voltando junto (fase R do ROADMAP)

**Quem faz:** o Claude Code **no PC do Marcelo** (tem os jogos de verdade pra medir e ouvir). **Branch:**
`agente-r/rebobinar`, a partir da `claude/busy-ritchie-wrvk8h`. Leia antes o [AGENTS.md](../../AGENTS.md), o
[LEIA-ME](LEIA-ME.md) e o guia [NUCLEO-NATIVO-PESADO.md](../NUCLEO-NATIVO-PESADO.md) (o que o PS2 ensinou: estado grande
nunca passa pela página).

**Regras de sempre:** nome de jogo nunca no repositório (use "jogo de teste PS1/N64/SNES"); caminhos só em variável de
ambiente; relatórios fora do repositório; uma mudança por vez, medida antes e depois; commits em português, sem nome de
modelo de IA, com as linhas de co-autoria que o sistema indicar. Não abra PR. Antes de cada push: `pnpm check`,
`pnpm check:rust`, `cargo test --workspace --no-fail-fast` e `pnpm e2e` (se tocou na página).

## O que o Marcelo decidiu (18/11)

- **Ao rebobinar, a música volta invertida, com efeito de transição** (fade ao começar, efeito de fita durante,
  crossfade ao soltar) e, ao soltar, **continua exatamente de onde parou** (o chip de som volta junto no estado; o
  crossfade só evita o estalo).
- Vale pra **todo console que rebobina** (o som gravado é o que saiu, seja qual for o chip): NES, SNES, Game Boy/Color,
  GBA, Mega Drive, Master System, Game Gear, Neo Geo e, com esta tarefa, **PS1 e N64**. O PS2 não rebobina (fica pra
  depois, ver o ROADMAP).
- Opção nas Opções gerais: **"Som ao rebobinar: 📼 fita (ao contrário) / 🔇 mudo"**, padrão 📼.

## Como está hoje

- Consoles da página (wasm): `packages/engine/src/rebobinador.ts` (estado inteiro mais novo + só os pedaços de 16 KB que
  mudaram, foto a cada 2 quadros, 48 MB, `limite × 30` fotos) usado no `packages/engine/src/worker.ts` (`novoRebob`,
  `passoPraTras`, `terminarRebobinar`, `depoisDeRodar`). Ao rebobinar volta 60 fotos/s (a imagem volta a 2×) e **o som
  fica mudo** (`passoPraTras` roda um quadro e o som dele não sai).
- Nativos: `packages/engine/src/nativo.ts` (`configurarRebobinar`/`rebobinar` vazios) e `semRebob` em
  `packages/engine/src/nucleos.ts` (PS1/N64/PS2).
- O que já existe por aí: o RetroArch inverte o som do quadro que roda depois de cada estado carregado
  (`audio/audio_driver.c`, `state_manager_frame_is_reversed`), sem transição e com buraco entre as fotos; o Mesen toca
  imagem e som ao contrário; o BizHawk não. O nosso: o som **que realmente saiu**, contínuo, com transição.

## Os passos (pare e mostre ao Marcelo ao fim de cada um)

### R.1 · As contas do som (puras, no `domain`)
Funções puras em `packages/domain/src/som-rebobinar.ts`: inverter um trecho estéreo, a curva do fade de entrada
(~80 ms), o filtro de "fita" (um passa-baixa leve, ajustável), o crossfade de saída (~50–100 ms, potência constante).
Vetores de teste num fixture (`packages/contracts/fixtures/som-rebobinar.json`: entrada → saída esperada), usados pelos
testes do TypeScript **e** do Rust (R.5), pra o som ser idêntico nos dois.

### R.2 · Som ao rebobinar nos consoles da página
No `worker.ts`: um anel com os últimos segundos do som que saiu (o mesmo tamanho de tempo das fotos), marcado por
quadro. Em `passoPraTras`, cada foto que volta toca, invertido, o som dos quadros dela (a imagem volta a 2×, então o som
sai a 2×: o efeito de fita vem de graça). Ao começar: fade de entrada. Ao soltar (`terminarRebobinar`): crossfade do som
invertido pro som normal que o núcleo volta a gerar. Funciona nos dois caminhos de som (anel compartilhado e PCM por
mensagem, o do celular). A opção 📼/🔇 nas Opções gerais (domain + app-core + tela).
**Testes:** unit das contas; e2e com a ROM de teste que toca uma nota (veja `e2e/roms.ts`): sai som rebobinando (não
zero) e, depois do crossfade, o som é **idêntico** ao de quem carregou aquele mesmo estado e rodou dali.
**Checkpoint:** o Marcelo ouve num jogo de SNES e num de Mega Drive.

### R.3 · Rebobinar no PS1 nativo
`crates/kof-nativo/src/rebobinar.rs`: o algoritmo do `rebobinador.ts` em Rust, **dentro do processo do jogo** (o estado
de ~4 MB nunca passa pela página). Comandos novos no protocolo (`crates/kof-nativo/src/protocolo.rs`): ligar/configurar,
segurar, soltar; o filho continua mandando os quadros como sempre. `nativo.ts` passa a mandar esses comandos e tira o
`semRebob` do PS1. **Risco a conferir:** o PCSX desenha e toca em linhas próprias (`gpu_thread_rendering`,
`spu_thread`): a foto tem que sair com elas paradas/sincronizadas.
**Testes:** teste Rust com o disco de teste gerado pelo próprio teste (veja `crates/kof-nativo/tests/pcsx.rs`): voltar N
quadros e rodar de novo dá a mesma imagem. **Medir** com `tools/medir-ps2.mjs` (ou um parecido pro PS1) com e sem gravar
fotos: p99 e engasgos não podem piorar.
**Checkpoint:** o Marcelo rebobina num jogo de PS1.

### R.4 · Rebobinar no N64
O mesmo do R.3 pro N64 (estado de ~16 MB). Se a medição mostrar que foto a cada 2 quadros pesa, espace as fotos e
anote o número. Tira o `semRebob` do N64.

### R.5 · Som ao rebobinar no PS1 e no N64
O anel e as contas do R.1 no `rebobinar.rs` (Rust), com **os mesmos vetores de teste** do fixture. O som sai pela
placa como sempre (`som.rs`).
**Checkpoint:** o Marcelo ouve no PS1 e no N64.

## Documentar

Um diário curto em `docs/REBOBINAR.md`: como funciona (diagrama), os números (custo da foto, memória, p99 com e sem
gravar) e o que foi tentado e não ficou. Atualize a fase R no `docs/ROADMAP.md` (estado de cada R.x).

## Relatório

*(o agente preenche: o que fez em cada passo, números, o que ficou de fora, comandos pra conferir)*
