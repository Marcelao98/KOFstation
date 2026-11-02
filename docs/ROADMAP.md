# Roadmap passo a passo (com checkpoint em cada passo)

> Estado: ⬜ não começou · 🟨 em andamento · ⏸ esperando o Marcelo · ✅ aprovado.
> Cada passo termina num **checkpoint**: eu paro, mostro e espero você dizer "segue" (ou pedir mudança). Se quiser
> andar mais rápido, pode aprovar vários de uma vez ("segue até o M1.3").
> Onde está cada coisa no app antigo: [auditoria/PLANO_DETALHADO.md §4](auditoria/PLANO_DETALHADO.md) e
> [auditoria/FEATURE_INVENTORY.md](auditoria/FEATURE_INVENTORY.md). Como o front é feito: [FRONTEND.md](FRONTEND.md).

## Como é cada checkpoint

1. **Resumo curto** do que foi feito e do que ficou de fora.
2. **Pra ver:** print ou vídeo antigo × novo (quando tem tela), números (quando é desempenho), ou o resultado dos testes.
3. **Pra fazer (opcional):** o comando pra você rodar no teu Linux e o que conferir.
4. **Link do commit** no GitHub.
5. Linha atualizada aqui e no `CLAUDE.md` ("onde parou").

## Como cada passo é feito

Ler só o trecho do antigo daquele passo → marcar os itens no [PARIDADE.md](PARIDADE.md) → implementar na camada certa
com teste junto → comparar com o antigo → registrar decisão/contrato novo → commit e push → checkpoint.

---

## F2 — Arquitetura ✅ (aprovada pelo Marcelo em 31/10/2026)

> **31/10:** F3 → M1 feitos de uma vez (o Marcelo pediu "segue até o M1"); o Marcelo testou o app (pacote M1) e aprovou: "ficou excelente" (31/10).
> F4b.4/F4b.5: a bancada rodou no container; falta ele rodar no Linux dele e aprovar a D2 (opção B, ver SPIKE_D2.md).

## F3 — Ambiente

| Passo | O que faço | Checkpoint (o que você vê / faz) | Estado |
|---|---|---|---|
| F3.1 | Monorepo: `package.json`, `pnpm-workspace.yaml`, `tsconfig` estrito, Cargo workspace, `rust-toolchain.toml`, `.gitignore`, `.editorconfig` | árvore de pastas e `pnpm install` + `cargo build` passando | ✅ |
| F3.2 | Qualidade: ESLint (com a regra de camadas), Prettier, rustfmt, clippy, um comando `pnpm check` que roda tudo | eu mostro um import proibido (tela → engine) sendo barrado | ✅ |
| F3.3 | CI no GitHub (Linux e Windows) rodando `pnpm check` e `cargo test` a cada envio | link do CI verde | ✅ |
| F3.4 | `docs/INSTALAR.md`: Fedora, Ubuntu e Windows | **você instala no teu Linux** e roda `pnpm check` | ✅ |

## F4a — Esqueleto

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| F4a.1 | `packages/domain`, `app-core`, `engine`, `contracts` com uma função e um teste cada | `pnpm test` verde | ✅ |
| F4a.2 | App React mínimo com o backend `teste` (sem Rust), tema Café do antigo | print + você abre com `pnpm dev` | ✅ |
| F4a.3 | Crate `kof-core`: `app.info`, erros tipados, log em arquivo (`tracing`), `cargo test` | saída dos testes + o arquivo de log | ✅ |
| F4a.4 | Contrato `app.info` e de erro com o mesmo exemplo JSON testado no TS e no Rust | eu mudo um campo de um lado e o teste falha | ✅ |

## F4b — Teste da casca no Linux (decide Tauri ou não)

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| F4b.1 | Protótipo A (Tauri): janela abre o app, `app.info` vai e volta, erro de comunicação tratado | print/vídeo no Linux; você roda | ✅ |
| F4b.2 | Protótipo B (Rust local + Chromium em modo app, com token) com o mesmo fluxo | idem | ✅ |
| F4b.3 | Nos dois: Snes9x wasm (o mesmo do antigo) num Worker + AudioWorklet + WebGL, ROM gerada | tabela de fps, engasgos e falta de som | ✅ |
| F4b.4 | Nos dois: núcleos pesados (PS1, N64, Neo Geo), Gamepad, WebRTC, SharedArrayBuffer, instalação no Fedora e no Ubuntu | relatório `docs/SPIKE_D2.md`; **você roda os dois no teu Linux com o teu controle** | ✅ |
| F4b.5 | Decisão D2 e remoção do protótipo que perdeu | **você aprova a decisão** | ✅ |

## M1 — Casca (sem jogo ainda)

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M1.1 | Temas: `estilo.css` do antigo inteiro, `data-tema`, teste de contraste dos 126 | prints de 6 temas antigo × novo | ✅ |
| M1.2 | Pilha de telas, Voltar (botão, botão direito, Esc, Alt+←), atalhos globais (F2, F11, Home) | você navega entre telas vazias | ✅ |
| M1.3 | Foco por controle (direcional, A, B, Start, segurar repete) | **você navega com o teu controle** | ✅ |
| M1.4 | Início (sem jogos), menu lateral, menu Arquivo, avisos | print antigo × novo | ✅ |
| M1.5 | Galeria de temas (busca sem acento, categorias, showcase lento/rápido) e Guia | você usa a galeria | ✅ |

## M2 — Rodar um jogo

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M2.1 | `CoreSession` + `WasmLibretroCore` no Node: ROMs geradas de NES/MD/GB/SNES, N quadros | hash da imagem e do som **igual ao antigo** | ✅ |
| M2.2 | Worker + laço + som pelo AudioWorklet | você ouve uma ROM de teste com som | ✅ |
| M2.3 | Vídeo WebGL (escala, proporção, resolução dinâmica, corte do NES), sem filtros ainda | print antigo × novo pixel a pixel | ✅ |
| M2.4 | Entrada do J1 (teclado e controle no mapa padrão), pausa, F1, turbo, volume, mudo | você joga uma ROM de teste | ✅ |
| M2.5 | Abrir arquivo, tela do jogo, menu rápido básico, painel de desempenho (F3) | **você joga um jogo teu no app novo** | ✅ |

> **01/11:** Lotes A (M3–M6) e B (M7–M8) aprovados de uma vez: fazer tudo e parar só no fim, com um pacote pro
> Marcelo testar. Cada passo = um commit com o nome da etapa.
> **01/11 (fim do dia):** M3.1 → M8.4 feitos. Commits juntos onde o código é um só: M4.2+M4.3,
> M7.1+M7.2, M7.3+M7.4. Conferido contra o antigo: estados nos dois sentidos, rebobinar passo a passo, `.kofsave`
> (`guarda.js`), base de jogos e os pixels das 42 predefinições do painel de imagem.
> **02/11:** pacote M3–M8 aprovado pelo Marcelo (saves do novo conferidos: cartucho, F5/F6/F8, Continuar). Próximo: M9.
> **02/11:** M9, M10 e M11 aprovados em lote ("até o M11"); feitos no mesmo dia, um commit por etapa (⏸ = esperando o
> Marcelo testar o pacote). Os núcleos de PS1, N64 e Neo Geo são os binários do antigo (manifesto): só ligação.

## M3 — Biblioteca e Kof Games

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M3.1 | `domain`: detectar sistema, CRC No-Intro, ler zip e .cue (sem DOM) | testes com arquivos gerados | ✅ |
| M3.2 | Rust `kof-files`: escopos, árvore da Kof Games, varredura com progresso | você aponta pra tua Kof Games e vê a contagem | ✅ |
| M3.3 | Organizar (mostra o plano antes, depois aplica) | você confere o plano numa **cópia** da pasta | ✅ |
| M3.4 | Tela da biblioteca: lista em janela, ficha, abrir jogo, arrastar arquivo | 3.000 jogos sem travar (vídeo) | ✅ |
| M3.5 | Busca, `campo:valor`, facetas, ordenar, base de jogos | as mesmas buscas dão o mesmo resultado no antigo e no novo | ✅ |
| M3.6 | Capas (baixadas pelo Rust, com cache) | tua biblioteca com capas | ✅ |

## M4 — Configurações e dados

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M4.1 | Esquema de configurações com camadas (geral → console → jogo) gravado em arquivo | testes + o arquivo de config legível | ✅ |
| M4.2 | Importar `.kofsave` | **o teu backup de verdade do antigo entra no novo** | ✅ |
| M4.3 | Exportar `.kofsave` | o antigo abre o backup feito no novo | ✅ |

## M5 — Saves, estados e modos

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M5.1 | Save de bateria em arquivo (formato do antigo) | um save teu continua de onde parou | ✅ |
| M5.2 | Savestates, tela de Estados, F5/F6/F8 | um estado salvo no antigo abre no novo | ✅ |
| M5.3 | Salvar automático e Continuar | você fecha no meio e continua | ✅ |
| M5.4 | Modos alegria/normal/raiz/hardcore, pergunta ao abrir, Opções de emulação | você testa as regras de cada modo | ✅ |

## M6 — Rebobinar

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M6.1 | Rebobinador dentro do Worker | teste: volta bit a bit igual ao antigo | ✅ |
| M6.2 | Backspace/Select+Y, preto e branco, ampulheta de 30 s, limite por modo | **você rebobina** | ✅ |

## M7 — Painel de imagem e molduras

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M7.1 | `visual.js` portado + shader sob medida | pixels iguais ao antigo nas 42 predefinições | ✅ |
| M7.2 | Passadas NTSC, Scale4x, bloom | prints antigo × novo | ✅ |
| M7.3 | Painel Simples (F4): categorias, cartões com prévia, intensidade | você usa | ✅ |
| M7.4 | Avançado, ⭐ meus, `.kofvisual`, por console e por jogo, comparar | um `.kofvisual` do antigo abre no novo | ✅ |
| M7.5 | Molduras (SVG, animação, PNG própria), paletas do GB e do NES | **você confere os filtros e as molduras** | ✅ |

## M8 — Controles

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M8.1 | Mapa de entrada com camadas (`domain`), teclas reservadas | testes | ✅ |
| M8.2 | Tela Controles e teclas (abas, escopo, captura de tecla e de botão) | você remapeia | ✅ |
| M8.3 | Analógico no teclado, L2/R2 | você testa num jogo de PS1/N64 | ✅ |
| M8.4 | Jogadores 2 a 4 e a tela Jogadores | você joga com 2 controles | ✅ |

## M9 — Jukebox e música

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M9.1 | Tocador numa 2ª instância do núcleo, guardar música (F7) | você guarda e toca uma música | ⏸ |
| M9.2 | Tela da jukebox com barras e capa, `.spc` (importar/exportar) | um `.spc` do antigo toca igual | ⏸ |
| M9.3 | Ondas, Mudo/Solo, notas, sincronia, exportar `.wav` | `.wav` igual ao do antigo | ⏸ |
| M9.4 | Trilha FM, 8 bits, Air em violino, música do Início | você ouve | ⏸ |
| M9.5 | Abertura da primeira vez | print/vídeo antigo × novo | ⏸ |

## M10 — Estatísticas e extras

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M10.1 | Estatísticas (por dia/mês/hora/aparelho) e a tela | as tuas estatísticas importadas aparecem iguais | ⏸ |
| M10.2 | Espaço usado | você vê | ⏸ |
| M10.3 | Patches de tradução IPS/BPS/UPS | um jogo traduzido abre com o selo 🇧🇷 | ⏸ |
| M10.4 | Caçador de bugs (F9) e replay | um pacote do antigo reproduz no novo | ⏸ |
| M10.5 | Avisos de atualização e de mudo | você vê | ⏸ |

## M11 — Sistemas com BIOS

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M11.1 | Tela de BIOS e importação (por nome, tamanho e conteúdo) | tuas BIOS reconhecidas | ⏸ |
| M11.2 | GBA | você joga | ⏸ |
| M11.3 | Neo Geo (zip inteiro + pai, AES) | você joga KOF | ⏸ |
| M11.4 | PS1 em wasm (CD sem cópia) | você joga | ⏸ |
| M11.5 | N64 em wasm | você joga | ⏸ |
| M11.6 | Escolher o núcleo do SNES (Kof entra quando a Mel liberar) | você troca | ⏸ |

## M11b — PS nativo e o que ficou incompleto no M9–M11 (aprovado em 02/11: "pode fazer tudo")

> **02/11:** o Marcelo testou o pacote M9–M11 e não aceita a jukebox do SNES sem Ondas/Notas ("igualzinha à outra") nem
> o N64 sem rodar jogo. Prioridade dele: **PS rodando liso**, com núcleo **nativo** (o wasm continua no app como
> reserva; nada de apagar os núcleos wasm) e o nativo como **padrão** no PS. Ordem abaixo = ordem de execução.
> Núcleos que a gente compila (nativos e o Snes9x com sonda) ficam como anexo de **Release no repositório KOFStation**;
> o `pnpm nucleos` baixa de lá conferindo o SHA-256 (nada no histórico do git). Mesmo commit do núcleo que o antigo usa
> (o `construir.sh` do antigo diz qual), pra estados e saves continuarem abrindo nos dois.

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| N.1 | Crate `kof-nativo`: frontend libretro em Rust (`libloading`) num processo filho supervisionado pelo `kof-app` (o `kof-process` do M12 adiantado): carrega o `.so`/`.dll`, roda o laço, som nativo (cpal) ditando o ritmo (D22), imagem pra página por WebSocket local com token (a página desenha com os mesmos filtros e molduras) e os botões vindo da página | teste com um núcleo libretro mínimo compilado no teste (sem ROM de verdade): quadro e som chegam, conexão sem token recusada | ✅ |
| N.2 | PCSX-ReARMed nativo com dynarec, Linux e Windows (script `tools/nucleos-nativos.sh`, commit fixo, GPL), na Release e no manifesto | `cargo test` roda um PS-X EXE gerado que desenha na tela: pixels conferidos | ✅ |
| N.3 | PS1 nativo no app: CD lido direto da Kof Games pelo Rust (sem passar pela página), BIOS do `/sistema`, bateria/cartão de memória, estados (mesmo formato do wasm), pausa, turbo, volume, caçador; **padrão no PS1**, wasm como opção (Opções de emulação) e reserva automática se o nativo faltar | **você joga PS1 liso** (Linux e Windows) | ⏸ |
| N.4 | Snes9x com sonda (`snes9x-sonda.patch`, como os outros núcleos do antigo): onda de cada uma das 8 vozes, mudo por voz; wasm na Release | o mesmo `.spc` no chip do antigo (rodado só na sessão) × no novo: som e ondas iguais | ✅ |
| N.5 | Jukebox igual ao antigo: Ondas/Notas no SNES, capa oficial, o 8 bits, `.wav` da trilha byte a byte igual ao do antigo, prints antigo × novo das 3 vistas | prints lado a lado + `.wav` igual | ⏸ |
| N.6 | N64 rodando: ROM de teste válida que desenha na tela (gerada no teste), descobrir por que a ROM atual quebra o núcleo (que quebra igual no antigo), outro modo de CPU, recompilar se o publicado tiver defeito; avaliar o N64 nativo pelo mesmo caminho do N.1 | imagem conferida; **você joga N64** | ⏸ |
| N.7 | Neo Geo e PS1 wasm conferidos pela imagem (PS-X EXE que desenha; zip do pai e BIOS) | pixels × antigo | ✅ |
| N.8 | Pontas: cartão BIOS do Início diz quais estão guardadas; abertura com o ícone do app e a lista de BIOS no passo 2 | prints | ✅ |
| N.9 | PS2 nativo (o M12) em cima do N.1 (LRPS2 como núcleo libretro nativo, sem o kofnativo.c) | você joga PS2 | ⬜ |

> **N.1 feito (02/11):** crate `kof-nativo` + `kofstation --nativo`; `cargo test -p kof-nativo` compila um núcleo libretro
> mínimo em C e confere quadro, som (735 amostras/quadro, ~60 quadros/s), botões, estado, bateria, pausa, token/origem
> recusados e núcleo que quebra derrubando só o filho. Página ainda não usa (entra no N.3).
> **N.2 feito (02/11):** `tools/nucleos-nativos.sh` (PCSX-ReARMed c8816799 com lightrec, Linux + Windows por mingw-w64),
> workflow "Núcleos nativos" → Release `nucleos-nativos-c881679`, manifesto (seção `nativos`) e `pnpm nucleos` baixando
> a plataforma atual. `tests/pcsx.rs`: PS-X EXE montado no teste desenha vermelho + retângulo verde, pixels conferidos;
> estado ida e volta 3x com o recompilador (o lightrec dava SIGILL ao carregar estado: reset antes contorna).
> **N.3 feito, ⏸ você joga (02/11):** PS1 abre no nativo por padrão quando o jogo está na Kof Games (`nativo.abrir`; o
> CD é lido pelo processo, sem passar pela página); Opções de emulação → "Núcleo do PlayStation" volta pro wasm; se o
> nativo falhar, abre no wasm sozinho. Página: `JogoNativo` (engine) com a mesma cara do `Jogo`: imagem pelo mesmo
> desenho (filtros, molduras), botões e analógico (DualShock), estados, cartão de memória (conferido 1x/s), pausa,
> turbo, volume, painel F3. `tools/testar-nativo.mjs` (também no CI): app de verdade + Chromium + PS-X EXE gerado,
> pixels da tela do app conferidos, 60 fps.
> **N.4 feito (02/11):** `tools/remendos/snes9x-sonda.patch` (a saída de cada voz do DSP antes do volume, 32 kHz, e o
> mudo por voz) + `tools/nucleos-wasm.sh` (o `construir.sh` e a `ponte.cpp` do antigo num commit fixo); Release
> `nucleos-2`; o Snes9x do app passa a ser este. Conferido: o mesmo `.spc` toca **byte a byte igual** ao Snes9x publicado
> do antigo (`sonda-snes.test`, com `KOF_ANTIGO`); a voz que soa aparece na onda; o mudo cala só ela. (O chip Kof do
> antigo não roda aqui: é da Mel. O Snes9x é o som que o antigo já usava no jogo.)
> **N.5 feito, ⏸ você confere (02/11):** jukebox do SNES com Ondas (8 vozes) e Notas; capa oficial do jogo pelo nome (o
> print fica de reserva); o 8 bits do antigo portado (`oitobits.ts`: Rua e Air **byte a byte iguais** ao `KofMusica`)
> como reserva da trilha (violino → FM → 8 bits); `.wav` da trilha **byte a byte igual** ao `exportarWav` do antigo
> (`musica.test`, com `KOF_ANTIGO`). Prints do novo nas 3 vistas (e2e `jukebox.spec` com `KOF_PRINTS`); lado a lado
> com o antigo não fiz (a jukebox do SNES do antigo usava o núcleo Kof).
> **N.6 feito, ⏸ você joga N64 (02/11):** o "quebra" era a ROM de teste: o N64 começa executando `ROM[0x40..]` (o IPL3)
> de dentro da memória do RSP, e a nossa tinha zeros ali (a CPU andava no vazio até cair; no antigo, igual). A ROM nova
> (`romN64QueDesenha`) tem um programa MIPS no lugar do IPL3 que manda comandos pro RDP (fundo vermelho, retângulo verde)
> e liga o VI: **o Mupen64Plus em wasm desenha certo** (e2e `bios.spec`, pixels conferidos). Jogo de verdade: você.
> N64 nativo avaliado: o Mupen64Plus-Next nativo só desenha pela GPU (GLideN64, `SET_HW_RENDER`); o `kof-nativo` hoje
> recusa isso. Dá pra fazer com um contexto OpenGL sem janela no processo do jogo (EGL) e ler a imagem de volta, o mesmo
> caminho que o PS2 (N.9) precisa: fica junto com ele.
> **N.7 feito (02/11):** PS1 em wasm com o mesmo PS-X EXE que desenha: pixels conferidos (e2e). Neo Geo com imagem só
> com a BIOS (não entra em teste): o fluxo de pedir a BIOS e o zip + pai seguem no teste de antes.
> **N.8 feito (02/11):** cartão BIOS do Início diz quais estão guardadas ("✅ GBA, Neo Geo · trocar ou guardar outra");
> a abertura mostra o ícone do app (a xícara do `icone.py` do antigo, em SVG; também o ícone da janela) e, no passo 2, a
> lista de BIOS (GBA roda sem; Neo Geo guardado ou faltando).
> **N.9 ⬜ (próxima sessão):** o `kof-nativo` precisa dar ao núcleo um OpenGL sem janela (`SET_HW_RENDER`: contexto EGL
> no processo do jogo, framebuffer, `get_proc_address`) e ler a imagem de volta pra página; depois o LRPS2 (commit do
> antigo) no `tools/nucleos-nativos.sh`. O mesmo caminho dá o N64 nativo.

Estimativa (tokens escritos): N.1–N.3 300–500 mil · N.4–N.5 230–330 mil · N.6 100–200 mil · N.7–N.8 90 mil. Com o N.9, o
M12 encolhe (o canal e o processo já vêm do N.1).

## M12 — PS2 nativo

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M12.1 | `kof-process`: abre, vigia e religa o kofnativo | teste com um programa falso | ⬜ |
| M12.2 | Canal com token e protocolo tipado | teste: conexão sem token é recusada | ⬜ |
| M12.3 | Modo página com filtros, disco lido aos pedaços | DVD de teste roda | ⬜ |
| M12.4 | Cartão de memória, savestate, pausa | você joga PS2 (quando quiser) | ⬜ |

## M13 — Rede e celular como controle

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M13.1 | `kof-net` (usa o `kofrede.c` do antigo) | testes do protocolo passando | ⬜ |
| M13.2 | Tela Aparelhos, código e QR | **teu celular (APK atual) pareia com o PC novo** | ⬜ |
| M13.3 | Celular como controle (antigo e pela rede), jogadores pela rede | você joga com o celular | ⬜ |
| M13.4 | Jogar no PC, Controle total, Modo Switch, Levar pro celular | você joga no celular com o PC processando | ⬜ |

## M15 — Distribuição

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M15.1 | Manifesto assinado e atualizador | teste: arquivo alterado é recusado | ⬜ |
| M15.2 | Pacote do Linux | **você instala no teu Linux** | ⬜ |
| M15.3 | Pacote do Windows | você instala num Windows | ⬜ |
| M15.4 | Versão de teste lado a lado com o app antigo | você usa as duas | ⬜ |

## M14 — Celular

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| M14.1 | A casca Java atual serve o app novo (adaptador `android`) | APK abre o app novo | ⬜ |
| M14.2 | Controle de toque (6 modelos), layout do celular | você joga no celular | ⬜ |
| M14.3 | Pasta de ROMs e biblioteca do celular | tua pasta no celular | ⬜ |
| M14.4 | PS1 e N64 nativos | você joga | ⬜ |
| M14.5 | Atualizador do APK | atualiza sozinho | ⬜ |

## Troca

| Passo | O que faço | Checkpoint | Estado |
|---|---|---|---|
| T.1 | Conferir o PARIDADE.md 100% verificado | lista completa | ⬜ |
| T.2 | O app antigo publica uma última versão que avisa e leva pro novo | **você decide quando** | ⬜ |

---

**Total: 76 passos.** Parar em cada um custa um pouco mais de token (cada retomada relê o contexto): calculo uns 10–15%
a mais que a estimativa do PLANO_DETALHADO, ou seja, algo como 2,8–5 milhões de tokens escritos no total. Aprovar em
lote ("segue até...") economiza isso.
