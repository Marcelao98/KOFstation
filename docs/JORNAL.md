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
