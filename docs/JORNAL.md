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

## 2026-11-22 · O Wii com a experiência dos outros consoles (em andamento)

**Pedido:** "deixa o Wii igualzinho aos outros: mesmas configurações, opções de emulação, menus, filtros; testa".
**Feito:** capas (libretro-thumbnails) pra Wii, GameCube e o PS2 (que também faltava); rótulos e gatilhos do controle
de toque e do celular como controle; disco de Wii/GC sem título interno nem patch de cartucho (cb3b50b). Roteiro
`medir-ps2.mjs --sistema wii --conferir`: abre o jogo e passa por filtros, proporção, escala, molduras, painel de
imagem, menu rápido, F5/F8, estados salvos, opções de emulação, controles, voltar ao jogo, tela cheia e pausa, com um
print de cada em `~/kof-medidas/prints/conferir-wii-*.png`.
**Conferido:** jogando, filtro TV de tubo e filtro fliperama ✓. O resto não chegou a rodar: na 1ª vez o sistema matou
o app (a depuração guardava os quadros; agora o roteiro desliga a rede dela), nas outras a tela do PC bloqueou.
**Onde parou:** ⏸ rodar o roteiro com o Firefox fechado e a tela sem bloquear (Configurações do KDE → Bloqueio de
tela → desligar por enquanto), e corrigir o que der ✗:
`source ~/kof-medidas/ambiente.sh; KOF_APP=$PWD/target/release/kofstation node tools/medir-ps2.mjs --sistema wii --conferir --janela`

## 2026-11-21 (madrugada) · O Wii A liso (o caminho do PS2 já servia)

**Pedido:** "tá rodando mas travando muito; replica o que a gente fez no PS2 liso, não inventa moda".
**Feito:** `SEM_REBOBINAR` com `gc` e `wii` (a3ba9c3; o processo tirava uma foto de 105 MB antes de recusar, o mesmo
erro do PS2 em 19/11); `medir-ps2.mjs --sem-cdp` agora resume o ritmo pelo 🩺 diagnóstico. Nenhuma opção mudou.
**Medido:** jogo de teste Wii A pelo app, Firefox fechado, `--sem-cdp`: **59,9 fps, p99 24,7–25,2 ms, 27–46
engasgos/min, 0 faltas de som**, núcleo p50/p99 5,1/7,7 ms (PS2 A: 59,9 fps, p99 24,5, 18–61/min). Tabela no
`docs/WII-LISO.md`.
**Aprendido:** o "travando" era memória: Firefox aberto + a depuração do medidor guardando cada quadro de 1,35 MB; o
sistema matou o app duas vezes (OOM no log do kernel). Ubershaders assíncronos pioraram (vídeo integrado).
**Onde parou:** ⏸ ele jogar 10 min (com o Firefox fechado) e aprovar os controles; W.3 (save depois de fechar) falta
conferir com um save do jogo.

## 2026-11-21 (noite) · Modo automático N → P → W: **pra você conferir**

### Pra você conferir (passo a passo)

1. **📡 Aparelhos tipo Switch (N, branch `agente-n/rede`)**: abra o app no PC com um jogo rodando, o app novo no
   celular e (se tiver) num segundo PC/notebook, todos pareados. Menu lateral → **📡 Aparelhos** (o último botão):
   toque em **PC + celular de controle**, **Portátil** e **Três aparelhos** e veja se o jogo continua de onde estava.
   Toque nos chips (📺 Tela, 🎮 Controle) de um aparelho pra passar só aquele papel. Desligue o Wi-Fi do aparelho que
   é a tela: a imagem tem que voltar pro PC sozinha, com aviso. Print do painel: `~/kof-medidas/prints/N4-aparelhos-switch.png`.
2. **Rebobinar do PS1 (P, branch `agente-p/rebob-ps1`)**: abra o jogo de teste PS1 A, segure o rebobinar no trecho
   onde você sentiu o tranco e diga se está liso. Se o tranco for "depois de morrer", salve um estado ali (F5) e me
   diga: dá pra medir exatamente aquele trecho.
3. **Wii (W, branch `agente-w/wii`)**: ver a entrada de baixo (o jogo de teste Wii A e os números) e a seção
   "Controles" do `docs/WII-LISO.md`: **aprove ou mude o mapeamento** (setas = Nunchuk, X = A, Z = B, R = chacoalhar,
   o mouse é o ponteiro, clique esquerdo = A, direito = B). Jogue 10 min e diga se está liso.

**Comando pra abrir o app novo** (da branch da W, que tem tudo):

```bash
cd ~/Repositórios/KOFstation && git checkout agente-w/wii && pnpm nucleos && pnpm build && cargo build --release -p kof-app && ./target/release/kofstation
```

(o `cargo` precisa do `export PATH=$HOME/.cargo/bin:$PATH PKG_CONFIG_PATH=$HOME/.local/kof-alsa/usr/lib64/pkgconfig`.)
As três branches estão no GitHub, uma em cima da outra (N → P → W); não abri PR.

**Decidido sozinho (modo automático):** o desenho do 📡 (painel que sai do menu lateral; pra mudar:
`components/BlocoAparelhos.tsx`); o núcleo é sempre o aparelho com o jogo aberto; os controles do Wii/GameCube como na
proposta da tarefa (pra mudar: `domain/entrada.ts`, `NOMES_BOTAO`, e as opções `dolphin_*` no ⚙); o Dolphin pronto do
buildbot, copiado pra Release `nucleos-dolphin-0863ee37` (D40), junto com os arquivos de sistema dele.

---

## 2026-11-21 (noite) · Tarefa W no modo automático: o Wii abre no KOFstation (sem o jogo de teste ainda)

**Feito:** branch `agente-w/wii`, feita em cima da `agente-p/rebob-ps1`. W.1 núcleo na Release nossa (D40) e teste
sem janela; W.2 `gc`/`wii` no app, só nativos; W.3 arquivos de sistema e pasta dos saves; W.4 ponteiro no mouse
(mensagem `PONTEIRO`) e o mapeamento proposto; W.5 opções traduzidas com 4 perfis e o medidor com `--sistema`.
Detalhes no relatório da tarefa e no `docs/WII-LISO.md`.
**Medido / conferido:** fumaça pelo app de verdade com um `.dol` gerado (59,5 fps, 0 faltas, 351 MB); `pnpm check`,
testes Rust (dolphin, opcoes, protocolo, zip) e os 79 e2e ok.
**Deu errado / aprendido:** um `vite preview` que sobrou de um e2e interrompido fez dois e2e testarem o build velho
(anotado no guia do núcleo pesado). A documentação do Dolphin estava desatualizada em dois padrões: valeu o código.
**Onde parou:** ⏸ o jogo de teste Wii A não terminou de baixar a tempo. Falta rodar ele (teste ignorado do
`dolphin.rs` e o `medir-ps2.mjs --sistema wii`), o teste do save ao fechar (W.3), ele aprovar os controles (W.4) e
jogar 10 min (W.5). Os comandos estão no relatório da W.

---

## 2026-11-21 (tarde) · Tarefa P no modo automático: rebobinar do PS1 nativo religado e medido liso

**Feito:** branch `agente-p/rebob-ps1`. `SEM_REBOBINAR` só com o PS2 (teste trava); `tools/medir-rebob.mjs` com a pasta
de medidas, três momentos (apertar, voltando, soltar) e quadro novo/repetido em volta do soltar.
**Medido / conferido:** jogo de teste PS1 A, soltando no meio da fita: ao apertar 54 imagens novas/s, voltando 51/s
(maior intervalo 23 ms), ao soltar 30/s (o ritmo do jogo). PS2 no mesmo dia: 59,9 fps, 0 faltas de som, 18–28
engasgos/min. e2e do rebobinar (5) e `pnpm check` ok.
**Aprendido:** a 1ª medição saiu "travada" ao soltar, mas era o medidor: segurei mais que a fita (5 s de jogo voltam em
2,5 s) e ninguém apertava nada depois. O save automático só entra se o registro do jogo tem `temAuto` (copiei o save
dele pra pasta de medidas e marquei o registro de lá; o dele não foi tocado).
**Onde parou:** ⏸ ele rebobinar no trecho que tinha tranco (e, se for "depois de morrer", mandar um estado). Seguindo
pra W.

---

## 2026-11-21 (tarde) · Tarefa N no modo automático: aparelhos com papéis e o 📡 tipo Switch

**Pedido:** "faça N, P e W em modo automático, push a cada passo, deixe no topo do JORNAL o que eu tenho que conferir".
**Feito:** branch `agente-n/rede` (a3ca013, ac3562d). Transporte separado (N.1, `app-core/transporte.ts`); ficha de
cada aparelho pelo canal `ficha` (N.2); papéis (N.3, `stores/arranjo.ts`: tela por qualquer aparelho com o `levar` de
sempre, canal `papel` pra virar controle); o 📡 no pé do menu lateral com os 4 arranjos grandes e chips 🧠 📺 🎮 por
aparelho, e no ☰ do jogo (N.4); lembra por jogo/console/último (N.5). Desenho em `docs/CONECTIVIDADE.md`.
**Decidido (modo automático):** o visual do 📡 é o da tarefa (painel que sai do menu lateral, botões grandes + chips);
o núcleo é sempre o aparelho com o jogo aberto; a tela reaproveita o `levar` (compatível com o APK antigo); o "vire
controle" precisa do app novo no celular. Pra mudar: `components/BlocoAparelhos.tsx` e `domain/arranjo.ts`.
**Medido / conferido:** `pnpm check` ok; e2e novo com três páginas (`rede-papeis.spec.ts`) e os 13 e2e de rede antigos
passando. Print do painel em `~/kof-medidas/prints/N4-aparelhos-switch.png`.
**Onde parou:** ⏸ ele trocar os arranjos na rede de casa com um jogo rodando (C.3). Seguindo pra P.

---

## 2026-11-21 · Plano novo: rede com papéis, rebobinar do PS1 liso, Wii (N → P → W)

**Pedido:** "redesenho da camada de rede: configurar aparelhos, no máximo 3, cada um com uma função (aparelho tela,
aparelho núcleo, aparelho teclado), na rede local, fácil, e no menu lateral tipo Switch: obrigatório. Rebobinar no
PS1 rodando liso: obrigatório. Depois, Wii: traz o núcleo do RetroArch e faz rodar redondo com as mesmas
configurações do PS2." E: "salva a instrução no repositório que eu passo pro Claude local".
**Feito:** `docs/agentes/PROXIMO.md` (a ordem e o texto pra colar), `N-rede-papeis.md` (o modelo de papéis no
`domain`, arranjos prontos incluindo o de três aparelhos, transporte separado, ficha do aparelho, o bloco 📡 no menu
lateral; é a fase C, C.1–C.4), `P-rebobinar-ps1-liso.md` (religar só o PS1 e achar o tranco no trecho dele, com o PS2
medido junto), e a W ajustada: o `dolphin_libretro` **pronto do buildbot** (o do RetroArch), copiado pra uma Release
nossa com SHA-256 (D40), em vez de compilar. ROADMAP e LEIA-ME dos agentes com N, P e W.
**Onde parou:** o Marcelo cola o texto do `PROXIMO.md` no Claude Code local. Ainda ⏸: o PR da
`claude/busy-ritchie-wrvk8h` pra `main`.

## 2026-11-19 · Próximo emulador: Wii e GameCube (tarefa W preparada)

**Pedido:** "já podemos ir pra novos emuladores, não tem muito mais o que refinar"; "o Dolphin vem primeiro, eu quero
jogar Wii"; GameCube junto; o primeiro jogo de teste é um de Wii com ponteiro e chacoalhar; "não começa por aqui que
o contexto está imenso, mas deixa preparado". Perguntou do Yuzu/Switch.
**Pesquisado:** o núcleo `libretro/dolphin` foi rebaseado no Dolphin atual em out/2025 (OpenGL/Vulkan/D3D11); o "dual
core" não combina com o libretro (alguns jogos caem, pesa mais na CPU: medir no 1º dia); o ponteiro do Wiimote é opção
do núcleo (`dolphin_ir_mode`: analógico direito ou mouse), o que deixa o celular-Wiimote simples (W.6). O antigo não
tem o Dolphin: compilar de um commit fixo no `nucleos.yml` (D40 se o Windows precisar do binário do buildbot).
Switch: não há núcleo libretro vivo (o do Suyu foi arquivado; Eden/Citron são programas próprios) e é risco jurídico
pra um repositório público; fica fora do repositório (se um dia, projeto particular dele).
**Feito:** `docs/agentes/W-wii-gamecube.md` (W.1–W.6, seguindo a seção 6 do `NUCLEO-NATIVO-PESADO.md`), fase W no
ROADMAP (adianta a fase 9), tarefa W no LEIA-ME dos agentes.
**Onde parou:** o Marcelo cola a instrução no Claude Code local (branch `agente-w/wii`, a partir da
`claude/busy-ritchie-wrvk8h`). Junto, ainda ⏸: o PR da `claude/busy-ritchie-wrvk8h` pra `main`.

## 2026-11-19 · Revisão do que o Claude local fez (fases R, G, B e o resto do PS2) e da documentação

**Pedido:** "foi feito muita coisa; passa pela documentação e vê inconsistências, e dá uma olhada no que o Claude
local fez".
**Revisado:** os 32 commits da `gravar` (que já contém a `agente-r/rebobinar`): fase R (rebobinar com a música; o PS1
nativo desligado depois do chiado no PS2), G.1–G.2 (gravar), B.1–B.4 (biblioteca com cara de console, D39), 2.3,
3.2, 4.3, 4.5 e as opções do PS1. O código do rebobinar nativo está certo: o processo começa desligado, a página
não liga no PS1/PS2 (`SEM_REBOBINAR`) e estado maior que 24 MB é recusado (`FOTO_MAXIMA`).
**Corrigido na documentação:** um nome de jogo no JORNAL (numa fala dele) virou "jogo pesado A"; no ROADMAP, o
diagrama ganhou as fases R, G, B e C, a tarefa G (consoles lisos) virou **L** (a letra G já era a fase Gravar), a G.2
aparecia "sem compilar" mas foi testada (`b0eb032`), a R.3 dizia "⏸ ele rebobina" mas está desligada, R.1/R.2 foram
feitas no local (não na nuvem), a 5.1 citava a D1 (que é "sem RetroArch") em vez da D36, a 3.6 não dizia que o jogo A
já está liso, e saíram as sobras velhas ("Onde parou 17/11", a instrução da tarefa F e as listas 1–3 já viradas nas
fases R e B). O REBOBINAR.md e o README dizem que o PS1 está desligado; o SITUACAO ganhou o retrato de 19/11 e a lista
nova do "Pra você testar"; o AGENTS.md perdeu o ponteiro velho pro CONTINUAR.md (08/11). A fase C do roadmap (feita na
nuvem em 18/11) foi juntada.
**Conferido:** `pnpm check` ok; Rust ok menos o `pcsx` (SIGILL deste servidor, sabido); e2e 68 ok.
**Onde parou:** tudo na `claude/busy-ritchie-wrvk8h` (= `gravar` + a fase C + esta revisão). ⏸ ele: os testes novos
do "Pra você testar" e dizer se junta na `main` (PR).

## 2026-11-19 (manhã) · Fase 3 do PS2 com a máquina livre: −500 MB, F5/F8 3× mais rápidos, o erro de memória do B, Bonito e tela larga

**Pedido:** "pode continuar agora, a máquina tá livre, faz tudo que precisa e deixa salvo"; "não há estado salvo do
jogo B, então joga ele um pouco por conta própria".
**Feito (cada um medido antes × depois, jogo pesado A/B, detalhes no PS2-LISO.md):**
- `104b0fe` **Chrome enxuto** (flags no `navegador.rs`): Chrome do app 1.850–1.980 → 1.653–1.724 MB.
- `119eadb` **Estado pelo Rust** (`kof-nativo/src/pacote.rs`): F5 750 → 300 ms, F8 680 → 290 ms, Chrome com F5
  1,9–2,0 GB → 1,45 GB. A 1ª tentativa piorou o F5 (2 s): o `fetch` com bytes crus; com Blob resolveu (perfil).
- `5368a54` **4.3 Bonito**: o culpado era a transparência Alta com a 2x; Básica: 133 → 39–60 engasgos/min.
- `6f0cb4b` **2.3 erro de memória do B**: reproduzido (OOM do kernel em ~10 min); a fila de quadros não cortava com a
  janela escondida (renderer 290 → 4.787 MB em 3 min); corrigido (232–309 MB estável). A depuração (CDP) da medição
  escondia isso e inflava outro processo: `--sem-cdp`.
- `c37f54f` **4.5 tela larga** (a tela forçava 4:3; o aviso `geometria` não chegava) e um bug meu da 3.2 achado no
  teste: o automático de 67 MB derrubava a conexão (teto 64 MB do tungstenite → 256 MB, teste de 70 MB).
- Roadmap: 3.5 não precisou; 5.1 descartado (o núcleo não oferece); 1.4/3.3 esperam o PCSX2 instalado; 1.2 parcial.
**Aprendido:** medir sem depuração quando o assunto é memória (`--sem-cdp`); toda mudança no caminho do estado tem
que passar pelo F5, pelo F8 **e** pelo "Continuar" (o automático é sem gzip e maior).
**Onde parou:** ⏸ ele: jogar o B 10 min e o A no ✨ Bonito; decidir se instala o PCSX2 (1.4/3.3); gravar PS1/PS2 com
som (G.2); PR da `gravar` pra `main`. Sobra no roadmap: 1.2 (gráfico), 1.3, 4.4 (Vulkan), 4.6, 5.2, 6.1–6.5, fase 7
(celular), 8.x (decisões dele) e a fase 9.

---

## 2026-11-19 (madrugada) · B.4, opções do PS1 completas, 6.3 ritmo; 3.2 pausada

**Pedido:** "o chiado foi só no PS2"; "e o Tauri? e o Electron?"; "abre e testa o jogo pesado A"; "continua no
roadmap só com coisas leves até fechar, não precisa perguntar, vou dormir".
**Feito:** B.4 `a42bb7b` (capa do catálogo: as regiões primeiro); 4.1/4.2 PS1 `9f899ec` (as 53 opções que o PCSX
declara, 36 novas no Avançado em português, BIOS e cartão 1 fixos); D2 reavaliado (Tauri/Electron não); 6.3 ritmo.
**Medido:** jogo pesado A (2 min, andando, F5/F8): 59,5 fps, p99 25,7 ms; com a RAM cheia (187 MB livres, jogo com
263 MB na swap) voltaram 112 faltas de som e 61 engasgos/min, e F5/F8 pararam a tela 1,1–2,3 s (era ~0,6 s em 17/11
com a máquina mais folgada). Ritmo do WebAssembly: ~3.580 novos/min, p99 16,67 ms. Memória da página do PS2:
756→570 MB sem estado (o JS é só 60–170 MB; o resto é o Chrome: renderer, GPU e o processo principal).
**Deu errado / aprendido:** a sonda de memória abriu o PS2 pesado com os dados dele e a máquina travou (ele avisou):
medir o PS2 só com a máquina livre, e nunca com os dados de verdade dele. A 4.6 parou: as descrições das opções dos
núcleos WebAssembly saem da tabela errada (turco no SNES) ou vazias; tentativa desfeita.
**Onde parou:** o que sobra no roadmap precisa da máquina livre (PS2: 1.2–1.4, 2.3, 3.2, 3.3, 3.5, 3.6, 4.3–4.5, 5.1),
de aparelho (fase 7: celular), de decisão dele (0.x, 8.x) ou é grande e visual (5.2 filtros novos, 9 emuladores
novos). ⏸ ele: gravar um PS1/PS2 com som (G.2) e dizer se quer o PR da `gravar` pra `main`.

---

## 2026-11-19 · Regressão da fase R no PS2 (chiado e engasgos); rebobinar desligado no PS1/PS2; 3.4 descartada

**Pedido:** voltar à fase 3 (menos RAM, janela própria do PS2 "só se der pra ficar igualzinho com todos os efeitos"),
seguir o roadmap até o fim sem perguntar; "tá com chiado que não tava antes"; "desliga o rebobinar no PS1 por enquanto".
**Decidido:** **3.4 (janela própria) descartada** pelo critério dele: os filtros e as molduras dariam pra levar, mas
tudo que fica por cima do jogo é página (menu rápido, F3, avisos, ⏺, controle de toque, painel de imagem, molduras
animadas) e no Wayland a janela não se posiciona; a gravação e o "jogar no PC" também pegam a imagem da página.
**Achado:** desde o R.3 o processo nativo ligava o rebobinar em **qualquer** jogo, inclusive no PS2 (foto de 48 MB a
cada 2 quadros). Medido no jogo pesado A (2 rodadas de 60 s, andando): antes fps 50,6–56,7, engasgos 810–1030/min,
**faltas de som 457–976/min** (o chiado), CPU do processo 103–119%, 134–178 MB na swap; depois de desligar: fps 60,
engasgos 8–9/min, **faltas 0**, CPU 47%, swap 0. O app instalado dele (de antes da fase R) não tinha isso.
**Feito:** a página não liga o rebobinar no PS1 nem no PS2 (`SEM_REBOBINAR` em `engine/nativo.ts`); o processo
recusa sozinho estado maior que 24 MB (`FOTO_MAXIMA` em `filho.rs`, protege núcleo pesado futuro).
**Aprendido:** toda funcionalidade nova no processo nativo precisa passar pelo banco do PS2 (`medir-ps2.mjs`) antes de
ir pra frente: o PS2 divide o mesmo processo.
**Onde parou:** seguindo na 3.2 (menos RAM). ⏸ ele confirmar se o chiado sumiu (e em que console ouviu).

---

## 2026-11-19 · G.2 testada · Fase B (biblioteca com cara de console) B.1–B.3

**Pedido:** "faz biblioteca com cara de console agora", "pode escolher você de onde vem a sinopse e a nota", "me
envia, vou deitar, pode dar push e commit". Ele foi dormir: máquina livre pra testar.
**Feito:**
- **G.2 testada** (`b0eb032`): `processo.rs` liga o `somPraPagina` e recebe `SOM` de verdade (44100 Hz, tamanho
  certo), desligado para de vir. O mesmo teste esperava o 1º aviso ser o "pronto", mas desde a fase R o aviso do
  rebobinar pode chegar antes (corrida antiga, independente da G.2): agora espera o "pronto". O `pnpm e2e` inteiro
  pegou duas contagens da G.1 (F10 no Guia, ⏺ no menu rápido), corrigidas.
- **B.1** (`e72f7c3`): obra × versões (`domain/obras.ts`), "qual versão?" (`Dialogos.tsx`), zip com várias ROMs =
  uma versão por ROM (`romsDoZip`, `file.zip.read`, `lerArquivoDeJogo(..., preferida)`).
- **B.2** (`70a8ba3`): 📖 catálogo do que falta (`BaseDeJogos.todos`, `catalogoQueFalta`), em cinza, sem Jogar e
  sem link.
- **B.3**: `jogo.sobre` (`kof-files/src/sobre.rs`), `domain/sobre.ts` (títulos a procurar, nota em 0–100),
  `app-core/sobre.ts`, `stores/sobre.ts`, `Ficha.tsx`. Decisão **D39** (Wikidata + Wikipédia).
**Medido:** `pnpm check` ok; `cargo test` 78 ok e o `opengl` instável de sempre; teste pela internet (ignorado no
CI) ok: Chrono Trigger com sinopse em português, Super Mario World com nota, jogo inexistente lembrado; e2e da
biblioteca 8/8; `pnpm e2e` inteiro 75 ok + 2 que passam sozinhos (o showcase de temas, instável antigo, e o "sem
pasta" da gravação, que com a máquina cheia demora mais que 5 s pro 1º pedaço: prazo de 20 s).
**Deu errado / aprendido:** o Wikidata guarda o nome de muitos jogos no idioma `mul` (não `en`): procurar nos dois.
O `user_agent` da configuração do ureq não valia (a Wikimedia respondia 429 pro padrão "ureq/…"): vai no cabeçalho
de cada pedido. O GET do SPARQL pelo ureq ficava sem resposta até o prazo (pelo curl, 0,3 s): POST com formulário
resolveu. Metade dos códigos de console que eu lembrava "de cabeça" pareciam errados por causa do serviço de nomes;
conferidos um a um pelo `wbsearchentities`. No e2e, clicar numa linha já selecionada joga (e a lista se refaz quando
a base carrega): o teste tenta a seleção até pegar.
**Onde parou:** ✅ ele aprovou a fase B ("era isso mesmo que eu queria"). ⏸ falta ele gravar um jogo de PS1/PS2 com som (G.2). Próximo possível:
B.4 (capas no catálogo e por região), se ele quiser.

---

## 2026-11-19 · G.2 · Som do PS1/PS2 nativos na gravação (código escrito, sem compilar)

**Pedido:** "faz o som" (do PS1/PS2 na gravação), deixar tudo salvo e documentado e ver o que falta da próxima etapa.
Ele estava jogando: pela regra dele, **nada de build, teste ou janela** nesta parte.
**Feito:** protocolo nativo com o comando `somPraPagina {sim}` e a mensagem binária `SOM` (`[7,0,0,0, taxa u32,
quadros u32] + i16 estéreo`), no Rust (`protocolo.rs`), no TS (`contracts/nativo.ts`) e na fixture compartilhada
(`fixtures/nativo.json`, com o exemplo nos dois testes de contrato). `filho.rs`: com `somPraPagina` ligado, cada trecho
que vai pra placa (jogando e rebobinando) também vai pra página, antes do volume. `JogoNativo.somPraGravar()`: liga a
cópia e toca o que chega num AudioContext na taxa do núcleo (o worklet `kof-som-pcm`, que já existia), ligado só ao
`MediaStreamDestination` do gravador; desfazer desliga a cópia e fecha o contexto. `stores/gravacao.ts` usa o som do
nativo; se ele falhar, grava mudo e anota no log. Contratos, ROADMAP (G.2 🟨), README e SITUACAO atualizados.
**Medido:** nada ainda (não compilei). Falta, quando ele liberar a máquina: `pnpm check`, `pnpm check:rust` (o
`contrato.rs` confere o `SOM`), `pnpm e2e` inteiro (inclui o `gravar.spec.ts` e o que ficou pendente da G.1) e uma
gravação de PS1 com som conferida com `ffprobe` (deve ter trilha de áudio).
**Riscos anotados:** a fila de mensagens de texto do canal (`mandar`, teto 64) agora divide espaço com o som (~60/s);
se a página ficar muito lenta, os mais velhos saem. Se o núcleo mudar a taxa de som no meio do jogo, o contexto fica
na taxa do `pronto` (o tom mudaria). Página reconectando no meio da gravação: o processo continua mandando, a página
nova ignora (não grava).
**Onde parou:** ⏸ ele liberar a máquina pros testes acima; depois ⏸ ele grava um jogo de PS1 e um de PS2 e ouve.
Próxima funcionalidade escolhida (ROADMAP, "Próximas funcionalidades" item 3): **biblioteca com cara de console**.

---

## 2026-11-19 · Rebobinar do PS1 "aos trancos": medido, sem defeito achado

**Pedido:** ele achou o rebobinar do PS1 (jogo de plataforma, 30 quadros/s) sem fluidez; pediu pra medir com o jogo
em movimento, só no PS1.
**Feito:** `tools/medir-rebob.mjs` (abre o app de verdade com os dados de quem roda, joga com ↑ e Z, segura o
Backspace; a cada vsync diz se a imagem é nova, onde foi a maior parada e quando cada quadro chega pelo canal) e o
teste ignorado `rebobinar_liso_com_jogo_de_verdade` (`KOF_JOGO`, `KOF_ESTADO`, `KOF_VARS`, `KOF_VOLTAR_ATE`).
**Medido:** no processo, cada passo pra trás leva 3–4 ms e toca 16,7 ms de som (60 imagens/s); o canal não cai. No app,
as paradas de 0,6–1 s no começo do rebobinar eram **a tela preta do próprio jogo** (o script corre às cegas e o
personagem morre): o jogo ficou 92–96 quadros sem desenhar antes do Backspace (print confirmou), e o rebobinar volta
por ela. Rodada sem morte: 56 imagens novas/s, maior parada 50 ms. O efeito preto e branco não muda nada (medido com
e sem). "Rodar até 3 quadros por passo até sair imagem" foi testado e saiu (sem número que mostre melhora).
**Deu errado / aprendido:** matar o `kofstation` com `pkill -f` pega o próprio shell; a 1ª tentativa reabriu na janela
dele e derrubou o núcleo do jogo dele (ele avisou). Com uma janela do app aberta, o Chrome do app novo entra nela e
ignora a porta de depuração: fechar a janela antes.
**Onde parou:** ⏸ ele dizer em que momento do jogo sentiu o tranco (correndo? depois de morrer? logo ao apertar?) pra
medir naquele trecho. Depois: G.2 (som do PS1/PS2 nativo na gravação), ainda não começada.
---

## 2026-11-18 · G.1 · Gravar o jogo (F10)

**Pedido:** push da tarefa R (feito, ele testou e funcionou) e "uma funcionalidade pra gravar o jogo, no menu". Ele
escolheu: grava **como ele vê** (moldura + filtro) e **liga/desliga** primeiro.
**Feito:** `2635305`. F10, menu rápido ("⏺ Gravar o jogo") e menu Emulação. `domain/gravacao.ts` (formato MP4→WebM,
nome "Jogo AAAA-MM-DD HH-MM-SS.mp4", cena até 1080p, bits), `engine/gravador.ts` (canvas que junta a moldura e a tela
do jogo a cada quadro + MediaRecorder, pedaços de 1 s), `Jogo.somPraGravar()` (som antes do volume),
`app-core/gravacao.ts` (pedaços em ordem, para no primeiro erro), `kof-files/gravacoes.rs` + `gravacao.parte`/
`gravacao.fim` no `api.rs`, store `gravacao.ts` e selo `#gravando` com o relógio. Fase G no ROADMAP; contratos,
README e SITUACAO atualizados.
**Medido:** `pnpm check` ok; `gravar.spec.ts` 2/2 (MP4 1080p que abre num `<video>`, com trilha de som; sem pasta Kof
Games = erro e para); Rust: `gravacoes` 2/2, `check:rust` ok tirando o `opengl` (ver abaixo). **Não rodei o `pnpm e2e`
inteiro** nem medi o custo de gravar num jogo pesado: o app estava aberto pra ele jogar (regra de não pesar a máquina).
**Deu errado / aprendido:** o `check:rust` reclamou que `kof_nativo::rebobinar` não existia: era cache velho do
`target/` (de antes da tarefa R); `cargo clean -p kof-nativo` resolveu. O `opengl` (leitura assíncrona) falhou de novo
com a carga em 6,7; o `kof-nativo` nem depende dos crates mexidos. O nome do arquivo usa o nome da biblioteca, não o
título de dentro da ROM (que saía "KOFSOM").
**Onde parou:** ✅ ele gravou e funcionou (18/11). Falta, quando ele
liberar a máquina: `pnpm e2e` inteiro e medir com o F3 com × sem gravar. Próximo: G.2 (som do PS1/PS2 nativos). Sem
push da branch `gravar`.

---

## 2026-11-18 · Tarefa R terminada (R.4 e R.5, docs e testes)

**Pedido:** continuar a tarefa R até o fim ("só me chama quando tiver tudo pronto").
**Feito:** R.4 `d75eb75`: o N64 (no PC roda no Worker) rebobina, com uma foto a cada 6 quadros e 64 MB (`fotoCada`/`rebobMb`
em `nucleos.ts`). A imagem volta no mesmo ritmo de 2× e o som junto. A medição do F3 leva `fotoMs`. R.5 já tinha saído
junto com o R.3 (o som no `rebobinar.rs`, mesmos vetores). Diário em `docs/REBOBINAR.md`; ROADMAP, README e SITUACAO
atualizados.
**Medido:** foto do N64 a cada 2 quadros custava 13–24 ms (pico 36); a cada 6 fica ~12 ms (pico 15), ~2 ms/quadro na
média (e2e `rebob-n64.spec.ts`, headless). `pnpm check` ok; `pnpm e2e` 71 ok; `cargo test --workspace` ok.
**Deu errado / aprendido:** o teste `opengl` (leitura assíncrona) falhou com a máquina carregada, e falhava igual no
`f9ec97f` (de antes da tarefa). Com a máquina mais livre, passou: é instável por carga, não da tarefa R.
**Onde parou:** ⏸ o Marcelo ouve no SNES e no Mega Drive e rebobina num jogo de PS1 e de N64. Sem jogo de PS1/N64 nesta
máquina, falta saber quantos segundos cabem num jogo de verdade (docs/REBOBINAR.md, "Números"). Sem push.

## 2026-11-18 · Tarefa R: R.1 a R.3 (som ao rebobinar e PS1 nativo rebobinando)

**Pedido:** "pode continuar, só me chama quando tiver tudo pronto" (tarefa R, branch `agente-r/rebobinar`).
**Feito:** R.1 `82020f3` (contas do som no domain + fixture); R.2 `4ccf8c8` (Worker: som invertido a 2× com fita,
fade e crossfade; opção "Som ao rebobinar 📼/🔇" nas Opções gerais; e2e `rebob-som.spec.ts`); R.3 `85ebed7`
(`crates/kof-nativo/src/rebobinar.rs`: fotos e som dentro do processo; comandos `rebobinar`/`voltar`, aviso `rebob`;
`nativo.ts` liga; PS1 sem `semRebob`, também no wasm).
**Medido:** foto do PS1 nativo ~1,1 ms (release, EXE de teste: salvar 0,6 + comparar 0,5), a cada 2 quadros; o mesmo
som nos dois lados (fixture conferido por TS e Rust); voltar dá o estado gravado e o jogo anda igual depois.
**Aprendido:** no PC o N64 roda no wasm (nativo só no APK): o R.4 é tirar o `semRebob` do N64 no Worker e medir a
foto de 16 MB (espaçar as fotos se pesar). Não há jogo de PS1/N64 nesta máquina pra medir de verdade. Rust local
precisa de `PKG_CONFIG_PATH=$HOME/.local/kof-alsa/usr/lib64/pkgconfig`.
**Onde parou:** falta R.4 (N64), `docs/REBOBINAR.md`, fase R no ROADMAP, `pnpm e2e` inteiro e `cargo test --workspace`;
depois o Marcelo ouve no SNES/Mega Drive e rebobina num jogo de PS1. Sem push.

## 2026-11-18 · Revisão e junção da tarefa F (PS2 liso) e o roadmap depois dela

**Pedido:** "verifica tudo que foi feito: o Claude local fez muita coisa, o PS2 está rodando liso liso". Depois: "o que
falta? pra mim está bem otimizado; não preciso me preocupar com mais gráficos".
**Revisado:** os 15 commits da `agente-d/ps2-liso` (nenhum nome de jogo nos commits nem nos arquivos; o diário
`docs/PS2-LISO.md` e o guia `docs/NUCLEO-NATIVO-PESADO.md` estão bons). O que deixou liso: estado de 48 MB montado na
página (base64 + JSON + gzip, até 2 s parada) passou pra base64 nativo e Worker (parada isolada 1,6 s → 33 ms;
engasgos/min ~110 → 15–33); cartão do PS2 perdia o save porque o app saía sem fechar o jogo (agora fecha e espera,
`nativo::Fechador`); o "pra baixo" era o direcional no T F G H (controles ficaram como estavam); 82 opções do PS2 em
português, tela própria de opções, ✨ Bonito (engasga: anisotrópico 8× ou MTVU, a medir).
**Conferido:** junção direta (fast-forward) na `claude/busy-ritchie-wrvk8h`; `pnpm check` ok; Rust ok menos o `pcsx`
(SIGILL do container, sabido); e2e 68 ok. O CI de `d45e6f0` caiu no e2e do F4 (navegador fechou a sessão; instável
conhecido, commit só de docs).
**Decidido:** o resto das fases 1, 3, 4 e 5 fica sem pressa; foco em conferir no uso (fase 0) e casa própria (fase 8).
**Onde parou:** o Marcelo confere o cartão (formatar, salvar, fechar, reabrir, carregar) e decide a fase 8.

## 2026-11-17 · Roadmap com entregáveis e tarefas; tarefa F (jogo A liso hoje)

**Pedido:** o roadmap novo no mesmo formato do da migração (entregável e divisão de tarefas) e a instrução pro Claude
local. O que ele quer: "jogar o jogo pesado A liso, liso, hoje".
**Feito:** cada passo do `docs/ROADMAP.md` ganhou entregável, checkpoint e tarefa; seção "Divisão de tarefas" (F, D, E
no PC dele, em sequência na mesma branch por mexerem nos mesmos arquivos; G, H depois; O = orquestrador) e a instrução
pronta no fim. Tarefa nova `docs/agentes/F-ps2-liso-hoje.md`: o atalho de hoje (linha de base, salvar automático,
bateria a cada 1 s, lixo de quadros, cartão, shader, opções), cada um com experimento curto e número.
**Onde parou:** o Marcelo cola a instrução no Claude Code local.

## 2026-11-17 · A migração está completa; roadmap novo

**Pedido:** "novo roadmap: antes de adicionar outros emuladores, otimizar e melhorar o que temos. Agora não é mais
migração: diga que a migração foi completa."
**Feito:** o roadmap da migração virou `docs/ROADMAP-MIGRACAO.md` (histórico, com o aviso de concluída). `docs/ROADMAP.md`
novo: fase 0 conferir no uso (os ⏸ que sobraram), 1 régua de medição, 2 PS2 sem defeito, 3 PS2 liso, 4 opções
completas (✨ Bonito), 5 gráficos, 6 todos os consoles lisos, 7 celular, 8 casa própria (main, atualizador, Releases
próprias, T.2), 9 só então emuladores novos. Regra: medir antes e depois, uma mudança por vez. README, AGENTS.md,
docs/README.md e SITUACAO dizem que a migração terminou.
**Onde parou:** fases 1–5 com o Claude Code no PC do Marcelo (tarefas D e E); eu reviso e junto.

## 2026-11-17 · Decisões das opções e os engasgos por memória (pras tarefas D e E)

**Decidido com o Marcelo:** toda opção do núcleo aparece no menu (grupos como o PCSX2 + Avançado com o resto, nada
escondido); entra o perfil **✨ Bonito**; tela larga e 60 fps desligados por padrão com botão por jogo; **o PS1 fica no
PCSX-ReARMed por enquanto** (trocar depois). Ordem: cartão → engasgos e memória → opções → gráficos.
**Engasgos:** continuam esporádicos no jogo pesado A; ele desconfia de RAM. Li o código: suspeitos em ordem são o lixo
de quadros na página (um `ArrayBuffer` novo por quadro), o salvar automático do nativo pela página, a bateria copiada a
cada 1 s, shader na 1ª vez e swap. Viraram a "Fase 0b" da tarefa D; a parte 3 (gráficos) entrou na tarefa E.
**Onde parou:** o Marcelo cola o texto do fim da tarefa E no Claude Code local.

## 2026-11-17 · Tarefa E (cartão do PS2 e opções completas) e o novo substitui o antigo

**Pedido:** o Marcelo jogou o jogo pesado A no novo: roda relativamente liso, **engasga em alguns momentos**, e **no
menu de salvar não desce nem salva no cartão de memória**. Quer também o **pacote completo de opções** (PS2 como o
PCSX2, PS1 com várias opções de gráfico e emulação). Tudo pelo Claude Code local, com instruções minhas. E: "o novo
está melhor que o antigo, podemos descartar o antigo".
**Feito:** `docs/agentes/E-ps2-cartao-e-opcoes.md` (parte 1: cartão de memória e o "pra baixo", com as hipóteses e
onde olhar; parte 2: Avançado com tudo o que o núcleo declara, grupos como os do PCSX2, renderer escolhível, perfis
revistos com número). Ordem pro agente local: E1 → D Fases 0–2 (o trecho que engasga) → E2 → D Fase 3, parando pra
mostrar ao fim de cada parte. **D38**: o novo é o produto; paridade não trava mais; o repositório antigo fica (o novo
ainda baixa núcleos e as `.so` do celular de lá). AGENTS.md atualizado.
**Onde parou:** o Marcelo cola o texto do fim da tarefa E no Claude Code local. T.2 continua com ele.

## 2026-11-17 · PS2 liso reaberto: tarefa D pro agente no PC do Marcelo

**Pedido:** voltar ao PS2 liso (M16.5), agora pelo Claude Code local, que tem a placa, a BIOS e os jogos: ele abre os
jogos e testa sozinho até ficar "tão liso quanto o PCSX2", vendo primeiro o que fazemos diferente do PCSX2 e chegando
perto aos poucos, **documentando tudo**. E: **nome de jogo não vai pro repositório**.
**Feito:** `docs/agentes/D-ps2-liso.md` (regras, o que existe, fases: banco de medição que roda sozinho → régua com o
PCSX2 e o antigo → tabela de diferenças → um passo por vez com antes × depois; diário em `docs/PS2-LISO.md`). Os nomes
dos jogos saíram dos docs, comentários e testes: agora são **jogo pesado A** (engasga), **B** (erro de memória) e **C**.
O histórico do git ainda tem os nomes antigos (reescrever histórico é decisão do Marcelo).
**Onde parou:** o Marcelo abre o Claude Code local com o texto do fim da tarefa D e diz os caminhos dos jogos na conversa.
Eu (orquestrador) não mexo em PS2; quando a `agente-d/ps2-liso` tiver relatório, reviso e trago.

## 2026-11-16 · Atalhos da rede no Início e no ☰ do meio

**O que aconteceu:** o Marcelo testou o pareamento ("funfou bem") e pediu que ver o jogo do PC e usar o celular como
controle ficassem à mão, sem ir em Controles. Novo `components/AtalhosDaRede.tsx`: com o outro aparelho pareado e
conectado, o **Início** (no topo) e o **📡 Aparelhos** mostram, no celular, 📺 Ver o jogo do PC aqui (o Jogar no PC) e
🎮 Usar como controle do PC (o controle total pela rede pareada, que mexe nos menus e no jogo do PC); no PC, com jogo
aberto, 📱 Levar o jogo pro celular / 📺 Voltar pra TV. O **☰ do meio** (menu rápido) do celular ganhou os dois itens.
Nada novo por baixo: chamam as mesmas funções de antes. e2e novo em `celular-pc.spec` (Início, controle, PC, ☰ e ver o
jogo); `pnpm check` e os 67 e2e passaram.
**Onde parou:** pacote novo na `teste-binarios` pra ele testar (T-REDE atualizado).

## 2026-11-14 · O CI da paridade do celular estava vermelho

**O que aconteceu:** os dois últimos envios (o do zip com a ISO e o do controle por console) falharam no CI do Linux no
passo novo "Paridade da abertura e do controle de toque": `tools/paridade-*.mjs` pediam o pacote `playwright`, que só
existe na minha máquina; o projeto tem o `@playwright/test`, que exporta o mesmo `chromium`. Troquei nas três
ferramentas e rodei o passo igual ao CI (página do antigo no commit fixado `ceba493`): abertura TUDO IGUAL, controle
TUDO IGUAL. No CI faltava também esperar o `vite preview` subir (era `sleep 4` fixo; agora espera a porta, em
127.0.0.1) e o teste do som sem isolamento media 2 s e exigia 30 mil amostras/s: o CI com 2 testes juntos deu 27 mil
(som saindo, só mais devagar). Agora mede 4 s e o piso é 20 mil; o defeito que ele pega é o mudo. Código do app não mudou; o pacote da `teste-binarios` continua valendo.
**Onde parou:** só falta o teste de pareamento (T-REDE), que o Marcelo faz em casa. T.2 e o PS2 seguem com ele.

## 2026-11-14 · O controle de toque por console no celular (vinha o do Super Nintendo no PS1)

**Pedido:** "abri o PS1 e veio o controle do Super Nintendo; no antigo o sistema detecta o console e muda o controle. Por que não veio?".
**Por quê:** eu tinha testado o controle de toque só com Mega Drive no navegador e o nativo com uma casca falsa sem apertar botão;
nunca comparei console por console com o antigo. Faltavam as marcas que o antigo põe no `<body>` ao abrir o jogo (`app.js` 2479–2483):
`analogico` (o direcional vira joystick: PS1/PS2/N64 — sem ela aparecia a cruz do SNES), `so-ab` (GB/NES/SMS/GG/GBA sem X/Y/L/R) e
`nativo` (sem ⏩ no PS1/N64). **Feito (portado como está):** `marcarConsole(sis, nativo)` em `stores/entrada.ts` (ao abrir o jogo) e o
mesmo no controle do PC (`consoleDoControle`, android.js 356–360 e 411–415).
**Teste de paridade:** `tools/paridade-controle.mjs` abre o mesmo jogo (PS1 por zip, N64, GB, MD) nas duas páginas, aperta cada botão
do controle de toque e compara marcas, rótulos (inclusive os escondidos) e o código que chega no núcleo: antes **9 diferenças**, agora
**TUDO IGUAL**. Entrou no CI junto do da abertura.

## 2026-11-14 · A abertura do zip com a ISO no celular (o motivo do "nem abre" e do "trava")

**Pedido:** "o antigo abre a ROM e o novo nem abre; faz o teste de paridade da parte que abre a ISO do zip; traz igual ao antigo".
**Causa (achada comparando o código):** o antigo decide se o jogo vai pro núcleo nativo ANTES de ler o arquivo (`consoleNativo` do
`android.js`): `.zip` pelo diretório (`itensDoZip`/`cdDoZip`), `.bin` pelo começo. O novo olhava só a extensão: o `.zip` com a ISO caía
no WebAssembly, que lê o CD inteiro na página (travava; com CD maior, nem abria). Pela Biblioteca o novo também não sabia que tinha
PS1/N64 nativos (lia o arquivo inteiro).
**Feito (portado como está no antigo):** `consoleNativoDoApk`/`nomesDoZip` em `platform/android-nativo.ts`; `nativo.disponivel` no Android
= os nativos da casca; `nativoLigado('n64')` (só o APK tem). **Teste de paridade de verdade:** `tools/paridade-abrir.mjs` (página antiga ×
nova, 9 arquivos gerados): a versão anterior dava **4 DIFERENÇAS (todas com zip)**; agora **TUDO IGUAL**, lendo só o diretório do zip
(~250 B). Entrou no CI e num e2e (`android-simulado`: zip com ISO, zip com .cue+.bin e zip de N64 vão pro nativo; zip de GB não).
**Aprendido:** eu tinha testado a lógica nova com arquivos soltos (`.cue`, `.z64`), nunca o caminho real (zip) contra o antigo. A paridade
tem que ser medida com os mesmos arquivos nas duas páginas, não suposta.

## 2026-11-14 · PS1/N64 no APK: as duas últimas diferenças do antigo, e a otimização documentada

**Pedido:** ainda travando no APK novo (com a correção do salvar automático): trazer as diferenças que achei e deixar idêntico ao
antigo; documentar como a otimização foi feita, pra repetir no PS2.
**Feito:** (1) a página não desenha nada por baixo do PS1/N64 nativo rodando, nem o chiado/fita dos filtros animados
(`useTelaDoJogo`: `j.android && !j.parado` = sai; `JogoNativoAndroid.parado`), como o `app.js` 1145/1178 do antigo; (2) a casca serve
a página **sem COOP/COEP**, como o antigo. `docs/NATIVO-LISO.md`: arquitetura, as 8 regras (antigo × novo, com arquivo e linha), como
medir e a lista de conferência pro PS2.
**Não provado aqui:** o efeito no aparelho.

## 2026-11-14 · Paridade do PS1/N64 no APK (travando) · salvar automático e estado grande

**Pedido:** o PS1/N64 trava no APK novo (no antigo tinha sido resolvido): "faz o teste de paridade; tá tudo igual?".
**O que eu NÃO tinha feito:** teste de desempenho/paridade do PS1/N64. Só testava a lógica com casca falsa.
**Conferido agora:** (1) o Java e as `.so` são idênticos ao antigo (`diff` de Ps1Jogo/N64Jogo/Ps1/N64/SavesNativos/Rede/ControleServidor).
(2) `tools/paridade-casca.mjs` roda a página do APK antigo e a do novo com a MESMA `KOFnesApk` falsa: chamadas por nome (Pad ≈ 460/8 s nas
duas, Area/Volume a cada 30 quadros nas duas), tempo de script e tarefas longas (nenhuma nas duas): **o ritmo de chamadas à casca é igual**.
Única diferença no uso da casca: o antigo chama `Reiniciar` uma vez depois de abrir (`s.reset()`, app.js 2475); o novo não chamava → agora chama.
**Bug de paridade achado:** o antigo salva automático nos nativos no mínimo a cada **2 min** ("o estado é grande", app.js 2774); o novo salvava a cada
**30 s** em tudo. No celular cada salvamento passa 4–16 MB pela ponte síncrona (medido: bytes→base64 de 16 MB = 3 s a CPU 6× mais lenta) =
travada de segundos. Corrigido: `autoSegundos(escolhido, nativo)` (piso de 120 s, igual ao antigo, com teste contra o app.js do antigo).
**Melhoria no caminho dos estados grandes:** gravação em pedaços de 384 KB (`store.put.parte`, a página respira entre eles) e leitura por URL
(`/kofdados/<loja>/<chave>` servida pelo `MainActivity`, sem base64); testes de JVM e unit.
**Não consegui provar:** que essa seja a única causa do travamento no seu celular (sem aparelho aqui). Se ainda travar, preciso saber SE é só no
launch ou a cada ~2 min, e o modelo do celular; o próximo passo é perfilar na WebView (`chrome://inspect`).

## 2026-11-14 · M14.3 e M14.5 · pasta de ROMs e atualizador do APK (reaproveitando o antigo)

**Como:** sobre o que já estava na casca do antigo. **M14.3:** a `Pasta.java` (SAF) ganhou o caminho relativo de cada arquivo; a nova
`PastaComandos.java` atende `library.root.get/scan/crc/inventory`, `file.read/stat`, `file.zip.list/read` (diretório central do zip lido por
posição; inflate raw) e `pasta.preparar` (o PS1/N64 nativo copia o CD da pasta); `Comandos.java` ganhou um `Delegado` pros comandos da casca.
TS: `abrirPedirPasta` abre o seletor do Android (`KOFnesApk.pastaEscolher` + `__pastaEscolhida`) e jogo da pasta que é PS1/N64 vai pro
nativo (`pasta.preparar` + `JogoNativoAndroid`). **M14.5:** `AtualizacaoApk.java` (`app.atualizacao`: compara o `codigo` do
`android-versao.txt` da última Release com o `versionCode` e pergunta "Baixar"); `versao.yml` monta o APK e sobe `KOFstation-novo.apk` + `android-versao.txt`;
`ci.yml` roda `android/testar.sh` e monta o APK. **Conferido:** e2e `android-pasta` (escolhe a pasta, lista, abre GB por `file.read`, abre PS1 por
`pasta.preparar` + `ps1Abrir`); `android/testar.sh` (JVM) ok; APK de 13 MB assina. **Não provado aqui:** o SAF e o `HttpURLConnection` de verdade
(só no aparelho / numa Release).

## 2026-11-14 · M13/M14 · rede e controle no APK novo (lado do celular)

**Pedido:** "testa a rede entre aparelhos no APK novo e as opções do controle; faz a paridade total".
**Como:** em cima do que já existia (casca, `Rede.java`, `ControleServidor.java`, `libkofrede.so` do APK antigo). O que faltava era a
**tela do celular no app novo** (o `android.js` do antigo): `platform/android.ts` ganhou `rede()` (KOFnesApk.redeCmd + `window.__rede`) e o APK
passou a levar a `libkofrede.so`; `stores/modoControle.ts` + `components/ModoControle.tsx` = o `entrarModoControle` do antigo (Jogar no PC por
WebRTC com vídeo, ping, menu do PC, filtro do celular; controle pela rede pareada com jogador e console; servidor de endereço e senha do APK);
`screens/Aparelhos/LerQr.tsx` (📷 Ler o QR do PC, BarcodeDetector ou `jsqr`) e 🎮 Jogar no PC por aparelho; botões `.so-pc`/`.so-cel`.
**Conferido:** e2e `celular-pc.spec.ts` com **duas páginas de verdade** (PC e `?celular=1`) ligadas por um cabo de teste: o celular pede,
chega o vídeo por WebRTC (videoWidth > 0), o ping, o botão apertado no celular chega no PC, o menu do PC aparece e "Voltar pra TV"; e o
controle pela rede ("PC de teste · Jogador 1", console Mega Drive). Estável 3×. `pnpm check` com o antigo e `pnpm e2e` (64 ok).
**Falta provar no aparelho:** o `libkofrede.so` de verdade (UDP 8650 na Wi-Fi) e a câmera do QR no Android (T-REDE no SITUACAO).

## 2026-11-14 · Auditoria, som do APK e fecho de qualidade

**Pedido:** olhar o repositório e o roadmap, rodar todos os testes, deixar o app "igualzinho" ao antigo e descobrir por que o APK
saiu sem áudio.
**Causa do mudo:** `Jogo.ligarSom` e `Tocador.ligarSom` só ligavam o som com `SharedArrayBuffer` + `crossOriginIsolated`. O WebView do
Android **não tem isolamento de origem** (os cabeçalhos COOP/COEP que a casca manda não o ativam), então os dois devolviam "sem som" e os
jogos de WebAssembly (SNES, GB, NES, Mega Drive, GBA...) e a música do Início rodavam mudos. O PS1/N64 nativos tocam pelo Java e não
tinham esse problema. O teste daquela versão só cobria o PC (isolado), por isso passou.
**Feito:** som sem memória compartilhada: o Worker escreve num anel só dele, `drenar` tira os quadros e manda `{tipo:'pcm'}`; a página
repassa ao AudioWorklet `kof-som-pcm` (fila com teto de ~250 ms, silêncio quando seca). A jukebox e a trilha usam um relógio virtual
pra saber quanto já tocou. Com isolamento (PC) nada muda: o caminho antigo continua igual. e2e novo `som-sem-isolamento` (força
`crossOriginIsolated=false`, mede ≈ 48.000 amostras por segundo tocadas e sem "sem som" no F3).
**Auditoria de paridade:** o teste com o antigo achou uma regressão minha (🏠 Início e 🎮 Controle virtual no menu rápido; no antigo
também só existem no celular: teste ajustado). A "diferença" da abertura (logo do tema × ícone) era uma nota velha do PARIDADE: o
novo já mostra a xícara.
**Medido:** `KOF_ANTIGO=… pnpm check` (domain 145, engine 61+1, app-core 34, desktop 20), `pnpm e2e` 62 ok, `cargo fmt/clippy`, `cargo test
--workspace --no-fail-fast` (só o `pcsx` com SIGILL, sabido), `android/testar.sh`.

## 2026-11-14 · M14.4 · PS1 e N64 nativos no APK (reaproveitando a casca do antigo)

**Pedido:** o APK novo tem que rodar PS1 e N64 como o antigo ("não recria do zero, rearquiteta").
**Erro meu:** escrevi uma casca nova do zero, apaguei o `pcsx.js`/`mupen64.js` do APK e disse que PS1/N64 rodavam no
WebAssembly: **não rodavam** (o APK anterior não abria nenhum dos dois). O antigo roda nativo (`.so` ARM64 + `Ps1Jogo`/`N64Jogo`).
**Achado:** o APK pronto do antigo (`android/apk/KOFstation.apk`) traz as `.so`; **não precisa de NDK**.
**Feito:** `android/` agora é a casca do antigo com o mínimo mudado (assets do app novo com COOP/COEP, ponte nova `KofAndroid` ao
lado da `KOFnesApk`, Voltar, sem o Atualizador do antigo); `construir-apk.sh` extrai as `.so` do APK antigo na hora de montar
(nada de binário no histórico) e mantém o WebAssembly do PS1/N64 de reserva. TS: `engine/nativo-android.ts`
(`JogoNativoAndroid`, a `fachada()` do `android.js` com a cara de sessão do app novo: botões a cada 16 ms, área do jogo, volume,
savestate em base64), `platform/android-nativo.ts` (decide por extensão se vai pro nativo), `stores/jogo.ts` (ramo
`nativoAndroid`: o CD não passa pela página, o "arquivo" guardado é uma marca de 16 bytes, sem cópia na loja `roms`).
**Medido / conferido:** unit (5) e e2e com `KOFnesApk` falsa: `.cue` → `ps1Abrir`, depois `ps1Pad`/`ps1Area`/`ps1Volume`, sem baixar o
WebAssembly do PS1; `.z64` → `n64Abrir` e o PS1 fecha; pausar para de mandar botões (é o sinal que esconde a tela nativa). Nomes
JNI das `.so` (`Java_dev_kofnes_android_Ps1_*`, `..._N64_*`) batem com as classes copiadas. APK 13 MB assina e verifica.
**Falta:** jogar no celular (T-CELULAR passo 4); reabrir CD nativo pela Biblioteca (depende do M14.3, a `Pasta.java` já está lá).
**Onde parou:** ⏸ o Marcelo testa PS1/N64 no APK; depois M14.3.

## 2026-11-14 · Fecho da sessão · onde parou

**Feito nesta sessão (um commit por passo):** M16.4 (`047e047`), T.1 (`ad355eb`), M14.2 (`802bb61`), M14.1 (`d45ab03`),
e2e do F4 mais firme, `tools/publicar-teste.sh`. Pacote novo na `teste-binarios` (um commit órfão com Linux, Windows e o
`KOFstation-novo.apk`; os executáveis e o APK foram conferidos com `grep` pelo código novo antes de publicar). Essa branch
tinha o pacote com as tentativas do PS2 (`rascunho/ps2-liso`): foi substituída pelo pacote sem elas.
**Pausado por decisão do Marcelo:** M16.5 (otimização do PS2). **Não mexi** nos ⏸ de M9–M13, M15 e PS2 (só preparei os testes na
lista "Pra você testar" do SITUACAO). **T.2 não foi feito** (fica pra ele decidir).
**Não feito, com motivo:** M14.3, M14.4 e M14.5 (SAF/biblioteca em Java sem aparelho, NDK ausente, atualizador sem canal
de publicação do APK): `docs/ANDROID.md` tem a ordem sugerida. A lista completa do Avançado ("tudo que o núcleo
declara") também ficou pra depois (precisa de um comando que abra o núcleo só pra listar).
**Próximo passo:** o Marcelo faz os testes da lista "Pra você testar" (T-M16.4 e T-CELULAR primeiro) e diz o que quebrou.
Depois: M14.3 (Java com teste de JVM) e, com o NDK, M14.4.

## 2026-11-14 · M14.1 · casca do Android e o app novo dentro (APK)

**Pedido:** M14.1 a M14.5; sem o Android SDK, fazer o que der e dizer o que faltou.
**Ambiente:** `dl.google.com` é bloqueado (sem SDK/NDK), mas o `apt` tem as ferramentas que o antigo já usava (aapt,
dalvik-exchange, apksigner, zipalign, `android-23.jar`, `org.json`): instalei e o APK monta e assina aqui. **NDK não existe**.
**Feito:** `platform/android.ts` (adaptador `Backend` sobre `window.KofAndroid`, base64, erro do contrato, com teste);
`escolher.ts` usa ele dentro do APK; `ligarModoCelular` liga o modo celular sozinho; `window.__kofVoltar` pro botão Voltar.
`android/`: `Comandos.java` (Java puro: app.*, log.write, config.*, store.* com os mesmos nomes de arquivo do Rust,
nativo.disponivel vazio, library.root.get sem pasta; o resto devolve `UNSUPPORTED` dizendo qual passo falta), `Ponte.java`,
`MainActivity.java` (WebView em `https://kofstation.local/` servindo `assets/web` com COOP/COEP, seletor de arquivos, Voltar,
tela cheia), `AndroidManifest.xml`, `construir-apk.sh` (sem lambda: o dx do minSdk 24 não aceita invokedynamic), chave de
teste `kofstation-teste.keystore` (como a do antigo; `applicationId` próprio `dev.kofstation.android`). `docs/ANDROID.md`.
**Medido / conferido:** `android/testar.sh`: 22 verificações de JVM dos comandos (config, lojas, erros, nomes de arquivo
iguais aos do Rust). `unit` do adaptador (6). e2e `android-simulado.spec.ts` com uma ponte KofAndroid falsa em JS: o app liga no
modo celular sozinho, abre um jogo, o save vai pra loja da "casca" (`sram.KOFSAVE.32768`), a biblioteca sem pasta não
quebra. APK de 8,5 MB compila contra o `android.jar`, o `apksigner verify` passa (v2/v3) e o `aapt dump badging` mostra
`dev.kofstation.android`, minSdk 24, ícone da xícara.
**Não feito (e por quê):** M14.3 (pasta de ROMs por SAF: `library.*`/`file.*` em Java é grande e não dá pra provar sem
aparelho), M14.4 (precisa do NDK), M14.5 (depende de publicar o APK junto das versões e de decidir a verificação). Tudo
anotado no ROADMAP e em `docs/ANDROID.md`, com a ordem sugerida.
**Onde parou:** ⏸ o Marcelo instala o APK (T-CELULAR). Próximo código: M14.3 em Java com teste de JVM.

## 2026-11-14 · M14.2 · controle de toque e layout do celular

**Pedido:** M14.2 (controle de toque dos 6 modelos e o layout), feito e testado no navegador com tela de celular.
**Feito:** `?celular=1` (ou aparelho de toque Android, ou o APK) liga a classe `celular` no `<html>` (`app/celular.ts`).
`styles/celular.css` é o `android.css` do antigo (a marcação do novo usa os mesmos ids e classes). `components/ControleDeToque.tsx`
é o `#ctl` do antigo em React: multitoque por `pointerId`, deslizar troca de botão, direcional com zona morta que vira
analógico nos consoles que têm (misto no PS1, puro no N64/PS2), ☰ = menu rápido, ⏪ = rebobinar, ⏩ = turbo, rótulos por
console (Mega Drive A/B/C, PS1 ✕○□△, N64...). `stores/toque.ts` guarda os dedos e as preferências (chaves do antigo ctlModelo,
ctlTam, ctlOpa, ctlVibrar, ctlCanhoto); `hooks/useEntradaDoJogo` soma o toque ao teclado do J1. Tela Controles no
celular = galeria dos 6 modelos com miniatura, tamanho, transparência, vibrar, canhoto e "restaurar o padrão"
(`screens/Teclas/ControlesDeToque.tsx`); menu rápido ganha 🏠 Início e 🎮 Controle virtual.
**Medido / conferido:** e2e `celular.spec.ts` com viewport de celular (390×780 e 844×390, toque): o controle aparece só
jogando; A+Start juntos (multitoque), soltar um mantém o outro, deslizar de B pra Y; diagonal do direcional e zona morta;
☰ abre o menu rápido; os 6 modelos mudam e ficam guardados depois de recarregar; deitado o direcional fica à esquerda
da imagem e os botões à direita, sem cobrir. Prints: `apps/desktop/test-results/celular-*.png`. `pnpm check` e `pnpm e2e` (57 ok).
CI do T.1 verde no Linux e no Windows; o do M16.4 (run 110) falhou só no e2e do F4 (carregamento do painel de imagem
sob carga), que passou de novo no run seguinte: instabilidade já vista, sem relação com o commit.
**Deu errado / aprendido:** um `usarJogo(...) && usarTelas(...)` chamou o hook condicionalmente e derrubou o App
("reading 'length'" do React): hooks nunca em curto-circuito. E `prettier --write` rodado dentro de `apps/desktop` ignora o
`.prettierignore` da raiz e reformatou o `estilo.css` do antigo: rodar sempre da raiz.
**Onde parou:** M14.1 (casca Java servindo o app novo).

## 2026-11-14 · T.1 · paridade fechada com testes contra o antigo

**Pedido:** fechar os itens não verificados do `PARIDADE.md`, com teste automático contra o `kofstation-old` (só leitura)
onde der.
**Feito:** (1) `apps/desktop/src/testes/paridade-antigo.test.ts` (KOF_ANTIGO): o menu rápido tem os mesmos itens na mesma
ordem do `ITENS_RAPIDO`; cada aviso literal do antigo (53) existe no novo ou está numa lista de diferenças com o motivo.
O teste achou 2 mensagens que faltavam e elas foram copiadas ("o menu rápido é só durante o jogo"/"abra um jogo
primeiro", "este jogo vai abrir sempre com esse jeito"). (2) `packages/engine/test/paridade-sistemas.test.ts`: lê o
`nucleo.js` do antigo e compara sistemas, extensões, núcleo, tamanho de imagem, proporção, opções fixas, analógico e
BIOS. (3) `contraste.test.ts`: as cores dos 126 temas são idênticas às do antigo; contraste WCAG medido (10 pares já
eram baixos no antigo: lista fixa, que só pode encolher). (4) e2e novos: `paridade-teclas` (Tab = turbo ×1,8 ou mais,
F11, proporções 4:3/8:7/esticar), `biblioteca-grande` (3.000 jogos, CPU 4× mais lenta: 433 ms até a primeira linha,
150 linhas no DOM), `nucleo-sob-demanda` (nenhum núcleo no Início; só o do console do jogo).
**Decidido:** os itens que só o Marcelo verifica ganharam o estado ⏸ no PARIDADE e um teste com passo a passo na lista
"Pra você testar" do SITUACAO (T-JOGO, T-OUVIR, T-NEOGEO, T-PS2, T-REDE, T-INSTALAR, T-DIAG). "Estado salvo com outro
núcleo de SNES" ficou ➖ (não se aplica sem o núcleo Kof). Dois textos do PARIDADE estavam velhos (cartão BIOS do
Início e lista de BIOS da abertura já existem e têm e2e): corrigidos.
**Medido / conferido:** `KOF_ANTIGO=… pnpm test` verde (domain 145, engine 56+1, app-core 34, desktop 14);
`pnpm e2e` 51 ok + 1 ignorado.
**Onde parou:** M14 (celular).

## 2026-11-14 · M16.4 · opções de emulação de todos os consoles

**Pedido:** juntar a tarefa B (`agente-b/opcoes-nucleo`), fazer a tela (DIAGNOSTICO.md §4) e catalogar o N64 e os
consoles em WebAssembly.
**Feito:** (1) merge da branch do B (catálogo PS1/PS2, teste Rust contra os `.so`). (2) `domain/opcoes-camadas.ts`: as
camadas geral → console → jogo (puro, com teste): `resolverOpcoes`, `opcoesParaNucleo`, `compararOpcoes` ("na hora"
× "ao reabrir"), ajustes que não mexem no objeto antigo. (3) `stores/emulacao.ts`: guarda tudo na chave `emuOpcoes` da
configuração; ao abrir o jogo as opções entram no núcleo (nativo e WebAssembly); mudar com o jogo aberto manda o que
vale na hora (`Comando::Variavel` / `opcoes` do Worker) e avisa o resto. (4) `screens/Estados/OpcoesDoConsole.tsx`:
perfil geral, console, "valer para o console todo ou só este jogo", perfil do console/jogo, opções por grupo com o
selo ⚡/↻, **Avançado**, "voltar ao perfil" e "apagar os ajustes". (5) Catálogo dos WebAssembly em
`domain/opcoes-nucleo-wasm.ts`: N64 (12), SNES (5), GB (6), NES (5), Mega Drive/SMS/GG (5), GBA (6).
**Medido / conferido:** os núcleos WebAssembly do antigo não expõem as opções que declaram (a ponte ignora o
`SET_VARIABLES`). `tools/opcoes-wasm.mjs` varre a memória estática de cada módulo (tabelas `retro_core_option_v2`) e
gera `packages/contracts/fixtures/opcoes-wasm.json` (chave, valores e padrão **de verdade**); o teste
`opcoes-nucleo-wasm.test.ts` falha se o catálogo disser outra coisa. Isso mostrou, por exemplo, que o Mupen64 do
WebAssembly só tem GLideN64 e interpretador (sem recompilador, sem Angrylion). Novo e2e `opcoes-emulacao.spec.ts`
(perfis, ajuste fino, Avançado, persistência depois de recarregar). `pnpm check`, `pnpm e2e` (46 ok),
`cargo clippy`/`fmt` ok, `cargo test --workspace --no-fail-fast` ok (só o `pcsx` com SIGILL, sabido).
**Decidido:** o Equilibrado é sempre o que o app já usava (testado), então quem não mexer em nada não percebe
diferença. As opções dos WebAssembly dizem sempre "vale ao reabrir" até alguém medir quem relê. O "Avançado" mostra o
que o catálogo marcou como avançado; **a lista completa do que o núcleo declara (`SET_VARIABLES`) fica pendente**:
precisaria abrir o núcleo só pra listar (o PS1/PS2 têm `Nucleo::opcoes_declaradas`, falta um comando no `kof-app`).
**Deu errado / aprendido:** o container não tinha `libasound2-dev` (instalei com apt pra compilar o `kof-app`).
**Onde parou:** pacote novo na `teste-binarios` a fazer (fim da etapa), depois T.1 (paridade).

## 2026-11-14 · M16.5 · otimização do PS2 pausada por decisão do Marcelo

**Pedido:** terminar o roadmap até o fim (M16.4, T.1, M14), um passo depois do outro, sem parar nos checkpoints; o que
depender do Marcelo vira ⏸ e entra na lista "Pra você testar" do `docs/SITUACAO.md`. T.2 fica pra ele decidir.
**Decidido:** a **otimização do PS2 (M16.5) está pausada por decisão do Marcelo.** As tentativas ficam na branch
`rascunho/ps2-liso` (ritmo pelo relógio como o PCSX2, medição de CPU fora do laço, MTVU ligado) e **não devem ser
juntadas**. Ninguém mexe em otimização de PS2 até ele reabrir o assunto.
**Onde parou:** começando pelo M16.4 (juntar `agente-b/opcoes-nucleo` e fazer a tela), depois T.1 e M14.

## 2026-11-10 · Conferência · o C entrou, o jogo pesado A continua não liso

**Pedido:** o Marcelo jogou o pacote com a tarefa C: o jogo pesado A **continua não liso** (no antigo roda
liso). Limites do Codex e do Claude acabando: retomar no sábado.
**Conferido:** a junção do C pelo Codex está certa (`filho.rs` manda todo quadro; `canal.rs` fila de até 6; fila por
vsync comum em `engine/fila-de-quadros.ts`); CI verde no Linux e no Windows (`1f91825`, run 104). B (`agente-b/opcoes-nucleo`)
ainda **não** junto.
**Conclusão:** o quadro perdido na origem era real (60% → 0 no teste) mas não era o que o olho do Marcelo vê, ou não
era o único. Sem o `.zip` do 🩺 não dá pra saber o culpado.
**Onde parou (sábado):** 1) o Marcelo manda o `.zip` do 🩺 do jogo pesado A (Ajuda → 🩺, jogar 5 min, Exportar) e diz **se no
antigo o PS2 abre numa janela própria ou dentro da página do app**; 2) se o culpado for núcleo/CPU: opções (B, M16.4);
se for ritmo/página: o **modo janela própria** como o antigo (D36), que é o caminho mais provável pra "liso igual ao
antigo"; 3) a memória do jogo pesado B com a saída do `journalctl` (comando no `CONTINUAR.md`).

## 2026-11-09 · M16 · ritmo do PS2/PS1 nativo (tarefa C)

**Pedido:** continuar de `docs/agentes/CONTINUAR.md`, integrar o que chegou na branch `claude/busy-ritchie-wrvk8h` e enviar, sem PR.
**Feito:** revisada e integrada `agente-c/ritmo-nativo` (merge `d7e57d3`). `filho.rs` publica cada quadro; `canal.rs` mantém fila limitada; `JogoNativo` e o wasm usam `FilaDeQuadros` por vsync.
**Medido / conferido:** teste `ritmo`: 284 quadros rodados, 0 sem envio. `pnpm check` passou; e2e passou com 44 testes (1 ignorado) usando dois workers. Formatação e clippy passaram. Na suíte Rust completa, todos os alvos passaram exceto `opengl`, que entregou 64 quadros de 120 sob este backend gráfico e falhou no limite do teste; os testes `pcsx`, `lrps2`, `processo` e `ritmo` passaram. Build Linux e `tools/testar-ps2.mjs`: DVD sintético de 4,3 GB abriu, núcleo ficou vivo e a memória da página ficou em 753 MB. Pacote Linux SHA-256 `da4cf8bb…`, publicado em `teste-binarios` (`65bdcf0`). Os artefatos Windows foram preservados da versão anterior e estão marcados como sem C.
**Onde parou:** ⏸ o Marcelo testa jogo pesado A com diagnóstico e envia o `.zip`; repete com jogo pesado B até o erro de memória. Depois integrar B e iniciar M16.4.

## 2026-11-08 · Passagem · onde parou pro próximo orquestrador (Codex local)

**Pedido:** o limite do Marcelo estava acabando; salvar exatamente onde parou pra continuar pelo Codex.
**Feito:** `docs/agentes/CONTINUAR.md` (o que ele quer hoje: jogo pesado A liso; o que foi descartado na falta de memória do
jogo pesado B: DVD na RAM, opções, envio de imagens, troca de resolução; a causa achada das engasgadas; os passos em ordem).
Tarefa C (ritmo do nativo) e B (opções) disparadas em sessões na nuvem (branches `agente-c/ritmo-nativo`,
`agente-b/opcoes-nucleo`). `tests/lrps2.rs` garante `need_fullpath` (`eb4980a`).
**Onde parou:** ver `docs/agentes/CONTINUAR.md`, "Próximos passos".

## 2026-11-08 · Orquestração · tarefa A junta (ritmo do WebAssembly) · B não chegou

**Pedido:** o Marcelo rodou os dois agentes (Sonnet, sessões na nuvem; o Codex pelo `tools/agentes.sh` não enviou
nada, causa ainda não vista: falta o log) e pediu pra conferir.
**Feito:** revisada e junta a branch do A (`claude/fervent-brahmagupta-zq12qz` → `cbe109e`): a causa era a falta de
fila entre a chegada dos quadros do Worker (em rajadas, pelo `setTimeout(4)` + ritmo pelo som) e o vsync; agora
`engine/jogo.ts` guarda os quadros e solta um por vsync, com 1 quadro de folga (máx. 3 na fila). `tools/medir-ritmo.mjs`
mede antigo × novo com a mesma ROM gerada.
**Medido / conferido (aqui):** 15 s, Game Boy, 60 Hz: novo 0 pulados e 17 repetidos/min (antes ~450 pulados), antigo
0 e 0; p50/p95/p99 16,67 nos dois. `pnpm check` e 44 e2e verdes. Custo: ~1 quadro (16 ms) a mais de atraso de imagem
(a folga da fila); o laço da fila roda antes do desenho no mesmo vsync (registrado primeiro). Num jogo de luta pode
pesar: medir a latência do botão até a tela antes de dar como fechado (fica pro M16.5).
**Não afeta o PS2** (nativo, outro caminho): a tarefa era só dos consoles em WebAssembly.
**Onde parou:** **B** (catálogo de opções) não chegou no GitHub: pedir ao Marcelo a branch ou rodar de novo. ⏸ o
Marcelo grava o jogo pesado A e o jogo pesado B com o pacote da `teste-binarios` (o pacote ainda não tem o A: sai no próximo).

## 2026-11-08 · M16.1–M16.3 · medidor quadro a quadro, F3 com gráfico e modo diagnóstico

**Pedido:** fazer o M16 na ordem, sem parar nos checkpoints até o M16.3 (lá o Marcelo grava o jogo
pesado A). No meio: "o PCSX2 está em WebAssembly?" (não: o PS2 é só nativo, `soNativo` em `engine/nucleos.ts`; o
"mesmo formato no Worker do wasm" é pros outros consoles); "que diabos é o kof-nativo, deixa o núcleo separado" (é o
suporte que roda o `.so`/`.dll` num processo filho; o núcleo segue arquivo à parte, vindo pelo manifesto, D32). Contou
que **o antigo roda bem mais liso** e que o **jogo pesado B deu problema de memória**. Pediu pra salvar a sessão
e estimar o que falta.
**Feito:**
- M16.1: `domain/desempenho.ts` (p50/p95/p99, fps suavizado como o PCSX2, engasgo > 1,5× o quadro ou falta de som, o
  culpado: núcleo, leitura da placa, envio, página, som ou ritmo); `kof-nativo/src/medidor.rs` (600 quadros sem alocar)
  e `cpu.rs` (CPU por linha: `/proc/self/task` no Linux, `GetThreadTimes` no Windows; **o Windows só foi conferido pelo
  CI**); aviso `desempenho` com `porQuadro` (6 números/quadro em µs) e `cpu`, opcionais nos dois lados do contrato +
  fixtures; o Worker do wasm manda o mesmo `porQuadro`; `app-core/desempenho.ts` (`MedidorDaSessao`) junta o tempo de
  desenho da página a cada quadro mandado.
- M16.2: F3 com p50/p99, pior quadro, engasgos/min com o culpado, CPU por linha e o gráfico dos últimos 600 quadros.
- M16.3: `domain/diagnostico.ts` (CSVs com ponto no decimal, resumo da sessão em memória fixa por histograma,
  `resumo.txt`); `app-core/diagnostico.ts` (`GravadorDiagnostico`: lotes a cada 5 s); Rust `kof-app/src/diag.rs`
  (`diag.maquina|abrir|anotar|listar|exportar`, só a pasta `<dados>/diagnostico`, nomes conferidos, limite de 20 MB por
  sessão, apaga as de 30 dias, tira a pasta do usuário dos logs); `kof-files::zip::montar` (zip com deflate, conferido
  pelo `zipfile` do Python); placa de vídeo do núcleo (`GL_RENDERER`) no aviso `pronto`; janela Ajuda → 🩺 Modo
  diagnóstico, selo 🩺 na barra, resumo num aviso ao fechar/trocar de jogo, F9 baixa o `.zip` junto quando ligado.
**Medido / conferido:** `pnpm check` (domain 77, app-core 33 testes), testes Rust novos (medidor, cpu, zip, diag) e o
`processo.rs` (o `porQuadro` chega com 1 registro por quadro), e2e `jogo.spec` (F3 com p99 e gráfico) e o novo
`diagnostico.spec` (liga, grava, resume, exporta). Primeiro número de verdade: no Game Boy (wasm), **p50 18,75 ms com
o certo 16,74**: o laço do Worker (setTimeout de 4 ms + ritmo pelo som) solta quadros desiguais. Suspeita pro "antigo
mais liso": olhar isso no M16.5 com o antigo lado a lado.
**Deu errado / aprendido:** um commit saiu com o Prettier reclamando (o `| tail` escondeu o código de saída: rodar o
`pnpm format:check` sem pipe). O `cargo test` todo para no `pcsx` (SIGILL do container, já sabido): usar
`--no-fail-fast` pra ver o resto.
**Orquestração (pedido no fim):** o Marcelo passa a usar este agente como orquestrador e dois outros (Codex etc.) com
tarefas fechadas: `docs/agentes/LEIA-ME.md` (regras: branch própria a partir desta, só os arquivos da tarefa, não
mexer em JORNAL/ROADMAP/README, relatório no fim do arquivo da tarefa), **A** `A-ritmo-wasm.md` (branch
`agente-a/ritmo-wasm`) e **B** `B-opcoes-nucleo.md` (branch `agente-b/opcoes-nucleo`); aviso no topo do AGENTS.md.
**Onde parou:** M16.1–M16.3 feitos e enviados; CI do M16.1/M16.2 verde no Linux e no Windows (o `cpu.rs` do Windows
compila e passa lá). Pacote novo na `teste-binarios` (`4058e25`), com o executável do pacote passando no
`tools/testar-ps2.mjs`. **⏸ M16.3:** o Marcelo grava o jogo pesado A e o jogo pesado B (o erro de memória: texto do aviso, o `.zip` e
quanto de RAM tem). **Próximo do orquestrador:** revisar as branches dos agentes A e B quando o Marcelo avisar; depois
M16.4 (a tela das opções em cima do catálogo do B) e M16.5 (prioridade: a memória do jogo pesado B; o ritmo do wasm é do A).

## 2026-11-08 · Planejamento · M16 (desempenho, diagnóstico, opções de emulação) · onde parou pra próxima sessão

**Pedido:** o Marcelo testou o PS2 (jogo pesado A "rodou relativamente bem, umas engasgadas aqui e ali") e
pediu, antes de corrigir, medição de verdade: modo diagnóstico que grava logs e estatísticas, e opções de emulação do
PS1 em diante. "Não basta rodar, tem que rodar bem." Etapa essencial, no meio da migração, antes do M14. Pediu pra
pesquisar quem já faz, desenhar a arquitetura e parar (contexto grande): a implementação fica pra próxima sessão.
**Feito:** só planejamento. `docs/DIAGNOSTICO.md` (pesquisa no PCSX2 `PerformanceMetrics.cpp` e no DuckStation
`performance_counters.cpp` + a arquitetura), M16.1–M16.5 no ROADMAP (antes do M14), D37.
**Decidido:** D37 (medir antes de otimizar; estatística pura no `domain`; gravação pelo Rust em `diag.*`).
**Onde parou:** **próximo é o M16.1** (medidor quadro a quadro), na ordem do `DIAGNOSTICO.md`:
1. `domain/desempenho.ts` primeiro (puro, com teste): percentis p50/p95/p99, fps suavizado, engasgo (> 1,5× o tempo de
   um quadro ou falta de som) e o culpado (a etapa que mais passou do normal dela).
2. `crates/kof-nativo/src/medidor.rs`: histórico de 600 quadros sem alocar; o `filho.rs` já mede núcleo, leitura
   (`gl::LEITURA_US`) e imagem por segundo: passar a guardar por quadro e mandar o bloco do segundo no aviso
   `desempenho` (campo novo, opcional, nos dois lados do contrato e nas fixtures de `packages/contracts/fixtures`).
3. CPU por linha (Linux `/proc/self/task/*/stat`, Windows `GetThreadTimes`), agrupada pelo nome da linha.
4. O mesmo formato no Worker do WebAssembly (`packages/engine`) e o tempo de desenho/chegada na página.
Depois M16.2 (F3 com gráfico), M16.3 (modo diagnóstico; ⏸ o Marcelo grava o jogo pesado A e manda), M16.4 (opções de
emulação), M16.5 (otimizar pelos relatórios). Pergunta em aberto pro Marcelo: os engasgos do jogo pesado A foram na primeira
vez que aparece um lugar/efeito (shader sendo montado) ou espalhados?
**Também esperando o Marcelo:** a chave do atualizador (SITUACAO, "Pra você fazer"), o teste da rede com o celular,
os pacotes do Linux/Windows, e o PS2 nos outros dois jogos (jogo pesado B, jogo pesado C) com print do F3.
**Ambiente da próxima sessão:** `pnpm install`, `KOF_NATIVOS=todas pnpm nucleos` (traz o LRPS2), e pros testes
nativos/PS2: `sudo apt-get install -y libasound2-dev genisoimage libegl1 libegl-mesa0 libgl1-mesa-dri`. O teste
`kof-nativo --test pcsx` morre com SIGILL em container (CPU), no CI passa. Pros testes de paridade da rede:
`git clone https://github.com/Marcelao98/kofstation-old` (só leitura) e `node tools/testar-rede.mjs <pasta>`.

---

## 2026-11-08 · Correção · a página que às vezes não abria (tiny_http)

**Pedido:** o CI quebrou de novo com a página sem carregar (agora no teste dos Aparelhos); o Marcelo pediu pra tentar de
novo.
**Causa:** bug do `tiny_http` 0.12.0 (`TaskPool::spawn`): uma linha acordada que ainda não pegou a tarefa segue contada
como "esperando"; com conexões chegando juntas, uma ia pra fila sem linha pra ela e ficava parada enquanto a outra
conexão keep-alive do Chrome vivesse. Era o "arquivo `.js` sem resposta" do JORNAL de 07/11 e do M13 (não era o disco).
**Feito:** cópia do crate em `third_party/tiny_http` com a correção de uma linha (só vai pra fila se tem mais linhas
esperando do que tarefas na fila), via `[patch.crates-io]`; `tools/testar-conexoes.mjs` (no CI); o teste do PS1 não
tenta mais de novo (a causa saiu). `pnpm nucleos` com 3 tentativas por download (o GitHub respondeu 504 no CI).
Teste do OpenGL só obrigatório onde há placa (o Windows do CI não tem).
**Medido / conferido:** 30 conexões keep-alive juntas × 5 rodadas: **5 de 150 sem resposta antes, 0 depois** (duas
vezes, e no executável do pacote). CI verde no Linux e no Windows com todos os testes de ponta a ponta.
**Onde parou:** o mesmo da entrada do PS2 (abaixo): ⏸ o Marcelo joga PS2 com o pacote novo da `teste-binarios`.

---

## 2026-11-08 · PS2 (N.9/M12) · LRPS2 com OpenGL sem janela, o sistema PS2 no app

**Pedido:** o Marcelo trocou a ordem: PS2 antes do M14 ("quero jogar PS2, eu uso mais PC"), "liso igual ao PCSX2", no
jeito mais eficiente, num núcleo separado como os outros. Aprovou o plano P.1–P.8 e mandou executar tudo.
**Feito:** P.1 `pcsx2_libretro` do `publicado/nativo/` do antigo no manifesto (o `.so` vem gzipado: o `pnpm nucleos`
descompacta e confere), `empacotar.sh` leva todos os nativos. P.2/P.3 `crates/kof-nativo/src/gl.rs`: OpenGL sem
janela (Linux EGL: tela do usuário ou surfaceless; Windows: janela escondida + WGL, só compilado aqui), framebuffer com
profundidade/estêncil, `SET_HW_RENDER`/`GET_PREFERRED_HW_RENDER`, `context_reset` depois do `load_game`,
`context_destroy` ao fechar, leitura assíncrona (3 PBOs + cerca). P.4 o LRPS2 abre no frontend novo (teste com BIOS
falsa: só a ROMDIR + um laço no vetor de reset, e DVD gerado). P.5 `NUCLEOS.ps2` (só nativo), cabeça do DVD (64 KB; o
sistema pelo SYSTEM.CNF lido aos pedaços), DVD arrastado vai pra Kof Games aos pedaços, BIOS do PS2 obrigatória (vai
pra `sistema/pcsx2/bios`), mensagens quando falta o núcleo ou o jogo está fora da Kof Games. P.6 o aviso de desempenho
traz o tempo do núcleo, da leitura da placa e do quadro pra página; o F3 mostra. P.8 pacote na `teste-binarios`.
**Decidido:** D36 (LRPS2 do antigo, OpenGL sem janela, imagem pela página; modo direto só se os números pedirem).
**Medido / conferido:** `tests/opengl.rs` (núcleo de teste que desenha com OpenGL core 3.3: imagem virada certa, 120 de
120 quadros entregues, no máximo 2 de atraso, 0,64 ms por quadro no Mesa sem placa); `tests/lrps2.rs` (o LRPS2 de
verdade: abre, pede a placa, 60 quadros, ~958 amostras de som por quadro); `tools/testar-ps2.mjs` (no CI): app de
verdade e o executável do pacote, DVD de 4,3 GB (esparso) pela biblioteca, processo vivo, página 339 → 339 MB,
`kofstation` 17 MB. `check`, `check:rust`, 43 e2e verdes.
**Deu errado / aprendido:** (1) com a BIOS falsa só de zeros o PCSX2 cai (o antigo anotava o mesmo no RetroArch): um
`j 0xBFC00000` no vetor de reset deixa ele parado e o resto do caminho testável. (2) PS2 agora "roda": a BIOS
obrigatória fazia a tela de BIOS abrir antes de avisar que falta o núcleo; o aviso do núcleo vem primeiro. (3) Imagem
de verdade só com BIOS de verdade (a falsa não liga o vídeo do PS2): **não vi um quadro de PS2 aqui**.
**Onde parou:** ⏸ Marcelo: BIOS + um jogo de verdade (jogo pesado A) no pacote novo, print do F3 numa cena
pesada, e se possível o mesmo jogo no PCSX2 sozinho pra comparar. Com os números: decidir o P.7 (modo direto) e
ajustar opções. Também pendente: cartão de memória do PS2 no backup `.kofsave` (hoje fica em
`<dados>/nativo/saves/ps2`, persistente), conferir no Windows (WGL nunca rodou), estados do PS2 com jogo de verdade.
Depois: M14 (celular), plano na entrada do M13.

---

## 2026-11-08 · Etapa M13 · rede entre aparelhos, celular como controle e Jogar no PC

**Pedido:** o mesmo lote ("segue até o M14"): M13 reaproveitando o `kofrede.c` e com o mesmo protocolo do APK atual.
**Feito:** M13.1 `crates/kof-net`: `kofrede.c` + Monocypher do antigo sem mudança (`third_party/kofrede`) por FFI
(`ffi.rs`), o `kofservico.c` em Rust (`servico.rs`: UDP achar, TCP parear/conectar, pareados em arquivo, ping 15 s,
religar PC×PC), a WebSocket da página (`pagina.rs`, token ou o modo do antigo) e o `kof-rede` (o serviço sozinho com as
opções do kofservico). M13.2: o `kofstation` abre a rede junto (`crates/kof-app/src/rede.rs`, `rede.ligar`), tela
📡 Aparelhos (`screens/Aparelhos`, QR com o mesmo gerador do antigo, código, lista, nome, procurar), cartão do Início
(`app-core/rede.ts`, `stores/rede.ts`, backend de teste com serviço de mentira). M13.3: `domain/celular.ts` (formatos do
antigo) e `stores/celular.ts`: celular pela rede (canal `pad`, `pad-ok` com jogador e console) e pelo servidor do APK
(Arquivo → 📱 Celular como controle, senha de 4 números, religa sozinho), os celulares entram nos Jogadores. M13.4:
`stores/transmissao.ts` (o `jogarpc.js`): pedir/oferta/resposta/fim pelo canal `jogo`, imagem crua em pixels inteiros,
H.264, 12 Mbps, som no celular (`Jogo.somPraTransmitir`, o PC fica mudo; no PS1 nativo vai sem som), canal de dados com
os 6 bytes, ping, menu do PC no celular, 💾⟲🏠, 📱 Levar pro celular / 📺 Voltar pra TV no menu rápido, a navegação
por controle aceita o celular, sair da janela não pausa enquanto transmite.
**Decidido:** D35 (FFI + serviço em Rust, mesma API JSON, WebSocket da página com token).
**Medido / conferido:** `tools/testar-rede.mjs` (CI): o `servicos.cjs` do antigo contra o novo; novo × `kofservico`
antigo nos dois papéis; o `celular.cjs` do antigo (o `Rede.java` do APK + `libkofrede.so`) contra o novo — tudo verde.
`tools/testar-aparelhos.mjs --antigo` (CI): app de verdade + Chromium, outro aparelho pareia digitando o código da
tela e aparece 🟢; o `ControleServidor.java` do APK conecta com a senha e o A acende na tela Jogadores. e2e novos:
`aparelhos.spec.ts`, `jogar-no-pc.spec.ts` (um "celular" WebRTC noutra página recebe a imagem vermelha, manda botão,
ping e menu). 43 e2e, `check`, `check:rust` (menos o SIGILL do pcsx neste container) verdes.
**Deu errado / aprendido:** (1) importar stores no topo do `main.tsx` cria elas antes da configuração carregar (o tema
voltava pro padrão ao recarregar): as da rede entram depois do `carregarConfig`. (2) O MSVC não tem os `__builtin_` que
o `kofrede.c` usa: o `build.rs` define pras funções do C no Windows (o arquivo continua igual). (3) **Aberto:** o
`testar-nativo` às vezes estoura o `page.goto` (1 em ~4 aqui): um arquivo da página (`react-*.js`) fica sem resposta do
servidor HTTP local logo depois dos 600 MB de CD gravados; sem a carga de disco não reproduz (0 em 12). O teste tenta de
novo uma vez; investigar o `tiny_http` (ver se um pedido fica preso atrás de outro na mesma conexão).
**Onde parou:** ⏸ Marcelo: testar a rede com o celular (abaixo e no SITUACAO), a chave do atualizador e os pacotes.
**Próximo: M14** (não começado), plano: M14.1 adaptador `android` (`platform/android.ts`) implementando o `Backend`
sobre a ponte `KOFnesApk` da casca Java atual (CASCA 14; a página nova vai nos assets e no `publicado/android` da
casca, sem mexer no `kofstation-old`: o APK novo é montado aqui com a casca copiada, como os núcleos); as lojas e a
config no celular ficam no IndexedDB/OPFS (sem Rust lá) com a mesma interface; a rede pela `KOFnesApk.redeCmd` +
`window.__rede` (o mesmo `CanalRede`). M14.2: controle de toque (6 modelos do `android.css`/`android.js`) e layout do
celular. M14.3: pasta de ROMs (`Pasta.java`). M14.4: PS1/N64 nativos pela ponte (`Ps1Jogo`/`N64Jogo`). M14.5:
atualizador do APK (`Atualizador.java` lendo um manifesto nosso). Tudo precisa do Marcelo no celular de verdade.

---

## 2026-11-07 · Etapa M15 · atualizador assinado, pacotes do Linux e do Windows, lado a lado com o antigo

**Pedido:** "segue até o M14", sem parar em cada checkpoint; parar só no que só o Marcelo faz (chave, celular, Windows).
**Feito:** M15.1: o `kofstation` aplica a versão baixada no começo do `main` (executável trocado → abre o novo e sai),
`app.atualizacao {procurar}` (procura numa linha separada; a página pergunta até terminar), versão do `versao.txt` no
`app.info` (antes era sempre 0.1.0, então o "✨ atualizado!" nunca aparecia), `nao-atualizar` e `fonte.txt` como no
antigo (`crates/kof-app/src/atualizacao.rs`); página: menu "🔄 Procurar atualização" e procura sozinha 10 s depois de
abrir (`stores/atualizacao.ts`, `app-core/atualizacao.ts`); `tools/manifesto.mjs` (gera a chave; monta e assina; arquivo
igual ao da versão anterior aponta pra Release antiga); workflow `versao.yml` (Linux + Windows, empacota, assina,
Release `v<data>` como "latest"; sem o secret só compila). M15.2: `kofstation --instalar/--desinstalar`
(`kofstation-novo.desktop`, `src/instalar.rs`), ícone da xícara do antigo (`tools/icone.py`), `tools/pacote-linux.sh`
(`.tar.gz` com LEIA-ME). M15.3: `tools/pacote-windows.sh` + `tools/pacote/instalador.nsi` (NSIS sem administrador em
`%LOCALAPPDATA%\Programs\KOFstation`, atalhos "KOFstation novo", desinstalador que não toca em saves) e o `.zip`.
M15.4: nomes e pastas separados do antigo ("KOFstation novo"; dados em `KOFstation/`, o antigo em `KOFnes/`).
**Decidido:** D34 (atualizador próprio, Ed25519 com o `ring`, troca na próxima abertura, publicação a cada envio na
`main`).
**Medido / conferido:** `crates/kof-atualiza/tests/ciclo.rs` (5 testes: troca, núcleo velho apagado, assinatura de outra
chave, manifesto mexido, arquivo alterado, caminho `../`); `tools/testar-atualizacao.mjs` (no CI): o `kofstation` de
verdade com chave de teste, versão 2 servida por HTTP local com os 13 núcleos reais (28 MB): baixa, troca o
executável na abertura seguinte, apaga o núcleo que saiu, `app.info` diz "2", depois "em dia"; arquivo alterado e
assinatura falsa recusados sem deixar nada pela metade. Pacotes: `.tar.gz` 13,9 MB, instalador 11,6 MB, `.zip` 15 MB;
o `.tar.gz` baixado da `teste-binarios` extrai, `--instalar` grava o `.desktop` certo e o app serve os núcleos.
`check`, `check:rust` e 40 e2e verdes.
**Deu errado / aprendido:** neste container o teste `kof-nativo --test pcsx` morre com SIGILL (CPU do container; não
mexi no kof-nativo, no CI do GitHub ele passa). O instalador do Windows só foi montado (makensis no Linux), não rodado.
**Onde parou:** ⏸ Marcelo: (1) **criar a chave** (comando no SITUACAO, "Pra você fazer"); (2) instalar o pacote do
Linux; (3) Windows quando der. Seguindo pro M13 (rede).

---

## 2026-11-07 · M15.1 começado · onde parou pra próxima sessão

**Pedido:** o Marcelo autorizou seguir os próximos (M15 em diante) e pediu pra deixar tudo salvo: a sessão ficou grande e
ele vai abrir outra.
**Feito:** só o começo do M15.1: o crate `crates/kof-atualiza` (compila, clippy limpo, 2 testes de unidade; **ainda não
ligado ao `kofstation`**): manifesto por plataforma (`caminho → {tamanho, sha256, url}`), assinatura Ed25519 conferida com
o `ring` (já vinha pelo TLS), `procurar` (baixa manifesto + `.sig`, compara a pasta pelo SHA-256, baixa só o que mudou
pra `.atualizacao/`, cada arquivo conferido, `pronto.json`), `aplicar` (na abertura: troca os arquivos, o executável
rodando vira `.velho`, apaga os núcleos que saíram da lista, grava o `versao.txt`), `atualizacao.log` como o antigo.
**Falta no M15.1 (plano):** (1) teste de integração com chave gerada no teste (assinatura falsa e arquivo alterado
recusados; troca e núcleo velho apagado); (2) `kof-app`: `aplicar` no começo do `main` (antes do servidor; se trocou o
executável, abre o novo e sai), comando `app.atualizacao {procurar}` no `api.rs` com o `ureq` das capas, a versão do
`versao.txt` no `app.info`; (3) página: o menu "🔄 Procurar atualização" (hoje `ETAPA.atualizacao = 'M15'` em
`app/acoes.ts`) e a procura sozinha uns 15 s depois de abrir, com os avisos ("baixando…", "pronta: vale na próxima vez",
"já está na última"); (4) `tools/manifesto.mjs` (monta o manifesto das pastas do `tools/empacotar.sh`; núcleos com hash
no nome sobem uma vez só, compartilhados) + workflow `versao.yml` (compila Linux e Windows, empacota, assina com o
secret, Release "latest" com os arquivos soltos); (5) **chave**: a pública num arquivo do repositório
(`crates/kof-app/chave-atualizacao.txt`, hex de 32 bytes); a privada é um secret do GitHub que **o Marcelo cria**
(`openssl genpkey -algorithm ed25519`); sem chave, o atualizador fica desligado e anota no log.
**Onde parou:** ⏸ Marcelo testa Neo Geo e N64 (no Wi-Fi). Próxima sessão: terminar o M15.1 pelos itens acima, depois
M15.2–M15.4 (ordem combinada em 03/11, no ROADMAP).

---

## 2026-11-07 · Aprovações · M9, M10, M11 e a jukebox do SNES

**Pedido:** o Marcelo testou o pacote: "falta testar N64 e Neo Geo, o resto passou". Pediu os próximos passos.
**Feito:** ROADMAP: M9.1–M9.5, M10.1–M10.5, M11.1, M11.2, M11.4, M11.6 e N.5 ✅. SITUACAO: 68 ✅, 3 ⏸, 20 ⬜.
**Onde parou:** ⏸ Neo Geo (M11.3) e N64 (M11.5, N.6): ele testa no Wi-Fi. PS1 no Windows quando ele tiver um.
Próximo: **M15.1** (atualizador com manifesto assinado), na ordem combinada em 03/11.

---

## 2026-11-07 · Correção · PS1 sem memória de novo: o jogo zipado (e o estado que voltava preto)

**Pedido:** o Marcelo pediu pra fazer o PS1 rodar no Linux dele, com os jogos dele, sem estourar a memória, sozinho
até resolver (suspeitos em ordem: reserva no wasm, lightrec sem o endereço 0, processo caindo, formato não coberto,
pacote velho).
**Erro de verdade:** o único PS1 dele é um **`.zip`** (CD de 740 MB dentro: `.cue` + `.bin`). O `cabecaDoCd` só
cobria `cue|bin|img|iso|chd|pbp`: o zip era lido inteiro pela página e o jogo ia pro **WebAssembly** (nem tentava o
nativo; o log não tinha nenhuma linha "nativo"). Reproduzido no pacote `689755e` como usuário comum: página com pico de
**3,6 GB** (1,2 GB presos depois), `kofstation` **971 MB** (servindo o zip), 47 fps com 26 engasgos/s.
**Feito:**
- Rust (`kof-files/src/zip.rs`): entradas do zip com método e posição; `ler_entrada` (o começo de uma entrada,
  descompactado: guardado ou deflate, com o `flate2` que já vinha pelo `ureq`); `extrair_cd` (o CD sai em
  `<dados>/nativo/cache/<sistema>/<nome>-<tamanho>-<data>/`, CRC conferido, um CD por vez no cache, reaproveita se o zip
  é o mesmo). Erro novo `BAD_ZIP`. Comandos `file.stat`, `file.zip.list`, `file.zip.read` (API_CONTRACTS). O
  `nativo.abrir` extrai quando o caminho é `.zip`.
- Página (`app-core/jogos.ts`): `cabecaDoZip` monta o mesmo `JogoAberto` que o zip lido inteiro (mesmo nome, mesma rom
  = o `.cue`/a cabeça/o `.cue` montado das faixas: **mesma identidade e chave do save**), lendo só o `.cue` ou 64 KB.
  `pesoCd` = o tamanho do CD no disco (do zip, da imagem, ou do `.cue` + os `.bin` pelo `file.stat`).
- Reserva (`stores/jogo.ts`): CD acima de **100 MB** não cai mais pro WebAssembly; mostra o erro do nativo e o log do
  processo vai pro log do app. A reserva dos CDs pequenos agora lê o jogo inteiro antes (antes ia só a cabeça de 64 KB
  pro wasm).
- **Segundo bug, achado no caminho:** carregar estado num jogo de verdade deixava a **tela preta e o jogo recomeçava**.
  O `reset` antes do `unserialize` (posto no N.2 contra o SIGILL do lightrec) faz a BIOS HLE deixar o boot do CD pro
  próximo quadro, e esse boot passava por cima do estado. Agora: `reset` → **um quadro** (o boot acontece; som e imagem
  dele descartados) → `unserialize` (`kof-nativo/src/nucleo.rs`).
- `JogoNativo` (engine): a WebSocket que cai com o processo vivo reconecta sozinha (3 tentativas); depois de um "fim" do
  processo não reconecta. Uma vez a conexão caiu sozinha nos primeiros 10 s (o servidor viu EOF do navegador); não
  reproduziu em mais 8 rodadas.
- Teste `crates/kof-nativo/tests/jogo_de_verdade.rs` (ignorado; `KOF_JOGO=<cue>`): roda, salva, anda, carrega 3 vezes e
  confere que a imagem volta e o jogo anda. Não cita jogo nenhum.
**Suspeitos descartados:** (2) o lightrec não consegue o 0x0 como usuário (`vm.mmap_min_addr = 65536`), cai pro mapa
em 0x10000000 ("Memory map is sub-par") e funciona: 1500 quadros do FF9 em 0,7 s, muito acima do tempo real. Não
precisou recompilar o PCSX (sem Release nova). Sem o reset, o `pcsx.rs` também passa como usuário (o SIGILL foi visto
como root, no mapa em 0x0: por isso o reset ficou, com o quadro depois). (3) o processo não caiu. (5) o pacote
instalado era o `81f859e`.
**Medido / conferido (FF9 do Marcelo, só na máquina dele, BIOS HLE porque ele não tem a do PS1):** pela Biblioteca:
abre em 0,2 s, **página com pico de 190–320 MB, `kofstation` com 14–21 MB, processo do jogo com 44 MB** (não crescem com o
CD), 60 fps, 0 engasgos, 0 falta de som, controle responde, estado F5/F8 volta na mesma tela. Arrastado de fora: guardado
inteiro na Kof Games (cópia byte a byte) e abre no nativo, página 191 MB, `kofstation` 28 MB. A extração do zip leva
alguns segundos só na primeira vez. Cartão: o jogo lê o cartão ("No FF9 save data") e o app guarda e devolve ele entre
duas aberturas. `pnpm check`, `pnpm check:rust`, testes novos (zip no Rust e no TS, reconexão), `testar-nativo.mjs` no
pacote (sem `genisoimage`: só o PS-X EXE) e `pnpm e2e` 39/39 verdes (cada um precisou de uma segunda rodada uma vez: o
`page.goto` de 60 s do `testar-nativo` e o `visual.spec` do F4, que não mudou; os dois passaram na segunda).
**Deu errado / aprendido:** o teste do JORNAL anterior gerava `.cue`/`.iso` soltos; o jogo de verdade era zip. Testar
com o formato que a pessoa tem. A máquina dele não tinha Rust nem pnpm: instalados no usuário (rustup, pnpm pelo npx) e
o `alsa-lib-devel` extraído do RPM em `~/.local/kof-alsa` (`PKG_CONFIG_PATH`), sem sudo.
**Teste do Marcelo (07/11, pacote `a88d370` na Kof Games dele):** FF9 "rodou liso liso liso, 60 fps, sem stuttering".
Ele também testou **salvar no cartão dentro do jogo**: funciona. ✅ PS1 nativo aprovado no Linux.
**Onde parou:** falta o **Windows**: o Marcelo não tem Windows; ele vê depois como conferir (não mexer sem ele pedir).
Um `.chd` quando ele tiver. Depois: M15.1.

---

## 2026-11-07 · Correção · PS1 sem memória e a pasta de núcleos igual ao antigo

**Pedido:** o Marcelo testou: o PS1 estoura a memória. Pediu pra achar a causa, corrigir e documentar, e deixar os
núcleos numa pasta ao lado do executável como no antigo (`nativo/`, `nucleos/`, `versao.txt`).
**Causa:** a página lia o CD inteiro antes de abrir o jogo. Reproduzido no pacote anterior com um CD gerado de 300 MB:
arrastado de fora, a página foi a **1,2 GB** (com 700 MB, a aba morre) e o CD nem era guardado na Kof Games (limite de
256 MB por pedido); imagem única (`.iso`/`.chd`/`.bin`) pela biblioteca também era lida inteira. (Eu tinha testado só
com um programa de PS1 de poucos KB.)
**Feito:** `cabecaDoCd` (app-core): com o nativo, só o `.cue` ou 64 KB da imagem passam pela página; o tamanho de
verdade fica em `JogoAberto.tamanho` (a identidade e a chave do save não mudam). CD arrastado: vai pra Kof Games aos
pedaços de 16 MB direto do disco (`library.import.parte` no Rust, `enviarArquivo` com `Blob` no `fetch`) e abre no
nativo. WebAssembly (reserva): o CD vai pro Worker transferido, sem cópia. **D33:** núcleos fora do executável
(38 → 8 MB): `KOFstation/{kofstation, nucleos/ (hash no nome + lista.json), nativo/, versao.txt}`,
`crates/kof-app/src/pastas.rs`, `tools/empacotar.sh`; rodando do código, usa as pastas do repositório.
**Medido / conferido:** `tools/testar-nativo.mjs` (também no CI, com `genisoimage`): CD de 300 MB de verdade (ISO com
SYSTEM.CNF e o programa que desenha) pela biblioteca (`.cue` e `.iso`) e arrastado: imagem certa no nativo, 60 fps,
página ~300 MB (igual a antes de abrir), `kofstation` < 60 MB, CD guardado inteiro na Kof Games. `check`, `check:rust`,
39 e2e verdes. O pacote baixado da `teste-binarios` abre e serve os núcleos da pasta.
**Deu errado / aprendido:** testar sempre com arquivo do tamanho de verdade. Ler os pedaços como `ArrayBuffer` ainda
subia a página (~730 MB: o coletor de lixo demora); mandando o `Blob` direto no `fetch` não sobe. Uma vez o `page.goto`
do teste estourou 60 s (já tinha acontecido no CI): não reproduziu depois; ficar de olho. O executável novo é maior que
o lançador do antigo (que só abria o navegador): o perfil de compilação enxuto (~6 MB) ficou pra depois, a pedido.
**Onde parou:** ⏸ o Marcelo testa a `teste-binarios` nova (`fc73f93`: `KOFstation-linux.tar.gz` /
`KOFstation-windows.zip`): **PS1 de verdade** (pela biblioteca e arrastado), depois N64, jukebox do SNES e Neo Geo.
Depois: M15.1 (o atualizador já tem a pasta pronta).

---

## 2026-11-03 · Planejamento · ordem nova (PS2 pro fim)

**Pedido:** o Marcelo achou o PS2 caro em token e pediu pra fazer antes o que sai mais rápido, e deixar documentado.
**Feito:** só o plano: ROADMAP → "Ordem combinada em 03/11" (custo de cada etapa e por quê).
**Decidido:** ordem 1) teste dele + correções, 2) M15 distribuição, 3) M13 rede/celular como controle, 4) M14 celular,
5) N.9/M12 PS2 (+ N64 nativo), 6) Troca.
**Onde parou:** ⏸ o Marcelo testa a `teste-binarios` (PS1 nativo, jukebox do SNES, N64) e abre o PR da
`claude/busy-ritchie-wrvk8h`. Depois: **M15.1** (manifesto assinado e atualizador).

---

## 2026-11-02 · Etapas M11b N.2–N.8 · PS1 nativo, jukebox do SNES igual, N64 desenhando

**Pedido:** "segue até terminar" (depois do N.1).
**Feito:** N.2 `tools/nucleos-nativos.sh` (PCSX-ReARMed c8816799 com lightrec, Linux + Windows por mingw-w64) e o
workflow "Núcleos compilados" → Release `nucleos-2` (manifesto, seção `nativos`; o `pnpm nucleos` baixa a plataforma
atual). N.3 o `kofstation` embute o núcleo nativo da plataforma (`crates/kof-app/src/nativo.rs`, comandos `nativo.*`) e o
PS1 abre nele por padrão (jogo da Kof Games; o CD é lido pelo processo); `JogoNativo` na engine com a mesma cara do
`Jogo`; Opções de emulação → "Núcleo do PlayStation"; se falhar, cai no wasm. N.4 `tools/remendos/snes9x-sonda.patch` +
`tools/nucleos-wasm.sh` (o `construir.sh`/`ponte.cpp` do antigo num commit fixo); o Snes9x do app passa a ser o com
sonda. N.5 jukebox do SNES com Ondas/Notas, capa oficial pelo nome, o 8 bits do antigo portado (`oitobits.ts`) como
reserva da trilha. N.6 ROM de N64 que boota (programa no lugar do IPL3 → RDP → VI). N.7 PS1 wasm conferido pela imagem.
N.8 cartão BIOS do Início, ícone do app (xícara do `icone.py`, em SVG) na abertura e na janela, lista de BIOS no passo 2.
Executáveis novos na `teste-binarios` (`85befef`; Linux SHA-256 `a9633142…`, Windows `b86ff328…`).
**Decidido:** núcleos que a gente compila: Release `nucleos-<VERSAO>` (sobe a VERSAO quando muda núcleo; recompilar dá
outros bytes). PCSX nativo: `reset` antes de carregar estado (o lightrec dá SIGILL sem isso, também no upstream novo).
**Medido / conferido:** `tests/pcsx.rs`: PS-X EXE gerado desenha (vermelho + retângulo verde), pixels conferidos; estado
3x com o recompilador. `tools/testar-nativo.mjs` (também no CI): app de verdade + Chromium + PCSX nativo, pixels da
tela do app, 60 fps. Snes9x com sonda: o mesmo `.spc` toca **byte a byte igual** ao Snes9x publicado do antigo.
8 bits (Rua e Air) e `.wav` da trilha **byte a byte iguais** ao antigo (testes com `KOF_ANTIGO`). N64 em wasm desenha a
ROM nova (e2e, pixels). `check`, `check:rust`, e2e verdes; CI do N.1 verde também no Windows.
**Deu errado / aprendido:** o N64 "quebrado" era a ROM de teste (zeros no lugar do IPL3), não o núcleo. O PCSX com
lightrec entrega RGB565 (verde 31 → 251, a mesma conta do wasm). No CI, `page.goto` esperando "load" estourou uma vez:
o teste do nativo espera o DOM e a tela do Início.
**Onde parou:** ⏸ o Marcelo testa a `teste-binarios`: **PS1 de verdade** (Linux e Windows; liso?), N64 de verdade,
jukebox do SNES (F7 num jogo, Ondas/Notas), Neo Geo. Falta o **N.9 (PS2 nativo)**: precisa ensinar o `kof-nativo` a dar
um OpenGL sem janela pro núcleo (`SET_HW_RENDER`) e ler a imagem de volta; o mesmo caminho serve pro N64 nativo. É do
tamanho do M12: fazer numa sessão própria.

---

## 2026-11-02 · Etapa M11b N.1 · núcleo nativo num processo filho

**Pedido:** começar o M11b pelo N.1 ("pode fazer tudo").
**Feito:** crate `crates/kof-nativo`: frontend libretro em Rust (`nucleo.rs`, `libloading`; conversão de pixels igual ao
`ponte.cpp` do antigo; padrão das opções do `SET_VARIABLES` guardado como no RetroArch; log do núcleo formatado por uma
ponte em C, `ponte.c`, porque o printf do libretro é variádico), som pela placa (`som.rs`, cpal + reamostrador linear;
sem placa, um relógio), WebSocket local com token e origem (`canal.rs`, tungstenite; só o quadro mais novo vai),
protocolo (`protocolo.rs`), processo filho (`filho.rs`) e supervisor (`supervisor.rs`: token sorteado, config pelo stdin,
log guardado, fecha junto). `kofstation --nativo` roda o filho (um executável só). Erro novo `CORE_FAILED` no `kof-core`.
Lado da página: `packages/contracts/src/nativo.ts` (ler quadro/avisos, montar botões e blocos). CI e `rodar.sh` instalam
/ conferem os cabeçalhos do ALSA; INSTALAR.md atualizado.
**Decidido:** D32 (processo filho, som pela placa, imagem pela página). Protocolo em API_CONTRACTS §5.
**Medido / conferido:** `cargo test -p kof-nativo` compila `tests/nucleo/minimo.c` e confere: quadro RGBA com a cor da
opção e o 1º byte do jogo; som amostra por amostra; ~60 quadros/s e 735 amostras por quadro no relógio; botões; estado
ida e volta; bateria; pausa (o quadro não anda); sem token, token errado e origem errada = 403; comando inválido vira
erro; página nova derruba a antiga; núcleo que dá `abort()` derruba só o filho e o log fica; núcleo inexistente =
`CORE_FAILED`. Fixtures `packages/contracts/fixtures/nativo.json` testadas no TS e no Rust. `pnpm check` e
`pnpm check:rust` verdes. Sem placa de som no container: o caminho do cpal só foi conferido até "sem placa → relógio".
**Deu errado / aprendido:** o "pronto" da página nova ia pra conexão antiga (fila compartilhada): agora a geração é
conferida com a fila presa. cpal 0.18 mudou a API (config por valor, `cpal::Error`).
**Onde parou:** N.1 ✅. Próximo: **N.2** (compilar o PCSX-ReARMed nativo com dynarec no commit do antigo:
`nucleo-libretro/construir.sh` do `kofstation-old` diz qual; Release + manifesto; PS-X EXE gerado no teste) e **N.3**
(o app usa: comandos `nativo.*` na API, a página conecta pelo `nativo.ts` e desenha com os filtros).

---

## 2026-11-02 · Pós-entrega do M9–M11 · plano do PS nativo e do que ficou incompleto

**Pedido:** o Marcelo não aceita o pacote M9–M11 assim: a jukebox tem que ser "igualzinha à outra" (no SNES faltam Ondas
e Notas) e o N64 tem que rodar. Prioridade nova: PS rodando liso, com núcleo nativo como padrão (o wasm fica como
reserva, sem apagar). Aprovou fazer tudo e pediu pra salvar e continuar em outra sessão.
**Feito:** só o plano (ROADMAP → **M11b**, passos N.1 a N.9). Nenhum código.
**Decidido:** núcleos que a gente compila vão como anexo de Release no repositório KOFStation, baixados pelo manifesto
(SHA-256), no mesmo commit do núcleo que o antigo usa. O nativo roda num processo filho do `kof-app` (frontend libretro
em Rust), com o som nativo ditando o ritmo e a imagem indo pra página desenhar com os filtros (vira decisão D32 no N.1).
**Medido / conferido:** hoje o PS1 é o PCSX-ReARMed em WebAssembly, num Worker, sem dynarec: por isso pesa.
**Onde parou:** começar o **N.1** (crate `kof-nativo`), depois N.2 e N.3 (PS1 nativo, checkpoint: o Marcelo joga PS1
liso). Pacote só quando a jukebox do SNES estiver igual ao antigo e o N64 tiver rodado com imagem conferida, ou antes se
ele pedir o PS1 nativo pra testar. M9–M11 continuam ⏸.

---

## 2026-11-02 · Etapas M9–M11 · jukebox, extras e sistemas com BIOS (em lote)

**Pedido:** "vai até o M11", de uma vez. Perguntou se o M11 não sairia mais barato, já que os núcleos estão prontos.
**Feito:** M9 (`27769ab`): tocador da jukebox num Worker à parte (instância separada do núcleo, sonda de ondas, mudo/solo,
fade, `.wav`), F7, tela com Capa/Ondas/Notas (YIN, sincronia), mini-player, trilha FM no núcleo só de som, Air em
violino, música do Início e abertura da 1ª vez. M10 (`a1fd59c`): estatísticas (tempo jogando de verdade, sessões, 7 dias,
por jogo), espaço usado, patches IPS/BPS/UPS com o 🇧🇷, caçador de bugs (marco a cada 600 quadros no Worker, F9, pacote
`kofbug`, `pnpm bug <pacote> <rom>`), aviso de "atualizado" e de som desligado. M11 (`d6641a9`, `2cce114`): tela de BIOS
e o "falta a BIOS" do Neo Geo, BIOS no `/sistema`, Neo Geo no FBNeo (zip + pai, AES/MVS), PS1 no PCSX (.cue + .bin, .chd,
.pbp, .iso, .exe, zip com CD), N64 no Mupen64Plus (WebGL2 num OffscreenCanvas dentro do Worker), menu do núcleo do SNES.
**Decidido:** D28 (BIOS na loja `bios`), D29 (música do SNES pelo Snes9x: .spc entra num estado dele), D30 (N64 no
Worker com OffscreenCanvas), D31 (núcleo só de som e trilha pelo manifesto, de um commit fixo do antigo).
**Medido / conferido:** `check`, `check:rust` e 38 testes de fluxo verdes (novos: jukebox, abertura, extras, bios).
O `.spc` gerado no teste toca no Snes9x (a voz religada soa; sem ela, silêncio; mudo pela opção zera). PS1 roda um PS-X
EXE gerado a 60 fps, também no executável de verdade (servidor Rust), junto com a trilha na jukebox. Executáveis: Linux
34,8 MB, Windows 37,4 MB (entraram fbneo, pcsx, mupen64, somfm, violino e trilha).
**Deu errado / aprendido:** `l.i += l.num()` no BPS lia o `l.i` antes do `num()` avançar (o antigo usava duas linhas). A
tela de BIOS apagava o "falta a BIOS do Neo Geo" ao abrir (pego no teste). O N64 com a ROM gerada quebra ("couldn't
allocate memory for cached interpreter"): rodei o mesmo núcleo do jeito do antigo, na página, e quebra igual, então é a
ROM (não é jogo de verdade), não o Worker. O teste do N64 confere só o que dá sem jogo. De passagem: a loja `roms` faltava
na lista do Rust (o jogo aberto sem Kof Games não guardava a cópia).
**Tokens:** o M11 saiu bem mais barato que a estimativa (os núcleos já eram do antigo: só ligação e testes).
**Onde parou:** ⏸ o Marcelo testa o pacote M9–M11 (`teste-binarios`). Mais importante: jogo de verdade de Neo Geo
(com o neogeo.zip), PS1 (.cue com os .bin na mesma pasta) e N64; F7 num jogo de SNES e num de Mega Drive; .spc de
fora na jukebox; Estatísticas depois de jogar; F9. Bug que ele trouxer: "Correção: …", trocar a `teste-binarios`,
juntar na `main`. Depois que ele aprovar: M9–M11 ✅ e seguir pro M12 (PS2 nativo).

---

## 2026-11-02 · Etapas M3–M8 · pacote aprovado

**Pedido:** o Marcelo conferiu os saves do novo (save de cartucho, F5/F6/F8, Continuar de onde parou): "deu certo".
Pediu a lista das próximas etapas com a estimativa de tokens de cada uma.
**Feito:** M3–M8 marcados ✅ no ROADMAP e no README. Nenhuma mudança de código.
**Decidido:** nada novo.
**Medido / conferido:** teste do Marcelo no pacote da `teste-binarios` (Linux).
**Deu errado / aprendido:** —
**Onde parou:** próximo é o M9 (Jukebox). Estimativa passada ao Marcelo (tokens escritos, por etapa): M9 250–400 mil,
M10 150–250 mil, M11 350–600 mil, M12 200–350 mil, M13 250–400 mil, M15 120–200 mil, M14 300–500 mil, Troca 40–80 mil.
⏸ esperando ele dizer até onde seguir (um passo, a etapa inteira ou um lote).

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
