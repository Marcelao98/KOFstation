# Jornal do KOFstation

Diário de bordo da migração: **uma entrada por sessão de trabalho, a mais nova em cima.** Serve pra uma pessoa (ou um
agente) que chega amanhã entender o que aconteceu, por quê, e onde parou, sem reler o código nem a conversa inteira.

**Como escrever uma entrada** (copie o modelo; seja curto; números e nomes de arquivo valem mais que adjetivos):

```markdown
## AAAA-MM-DD · Etapas X–Y · título curto

**Pedido:** o que o Marcelo pediu, nas palavras dele resumidas.
**Feito:** o que mudou (com os arquivos ou módulos principais).
**Decidido:** decisões novas ou mudadas (com o número em DECISIONS.md).
**Medido / conferido:** testes, números, comparações com o app antigo.
**Deu errado / aprendido:** o que quebrou, o que custou tempo, o que não fazer de novo.
**Onde parou:** estado exato e o próximo passo (e se está esperando o Marcelo).
```

Regras: não apagar nem reescrever entradas antigas (corrigir com uma entrada nova); datas no formato AAAA-MM-DD;
commits citados pelo hash curto quando ajudarem.

---

## 2026-11-02 · Pós-entrega dos Lotes A e B · "connection refused" e onde parou

**Pedido:** o Marcelo instalou o pacote M3–M8; abriu uma vez e rodou liso, na segunda deu "connection refused". Depois
desistiu de trazer os saves do app antigo ("muito trampo") e quer conferir se os saves do **novo** funcionam.
**Feito:** correção `ab024f4`: quando já tem um Chromium aberto com o perfil do KOFstation, o processo novo entrega o
endereço pro que já existe e sai na hora; o `kofstation` achava que a janela tinha fechado e desligava o servidor. Agora
só um navegador que durou mais de 15 s conta como janela fechada; senão vale o sinal de vida da página (`app.vivo` a
cada 5 s; sem sinal por 30 s, encerra). Binários da `teste-binarios` trocados (Linux SHA-256 `86005e4f…`), `main` em dia.
**Medido / conferido:** reproduzido com um navegador falso que sai na hora: o servidor fica no ar com a janela aberta e
encerra sozinho 30 s depois que ela some. `check`, `check:rust` e 29 testes de fluxo verdes.
**Aprendido:** no antigo isso não existia porque não tinha servidor (o lançador abria um `.html` direto). Saves do antigo
ficam dentro do navegador dele (IndexedDB): só saem pelo backup `.kofsave` (Arquivo → 💾 Backup no antigo).
**Onde parou:** ⏸ o Marcelo vai testar a lista de 39 itens (está na conversa; resumo no README → "Rodar"), começando
pelos **saves do novo**: jogar algo com save de cartucho, salvar no jogo, fechar e abrir (save em
`~/.local/share/KOFstation/lojas/saves/`, chave `sram.<título>.<tamanho>`); F5/F6/F8; Continuar de onde parou. Bug que
ele trouxer: consertar com commit "Correção: …", trocar a `teste-binarios` (um commit, `push -f`) e juntar na `main`.
Depois que ele aprovar o pacote: marcar M3–M8 como ✅ no ROADMAP e seguir pro M9 (Jukebox).

---

## 2026-11-01 · Lotes A e B (M3–M8) · biblioteca, saves, rebobinar, imagem e controles

**Pedido:** fazer o Lote A (M3 Biblioteca e Kof Games, M4 Configurações e `.kofsave`, M5 Saves/estados/modos, M6
Rebobinar) e o Lote B (M7 Painel de imagem e molduras, M8 Controles e jogadores 2–4) inteiros, sem parar nos
checkpoints; junto, o `docs/EXPANDIR.md` e o log dos erros da tela no arquivo do Rust (`log.write`). Um commit por passo.
**Feito (22 commits, `4bb8e1f`…`433425e`):**
- Rust: `api.rs` com os comandos (testável sem HTTP), corpo JSON ou binário (`X-Kof-Args`), uma linha por pedido;
  crate `kof-files` (escopos, raiz Kof Games pela posição do executável ou escolhida, varredura com diretório do zip e
  cara de CD, CRC No-Intro com cache, inventário + aplicar o plano de organizar, lojas `.json`+`.bin`, config, capas do
  libretro-thumbnails com `ureq`). `log.write` com os erros da tela.
- `domain`: identidade da ROM (CRC, título, `título|tamanho`, `sram.<título>.<tamanho>`), detecção pelo conteúdo, Neo Geo
  (lista do FBNeo), plano de organizar, busca/facetas/base de jogos, guarda (`.kofsave`), modos, entrada em camadas,
  jogadores. `engine`: bateria e estados no Worker, rebobinador (o do antigo), `RenderizadorVisual` + `kofvisual.js` e
  `kofmolduras.js` copiados sem mudança, paletas.
- Telas: Biblioteca (lotes de 150, ficha, filtros, capas, sofá), pasta Kof Games e plano de organizar, Backup, Estados
  (com Opções de emulação), Modo de jogo, Início com Continuar/Recentes, ampulheta do rebobinar, painel de imagem (F4),
  galeria de molduras, Controles e teclas, Jogadores. `docs/EXPANDIR.md`.

**Decidido:** D23 (pasta digitada/colada, sem diálogo nativo), D24 (dados em `<dados>/lojas` com os formatos do antigo),
D25 (plano de organizar no TS, Rust só lista e move; mostra o plano antes), D26 (visual e molduras copiados sem mudança),
D27 (uma linha por pedido; binário sem base64).
**Medido / conferido (com `KOF_ANTIGO`, comparando com o código do antigo):** savestate do antigo abre no novo e o do
novo no antigo, com a mesma imagem depois, nos 5 sistemas; o rebobinador restaura os mesmos estados, passo a passo; o
`.kofsave` é lido e escrito pelo `guarda.js` antigo nos dois sentidos (mesmo hash); a base de jogos responde igual ao
`KofJogos`; título/CRC iguais ao `nucleo.js`/`jogos.js`; **os 42 jeitos do painel de imagem dão o mesmo canvas, pixel a
pixel**, do `KOFstation.html` publicado. 29 testes de fluxo + ~100 de unidade passando; executável de verdade testado de
ponta a ponta (pasta → plano → organizar → jogar → F5 → painel → backup) sem erro.
**Deu errado / aprendido:**
- O App passou a carregar depois da configuração (`import()` dinâmico): teste de fluxo que aperta tecla logo após o
  `goto` precisa esperar o `#home`.
- Duas gravações do registro de um jogo (abrir e salvar automático) se cruzavam e apagavam o `temAuto`: agora passam
  por uma fila (`naFila`).
- Um `vite preview` esquecido aberto fez o Playwright testar um build velho; e o Gambatte não devolve o mesmo estado byte
  a byte depois de carregar e salvar (o antigo também não): o teste do rebobinar confere o que é carregado no núcleo.
- Commit do M3.2 saiu com um aviso do clippy (corrigido no M3.3); o do M5.3 foi corrigido antes do envio (amend local).
**Onde parou:** ⏸ esperando o Marcelo testar o pacote (comando de instalação e lista do que testar na conversa e no
README). Fica pra depois: estatísticas/espaço usado (M10; o backup já leva as estatísticas), CD de PS1 e analógico num
jogo de verdade (M11), celulares como jogadores (M13), medir 3.000 jogos na biblioteca com a CPU limitada.

---

## 2026-11-01 · Checkpoint do M2 · aprovado

**Pedido:** instalar em `~/Programas/Kof Games/KOFstation` (só o executável; o antigo foi renomeado pra
"KOFstation old"), juntar tudo na `main`.
**Feito:** `rodar.sh` corrigido (não baixava os núcleos: o executável saía sem emuladores; testado num clone limpo sem
pnpm). Branch de trabalho juntada na `main` (avanço direto, `8af2c0b`). Comando de instalação por `curl` da branch
`teste-binarios` (precisa do repositório público).
**Medido / conferido:** o Marcelo rodou um jogo dele no app novo: "funcionou, deu certo". **M2 aprovado.**
**Decidido:** o Marcelo aprovou fazer **o Lote A (M3, M4, M5, M6) e o Lote B (M7, M8) inteiros**, sem parar nos
checkpoints do meio: um pacote só no fim pra ele testar tudo. Cada passo continua sendo um commit próprio com o nome da
etapa (ex.: "M3.2: …"), pra achar e desfazer só o que der errado. Entram junto: `docs/EXPANDIR.md` (como adicionar e
debugar) e o log dos erros da tela indo pro arquivo do Rust (comando `log.write`).
**Onde parou:** começar o **M3.1** numa sessão nova (o contexto desta ficou grande).

---

## 2026-10-31 · M2 · O app novo roda jogo

**Pedido:** "vai até o M2" (depois de aprovar o M1 como "ficou excelente"); entendido também como aprovação da opção B.
**Feito:**
- F4b.5: protótipos do spike apagados; D2 aceita.
- Núcleos por manifesto (`third_party/cores/manifest.json`, SHA-256), baixados do `kofstation-old` com `pnpm nucleos`
  pra `apps/desktop/public/nucleos/` (fora do git). Entram os 5 sem BIOS: Snes9x, Gambatte, FCEUmm, Genesis Plus GX, mGBA.
- `packages/engine`: `SessaoLibretro` (o `Consolinho` do antigo, sem DOM), `worker.ts` (núcleo num Web Worker), anel de
  som em `SharedArrayBuffer` + AudioWorklet (`anel.ts`), `Reamostrador`, `Jogo` (controlador do lado da página),
  `TelaDoJogo` (WebGL2), `tamanhoNaTela` (o `ajustarEscala` do antigo), `encaixarQuadro` (corte do NES, SNES em alta).
- `app-core/arquivo.ts`: ROM solta ou `.zip` → sistema + ROM, com erros claros pros sistemas que ainda não rodam.
- Desktop: `stores/jogo.ts`, hooks da tela/entrada/pausa, `MenuRapido` (os 19 itens do antigo), painel F3, abrir por
  Ctrl+O/menu/arrastar, Início com "🎮 Jogando agora" e a foto do jogo, botão "Voltar ao jogo" na lateral.
- Executável com os núcleos dentro: 14,7 MB (Linux) e 16 MB (Windows), na branch órfã `teste-binarios`.

**Decidido:** D21 (núcleos embutidos por enquanto), D22 (o som dita o ritmo; núcleo no Worker).
**Medido / conferido:**
- **Paridade:** mesma imagem e mesmo som que o adaptador do antigo, quadro a quadro, em SNES, NES, Mega Drive, Game
  Boy e GBA (`packages/engine/test/paridade.test.ts`; referência gerada rodando o `web/nucleo.js` do antigo com
  `KOF_ANTIGO=<pasta>`).
- No executável de verdade: 60 fps, 0 falta de som, núcleo 1,4–1,8 ms/quadro, também com a CPU limitada a 4×.
- 11 testes de fluxo (Playwright) passando, inclusive jogo: cor certa na tela, som saindo, pausa, menu rápido.

**Deu errado / aprendido:**
- Os arquivos de núcleo não exportam nada pro `require` do Node: criam a variável global `Nucleo_<núcleo>`. No Node,
  carregar num `vm` com `atob/btoa` (igual ao teste do antigo); no Worker, `self.window = self` + `eval` indireto.
- No commit `fb7b66e` (M2.1) o `git add -A` levou núcleos que tinham sobrado da pasta local do spike (~10 MB); saíram no
  commit seguinte, mas ficam no histórico da branch. **Lição:** apagar as pastas locais junto com o `git rm`, e
  conferir `git status` antes de `git add -A`.
- Repositório novo é privado: link direto (`raw.githubusercontent.com`) não funciona sem login; o teste do Marcelo é
  pelo `git clone` da branch `teste-binarios`.

**Onde parou:** M2 ⏸ esperando o Marcelo jogar um jogo dele (checkpoint). Ainda **sem saves** (M5). Próximo: M3
(biblioteca e Kof Games).

---

## 2026-10-31 · Empacotamento · executável único e explicação Rust × Tauri × Electron

**Pedido:** "me envia o app", "por que Rust e Chromium e não Tauri, pra empacotar", "e Electron, funcionaria?",
depois "só me dá um comando pra rodar".
**Feito:** `crates/kof-app` (o `kofstation`): serve o front embutido (`include_dir`) em `127.0.0.1` com token e COOP/COEP,
acha Chrome/Chromium/Edge/Brave/Vivaldi (também Flatpak) e abre em modo app com perfil próprio, fecha junto. Adaptador
`platform/local.ts` no front. `rodar.sh` (confere o que falta, compila, abre). Branch `teste-binarios` com os binários.
**Decidido:** D2 ganhou o argumento do empacotamento (um arquivo de 3–16 MB; AppImage/.deb/.rpm/instalador no M15).
Electron funcionaria (leva o Chromium junto, ~100–150 MB) e fica como alternativa se um dia precisar de Chromium fixo
(ex.: modo fliperama/comércio); trocar seria só a casca.
**Medido / conferido:** pedido sem token → 403 `FORBIDDEN`; isolamento ligado; log gravado; `.exe` do Windows compilado
daqui com mingw (não testado num Windows de verdade).
**Deu errado / aprendido:** `pkill -f kofstation` derruba o próprio shell do teste (casa com a linha de comando); usar
`pgrep -x`/`kill`. O alvo do Windows precisa ser instalado no toolchain fixado (`rustup target add ... --toolchain 1.97.0`).
**Onde parou:** Marcelo testou o M1: "ficou excelente".

---

## 2026-10-31 · F3 → M1 · Ambiente, esqueleto, spike da casca e a casca

**Pedido:** "segue até o M1, depois a gente testa".
**Feito:**
- F3: monorepo pnpm + Cargo, TypeScript 6 estrito, ESLint com regra de camadas, Prettier, clippy/rustfmt, CI Linux e
  Windows, `docs/INSTALAR.md`.
- F4a: pacotes `domain`, `contracts`, `app-core`, `engine`; app React mínimo com backend de teste; `kof-core` (app.info,
  `KofError` com código estável, log com `tracing`); contrato testado dos dois lados com as mesmas fixtures.
- F4b: spike Tauri × Rust local + Chromium com os núcleos do antigo (relatório `docs/SPIKE_D2.md`).
- M1: `estilo.css` do antigo inteiro + mesmos ids/classes (D17); menus, lateral, Início (frases e logos por tema),
  Guia (texto do antigo), galeria de temas com busca/categorias/showcase, pilha de telas e Voltar, atalhos, foco por
  controle (o `moverPad` do antigo, D19), telas que ainda não chegaram avisam a etapa.
**Decidido:** D2 proposta = opção B; D17–D20 (CSS do antigo, sem biblioteca de componentes, foco e lista feitos em casa).
**Medido / conferido:** no Linux o Tauri (WebKitGTK 2.52) **não tem WebRTC nem `SharedArrayBuffer`** (mesmo com
COOP/COEP chegando e `enable-webrtc` ligado); o Chromium passa em tudo. Prints antigo × novo do Início, temas e Guia:
iguais. 7 testes de fluxo (Playwright), inclusive um controle simulado pela Gamepad API.
**Deu errado / aprendido:** o 1º CI falhou por `pnpm-lock.yaml` desatualizado (`@types/node` com `^`); o repositório
foi renomeado pra `KOFstation` no meio (o `git push` avisa e redireciona).
**Onde parou:** esperando o Marcelo testar o M1.

---

## 2026-10-31 · Fase 1 e F2 · Auditoria do app antigo e arquitetura nova

**Pedido:** plano de evolução arquitetural (React + TypeScript, Rust, preservar emuladores), começando por uma
auditoria completa sem mexer no projeto antigo.
**Feito:** auditoria em `docs/auditoria/` (arquitetura, dependências, 42 funcionalidades, mapa do sistema, plano de
migração, plano detalhado com estimativa de tokens). Repositórios: antigo renomeado pra `kofstation-old`, novo
`kofstation`. F2: `ARCHITECTURE.md`, `DECISIONS.md` (D0–D16), `API_CONTRACTS.md`, `PARIDADE.md`, `ROADMAP.md`
(76 passos com checkpoint em cada um), `FRONTEND.md`, LICENSE GPL-3, `THIRD_PARTY.md`.
**Decidido (Marcelo):** Linux com a mesma prioridade do Windows; GPL-3; núcleo Kof é da Mel (fora até ela definir);
celular depois; **todas as funcionalidades são intocáveis**; sem correção de segurança no antigo por enquanto.
**Medido / conferido:** o app antigo **não usa RetroArch**: tem frontends libretro próprios (`ponte.cpp`,
`kofnativo.c`, nativo Android). Riscos achados: `kofnativo` sem conferência de `Origin`, atualizador sem assinatura,
dados presos ao perfil do navegador (`file://`).
**Deu errado / aprendido:** o GitHub não diferencia maiúsculas: criar `kofstation` tomou o nome de `KOFStation`; os
atualizadores antigos usam `KOFSnes` e continuam funcionando (**nunca criar um repositório `KOFSnes`**).
**Onde parou:** arquitetura aprovada; começar F3.
