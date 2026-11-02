# Paridade com o app antigo

> **Regra (D0):** todas as funcionalidades do `kofstation-old` são intocáveis. Um item só vira ✅ quando tem **teste** no
> repositório novo e foi **comparado** com o antigo. Estados: ⬜ pendente · 🟨 implementado sem verificação · ✅ verificado.
> Fichas completas (onde está no antigo, linhas): [auditoria/FEATURE_INVENTORY.md](auditoria/FEATURE_INVENTORY.md).
> Teste antigo de referência entre colchetes (`testes/navegador/<nome>.cjs` no antigo). Esta lista cresce durante a
> migração: comportamento descoberto no código antigo e não listado aqui entra antes de a etapa fechar.

## Atalhos de teclado (PC) — `app.js` ≈ 1080–1135
| Tecla | Faz | Etapa | Estado |
|---|---|---|---|
| F1 | reiniciar o jogo | M2 | ✅ |
| F2 | menu rápido (abre/fecha) | M2 | ✅ |
| F3 | painel de desempenho | M2 | ✅ |
| F4 | painel de imagem | M7 | ✅ |
| F5 / F6 / F8 | salvar estado / tela de estados / carregar o último | M5 | ✅ |
| F7 | guardar a música (jukebox) | M9 | ⬜ |
| F9 | reportar bug (caçador de bugs) | M10 | ⬜ |
| F11 | tela cheia | M1 | 🟨 |
| Esc / P | pausar; Esc fecha painel/tela aberta e volta ao jogo | M1/M2 | ✅ |
| M | mudo | M2 | ✅ |
| − / = (e numérico) | volume −10 / +10 | M2 | ✅ |
| Tab (segurar) | turbo | M2 | 🟨 |
| Backspace (segurar) / Select+Y | rebobinar | M6 | ✅ |
| Ctrl+O / Ctrl+L | abrir arquivo / biblioteca | M3 | ✅ |
| Home | Início | M1 | ✅ |
| Alt+← / BrowserBack / botão direito | Voltar | M1 | ✅ |
| Biblioteca: digitar = busca; F6 ou E = estados do jogo selecionado | | M3 | ✅ |
| Teclas do jogo + E/R (L2/R2) + analógico (setas/IJKL/TFGH no PS1/PS2/N64) | | M8 | 🟨 (o mapa e a tela ✅; jogo de PS1/N64 só no M11) |
| Teclas reservadas não podem ser mapeadas pro jogo (`RESERVADAS`) | | M8 | ✅ |

## Navegação e telas — [home, direito, foco, menu]
- ⬜ Todas as telas do antigo existem (Início, Biblioteca, Estados, Jukebox, Estatísticas, Guia, Controles e teclas,
  Temas, Painel de imagem, Molduras, BIOS, Aparelhos, Jogadores, Modo de jogo, Abertura, Espaço usado, Bug).
- ✅ O jogo pausa com qualquer tela aberta, com o menu rápido e ao sair da janela, e volta ao fechar. [e2e jogo]
- ✅ Voltar anda pelo histórico; botão direito nas telas = Voltar. [e2e casca]
- ⬜ Menu rápido com todos os itens (`ITENS_RAPIDO`), ◀▶ ajustam, itens só de certos sistemas (`so:`).
- ✅ Navegação por controle fora do jogo (`navegarPad`): direcional move o foco pro botão mais perto, segurar repete,
  A clica, B volta/fecha, Start = Início; select/range mudam com ◀▶. [controles, jogar-no-pc]
- ✅ Menu lateral e menus com as mesmas ações (as que não chegaram avisam a etapa). [e2e casca]
- ⬜ Avisos (`avisar`, `avisarErro`) com as mesmas mensagens.

## Início, abertura, guia — [home, hometemas, abertura]
- 🟨 Início: frases, logo por tema e dicas ✅; Continuar de onde parou e Jogados recentemente ✅ (M5.3); cartão BIOS abre
  a tela (M11), mas o texto dele ainda não diz quais BIOS estão guardadas (o antigo dizia: `marcarBiosHome`).
- 🟨 Abertura da 1ª vez: título → frases → 10 temas → apresentação → guia de 4 passos; Ajuda > Boas-vindas reabre
  (teste `abertura.spec`). Diferenças: no título, o logo do tema no lugar do ícone do app; no passo 2 falta a lista
  "GBA roda sem / Neo Geo: falta o neogeo.zip" (`marcarAbBios`).
- 🟨 Música do Início (escolha, sortear, desligar; só toca depois do 1º gesto): na trilha FM e no violino, como lá.
- ✅ Guia com as mesmas páginas (texto copiado do antigo) e a tabela de atalhos.

## Temas — [galeria, temas-menu, categorias-temas, pacote-cafe, nostalgia-br, contraste]
- ✅ 126 temas, mesmos ids/nomes/descrições/categorias; Café queimado é o padrão. [domain temas.test, prints antigo × novo]
- ✅ Busca sem acento, categorias, showcase lento (3,5 s) e rápido (0,5 s). Tema no menu rápido: M2.
- 🟨 Contraste: o CSS é o mesmo do antigo (então é igual); o teste de contraste automático entra junto do M7.

## Biblioteca e arquivos — [bib, busca, pastas, sofa]
- 🟨 Milhares de jogos em lotes de 150 (como o antigo); ficha com capa, metadados e botõezinhos que filtram ✅. Falta medir 3.000 jogos com a CPU limitada.
- ✅ Busca livre + `campo:valor`; facetas (Console, Gênero, Empresa, Década, Jogadores, Série) com contagem; ordenar. [e2e biblioteca]
- ✅ CRC No-Intro (sem cabeçalho 512/iNES) gravado no registro; base de jogos por CRC/título/set Neo Geo (mesmas respostas do `KofJogos`, teste com KOF_ANTIGO).
- ✅ Capas do libretro-thumbnails por sistema, com cache e falha lembrada (agora baixadas pelo Rust). Modo sofá ✅.
- ✅ Kof Games: cria a árvore, organiza Novos/soltos/pasta errada (CD .cue+.bin junto), copia o que vem de fora. Novo: mostra o plano antes de mover (D25).
- 🟨 Abrir/arrastar: ROM, zip e `.kofsave` ✅, `.kofvisual` pelo painel ✅; CD (.cue/.bin) quando o PS1 rodar (M11); patch (M10).
- ✅ Detecção de sistema por extensão e conteúdo (SYSTEM.CNF/BOOT2 do PS2, zip de Neo Geo por nome e por CRC, CD de PS1). [domain deteccao.test]

## Emulação, vídeo e som — [teste, nucleos, nucleo-snes, matriz, dk, erro]
- ⬜ Os mesmos sistemas: SNES (Snes9x; Kof opcional quando liberado), GB/GBC, NES, MD, SMS, GG, GBA, Neo Geo, PS1, N64, PS2.
- 🟨 Núcleo carregado só ao abrir um jogo daquele console (no Worker); o aviso de núcleo faltando vira erro claro do Worker.
- ⬜ Resolução dinâmica (Sega, PS1), corte do NES (256x224), proporção 4:3 "como na TV", 10:9 GB/GG, 3:2 GBA.
- ✅ Paletas do GB (automática, verde, cinza) e do NES (3), mudando com o jogo rodando.
- 🟨 Volume, mudo e aviso de mudo ao abrir jogo ✅; na jukebox: M9.
- ⬜ Pular quadros quando atrasa (PS1 `frameskip auto`); turbo.
- ⬜ Estado salvo com outro núcleo de SNES reabre no núcleo certo.
- ✅ Mesmos pixels e mesmas amostras do antigo, quadro a quadro, em SNES, NES, MD, GB e GBA (comparação automática, `packages/engine/test/paridade.test.ts`).

## Painel de imagem e molduras — [filtros, visual-*, molduras]
- ✅ 61 ajustes, 42 predefinições, categorias/grupos, custo leve/médio/pesado, comparar (lado a lado, piscar),
  ⭐ meus, 📤/📥 `.kofvisual`, por console e por jogo, Simples e Avançado, prévias. [e2e visual]
- ✅ Passadas NTSC/Scale4x/bloom; aviso quando a passada falha (código do antigo).
- ✅ 15 molduras SVG com animação, por console, moldura PNG própria (acha o buraco). [e2e molduras; molduras.js conferido por SHA-256]
- ✅ **Pixels idênticos ao antigo em todas as predefinições** (e2e visual-paridade com o KOFstation.html publicado, KOF_ANTIGO).

## Controles — [teclas, controles, jogadores]
- ✅ Camadas Geral → console → só este jogo, pra teclado e controle; tecla repetida sai da ação antiga; ↺ por botão. [e2e controles]
- ✅ Nomes dos botões por console; captura de botão do controle (espera soltar, 10 s).
- 🟨 Analógico no teclado (PS1 misto, PS2 puro, N64 só o esquerdo): mapa e envio pro núcleo ✅; conferir num jogo quando o PS1/N64 rodar (M11).
- 🟨 Jogadores 2–4: teclado sempre J1, controles em vagas, escolha lembrada pelo nome do controle, tela com luz ✅; celulares pela rede (M13).

## Saves, estados, modos, rebobinar — [saves, estados, auto, modos, rebob, migra]
- ✅ Save de bateria comprimido, rascunho seguro ao fechar, sem o fim 0xFF (chave `sram.<título>.<tamanho>` do antigo). [e2e saves]
- ✅ Savestates (limite por jogo), automático a cada N s, Continuar, carregar o último; estado do antigo abre no novo e vice-versa (teste com KOF_ANTIGO, 5 sistemas).
- ✅ Modos alegria/normal/raiz/hardcore com as mesmas regras; pergunta ao abrir (desligável); Opções de emulação.
- ✅ Rebobinar estilo Príncipe da Pérsia (preto e branco, ampulheta de 30 s; alegria sem recarga); o Rebobinador restaura os mesmos estados do antigo, passo a passo. PS1/PS2: `semRebob` (M11).
- ✅ `.kofsave` exportado no antigo abre no novo e vice-versa (saves, estatísticas, configs opcionais, estados opcionais). [guarda.test com o guarda.js do antigo; e2e backup]
- ⬜ Saves nativos do celular (PS1 `.mcd`, N64) entram no backup.

## Jukebox e música — [juke, jukebox, trilha, capas-wav]
- 🟨 Guardar música por estado (todos os sistemas com sonda), lista com a Trilha do KOFstation, renomear/apagar, mini-player
  (teste `jukebox.spec`). **Diferença (D29):** no SNES o antigo guardava um .spc e tocava no chip de som do núcleo Kof;
  aqui guarda o estado do Snes9x (toca igual ao jogo) e o .spc importado toca no Snes9x (entra num estado dele; teste
  `spc.test`). Exportar .spc sai do estado. A capa é o print do jogo (a capa oficial por nome ainda não).
- 🟨 Barras (8 SNES pelo envelope, 4 GB...), Ondas por canal com estilo pelo tema, Mudo/Solo, Notas (YIN), sincronia,
  .wav. **Diferença:** no SNES não tem a onda de cada voz (o Snes9x não tem sonda; o Kof tinha): Ondas e Notas ficam
  vazias no SNES, barras e Mudo/Solo funcionam.
- 🟨 Trilha FM (6 músicas, núcleo só de som) e Air em violino. Falta o 8 bits, que no antigo só tocava se faltasse o
  núcleo FM (aqui ele vem sempre pelo manifesto).

## Estatísticas e extras — [bug, atualiza, guarda]
- 🟨 Tempo jogado (só jogando de verdade), sessões, últimos 7 dias, por jogo, por aparelho (as partes do `.kofsave`);
  Espaço usado por loja (teste `extras.spec`). A tela mostra o que a do antigo mostrava (7 dias e tabela).
- ✅ Patches IPS/BPS/UPS (CRC conferido; cabeçalho 512 do SNES), jogo traduzido com save próprio e selo 🇧🇷 (testes
  `patch.test` e `extras.spec`; o código é o `patch.js` do antigo).
- 🟨 Caçador de bugs: pacote `kofbug-*.json.gz` com o marco + botões + print, issue no GitHub (agora
  `Marcelao98/KOFStation`); `pnpm bug <pacote> <rom>` reproduz (teste `bug.test`). Pacote do antigo não reproduz no novo
  (a assinatura é da imagem que o app mostra, e o antigo usava o núcleo Kof).
- ⬜ Painel de desempenho (fps, ms por parte, engasgos, falta de som).
- 🟨 Aviso "atualizou" (versão mudou desde a última abertura) e "som desligado" ao tocar na jukebox. "Tem versão nova"
  chega com o atualizador (M15).

## Sistemas com BIOS e nativos — [gba, neogeo, ps1, n64, ps2, ps2-pagina, ps2-nativo]
- 🟨 Tela de BIOS por console; BIOS do PS2 por conteúdo; jogo que esperava BIOS abre sozinho depois (teste `bios.spec`).
- 🟨 Neo Geo: zip inteiro + zip do pai, AES (volta pro MVS), erro com a linha do log (falta testar com jogo de verdade).
- 🟨 PS1 wasm (CD sem cópia, BIOS opcional, .cue + .bin escolhidos juntos ou achados na Kof Games): roda um PS-X EXE
  gerado no teste. N64 wasm: o núcleo sobe com WebGL2 dentro do Worker (OffscreenCanvas, D30); jogo de verdade é
  teste do Marcelo (a ROM gerada não é um jogo válido nem no antigo).
- ⬜ PS2 nativo em modo página e modo janela, disco aos pedaços, cartão de memória, savestate, filtro, pausa pelo Esc/Guide.

## Rede e celular — [aparelhos, jogar-no-pc, controle (android)]
- ⬜ Parear por código de 6 números e por QR; lista online; nome e visibilidade; pareia com o APK atual.
- ⬜ Celular como controle (antigo WS 8642 e pela rede), mostra jogo e jogador.
- ⬜ Jogar no PC (vídeo/som/botões, ping, menu do PC no celular, salvar/carregar, atalhos ⏪💾📂🏠☰), Modo Switch,
  Levar pro celular, Voltar pra TV, filtro do celular.

## Celular (M14) — [celular, apk-simulado, pasta-apk, ps1-fachada]
- ⬜ Controle de toque (6 modelos), biblioteca e ficha do celular, pasta de ROMs (SAF), PS1/N64 nativos, atualizador
  do APK, voltar do Android = menu rápido.

## Distribuição (M15) — [atualiza; lançadores no Wine]
- ⬜ Abre em janela de app no Linux e no Windows; atualiza sozinho (agora assinado); dados do usuário nunca na pasta do
  programa.
