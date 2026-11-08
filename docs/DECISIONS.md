# Decisões de arquitetura

> Formato: contexto → decisão → consequências → alternativas. Estado: **aceita**, **aceita** (falta o Marcelo
> aprovar) ou **pendente** (depende de medição). Nada aqui é apagado: decisão trocada ganha "substituída por D#".
> Origem da análise: [auditoria/](auditoria/).

---

## D0. Repositórios, licença e escopo — **aceita** (Marcelo, 31/10/2026)
- Antigo: `Marcelao98/kofstation-old` (continua sendo o produto até a troca; `KOFSnes` redireciona pra ele e é o
  endereço dos atualizadores). Novo: `Marcelao98/kofstation`.
- Licença do novo: **GPL-3.0** (`LICENSE`). Terceiros em [`../THIRD_PARTY.md`](../THIRD_PARTY.md).
- O **núcleo Kof (SNES) é da Mel**: fica fora do repositório até ela definir a licença; entra depois como artefato opcional.
- **Linux e Windows têm a mesma prioridade.** Celular entra no fim.
- **Todas as funcionalidades são intocáveis**: paridade total ([PARIDADE.md](PARIDADE.md)).

## Aprovação
Arquitetura (ARCHITECTURE.md e D1–D16) **aprovada pelo Marcelo em 31/10/2026**; D2 continua pendente do spike F4b.

## D1. Sem RetroArch: frontends libretro próprios — **aceita**
- **Contexto:** o produto nunca usou RetroArch. O frontend libretro é próprio: `ponte.cpp` (wasm), `kofnativo.c`
  (PS2 no PC), `android/nativo/kofnativo.c` (PS1/N64 no celular). Jukebox por canal, rebobinar na memória do núcleo,
  filtros sobre a imagem, PS2 em modo página e disco lido aos pedaços dependem disso.
- **Decisão:** manter os mesmos frontends e os mesmos núcleos (binários por hash); eles ficam atrás do contrato
  `CoreSession` (ver ARCHITECTURE).
- **Consequências:** nada de emulação é reescrito; o build dos núcleos continua no antigo até migrar pra CI.
- **Alternativas:** RetroArch como processo externo — perde as funcionalidades acima (viola D0).

## D2. Casca desktop: Rust local + Chromium (opção B) — **aceita** (Marcelo, 31/10: "vai até o M2" depois da recomendação)
- **Contexto:** Linux e Windows com a mesma prioridade (D0). Spike de 31/10 ([SPIKE_D2.md](SPIKE_D2.md)).
- **Medido:** no Linux, o Tauri (WebKitGTK) não tem WebRTC nem isolamento (`SharedArrayBuffer`), mesmo com os
  cabeçalhos certos e o WebRTC ligado nas configurações. O Chromium passa em tudo.
- **Decisão proposta:** opção B no Linux e no Windows: o backend Rust serve o app em `127.0.0.1` com token aleatório
  e COOP/COEP e abre o navegador Chromium instalado em modo app, com perfil próprio.
- **Consequências:** precisa de um Chromium/Chrome/Edge/Brave instalado (igual ao app antigo; no Windows o Edge já vem);
  o canal app ↔ Rust é HTTP/WebSocket local com token e conferência de `Origin`; os crates não mudam.
- **Empacotamento (pergunta do Marcelo, 31/10):** com a opção B o app é **um executável só** (`kofstation`, ~3 MB no
  Linux e ~4,5 MB no Windows, com o front embutido), feito pelo crate `kof-app`. Pacotes `.zip`/`.tar.gz`, AppImage,
  `.deb`/`.rpm` e instalador do Windows saem desse executável (M15, com `cargo-packager` ou `cargo-deb`), e a
  atualização assinada vem do D12. O que o Tauri dá a mais (instalador e atualizador prontos) se faz com essas
  ferramentas; o que ele tiraria no Linux (WebRTC e isolamento) não tem conserto.
- **Alternativas:** Tauri só no Windows (duas cascas pra manter); Electron (leva o Chromium junto, +~100 MB, sem
  dependência do navegador instalado; reavaliar se algum usuário não tiver Chromium).

## D3. Emulação no frontend (wasm em Worker); nativo só onde já é nativo — **aceita**
- Núcleos wasm rodam num Web Worker com áudio por AudioWorklet; o PS2 continua nativo (kofnativo), supervisionado pelo
  Rust (D11). Mantém a mesma base no PC e no celular e os filtros/molduras da página.

## D4. Camadas TS: domain · app-core · engine · apps/desktop — **aceita**
- `domain` puro (sem DOM, roda no Node), `app-core` (casos de uso), `engine` (laço/vídeo/áudio/núcleos, **sem React**),
  `apps/desktop` (React). Dependências só para baixo: desktop → app-core → (domain, engine, contracts).
- O laço de 60 fps não passa pelo ciclo de render do React.

## D5. Estado global com Zustand — **aceita**
- Pequeno, legível fora de componentes (casos de uso e engine precisam). A engine emite eventos e não importa a store.
- Alternativa: store própria com `useSyncExternalStore` (zero dependência).

## D6. Sem React Router no início — **aceita**
- As ~20 telas são sobreposições com "Voltar" num app sem barra de endereço (TV/controle): uma **pilha de telas** na
  store modela isso. Reavaliar se surgir link profundo.

## D7. Dados do usuário em arquivos + importação `.kofsave` — **aceita**
- A origem nova não enxerga o IndexedDB do antigo. Dados vão pra arquivos (Kof Games/Saves, Config) geridos pelo Rust;
  o `.kofsave` do antigo é importado (e exportado no mesmo formato, nos dois sentidos).
- Cache descartável (capas, base de jogos) pode ficar no armazenamento da WebView.

## D8. Contrato front ↔ back por comandos tipados — **aceita**
- Comandos nomeados (`library.scan`, `saves.write`...), entradas/saídas serde ↔ TS, eventos para progresso e avisos,
  erros `{code, message, details}` com códigos enumerados. **Não existe** comando genérico de shell ou de arquivo fora
  do escopo (raiz escolhida ou pasta de dados).

## D9. Tipos TS gerados do Rust — **pendente (F4a)**
- `ts-rs` (ou `specta` se D2 = Tauri). Até lá, tipos à mão + fixtures JSON testadas dos dois lados.

## D10. Rede: Rust reusa `kofrede.c` por FFI — **aceita**
- Mesmo PROTOCOLO.md v1 (pareia com o celular atual). Reescrita em Rust puro só passando nos testes de `rede/teste/`.

## D11. PS2: Rust supervisiona o mesmo kofnativo — **aceita**
- A página não fala mais direto com o kofnativo: canal com token aleatório + conferência de origem. O C não muda no
  começo (o conserto do `Origin` no antigo fica pra quando alguém jogar PS2, decisão do Marcelo de 31/10).

## D12. Atualização com manifesto assinado — **aceita**
- Ed25519 + SHA-256 por arquivo, canal próprio (o lançador antigo nunca baixa o app novo).

## D13. Celular: casca Java atual servindo o app novo — **aceita** (celular depois, Marcelo 31/10)
- M14, no fim. Tauri mobile só se um dia valer a pena.

## D14. GPL-3.0 — **aceita** (ver D0)

## D15. Monorepo pnpm + Cargo — **aceita**
- Um repositório, `pnpm-lock.yaml` e `Cargo.lock` versionados, `rust-toolchain.toml` fixando o Rust.

## D16. Núcleos como artefatos por hash, fora do git — **aceita**
- `third_party/cores/manifest.json` (núcleo → arquivo → SHA-256 → origem). No começo a origem é o `publicado/nucleos/`
  do antigo; depois, releases do próprio repositório. Nada de binário grande no histórico do git.

## D17. O front nasce com o CSS e as classes do antigo — **aceita**
- O `estilo.css` (tokens + 126 temas) vem inteiro e os componentes usam os mesmos ids/classes do `pagina.html`: o visual
  fica igual sem redesenho. CSS Modules só depois, tela por tela, com a paridade verificada por print.

## D18. Sem biblioteca de componentes nem Tailwind — **aceita**
- Mudariam o visual (viola D0) e duplicariam o sistema de temas que já existe.

## D19. Foco por controle feito em casa — **aceita**
- ≈150 linhas, comportamento idêntico ao `moverPad` do antigo.

## D20. Lista em janela feita em casa — **aceita**
- ≈100 linhas; se não ficar fluida com 3.000 itens na CPU limitada a 4x, avaliar `@tanstack/react-virtual`.

## D21. Núcleos embutidos no executável (por enquanto) — **aceita** (M2, 31/10)
- Os 5 núcleos do M2 (~11 MB) vão dentro do `kofstation` (14,7 MB no Linux, 16 MB no Windows): abre sem baixar nada.
- Quando entrarem os pesados (FBNeo, PCSX, Mupen64, Play!: +~22 MB) ou no M15, reavaliar: baixar sob demanda, como o
  lançador do antigo fazia (`nucleo=` no versao.txt), ou deixar tudo dentro.

## D22. O som dita o ritmo do jogo — **aceita** (M2, 31/10)
- O núcleo roda num Web Worker e mantém ~60 ms de som num anel de memória compartilhada; o AudioWorklet consome no
  relógio da placa de som. Sem som (sem isolamento ou placa), um relógio pelo fps do núcleo. É o "motor novo" que
  estava planejado no antigo. Medido no M2: 60 fps e 0 falta de som, também com a CPU limitada a 4x.

## D23. A pasta Kof Games é digitada/colada (sem diálogo nativo) — **aceita** (M3, 01/11)
- No navegador em modo app não existe diálogo de pasta que devolva o caminho (o `showDirectoryPicker` dá um "handle",
  não o caminho, e o Rust precisa do caminho). A janela "📁 Pasta Kof Games" vem preenchida com a sugestão
  (`~/Kof Games`) e cria a pasta se o pai existir. Se o executável mora em `<Kof Games>/KOFstation/`, a raiz vem
  sozinha, como o lançador antigo fazia. Diálogo nativo (`rfd`/portal) só se o Marcelo pedir: puxa GTK/D-Bus no Linux.

## D24. Dados do app em `<dados>/lojas/<loja>/` — **aceita** (M3–M5, 01/11)
- O IndexedDB `kofnes` do antigo virou arquivos do Rust: cada registro é `<chave>.json` (metadados) + `<chave>.bin`
  (bytes), com os MESMOS formatos de registro do antigo (saves com a chave `sram.<título>.<tamanho>`, estados com o JSON
  `{lr, d}` em gzip, jogos com `título|tamanho`). Assim o `.kofsave` entra e sai sem conversão.
- Fica em `<dados>` (`~/.local/share/KOFstation`, `%LOCALAPPDATA%\KOFstation`), não na Kof Games: os saves não mudam de
  lugar quando a pessoa troca a pasta. Ir pra `Kof Games/Saves` (pra sincronizar entre aparelhos) é decisão do M13.
- Sem a Kof Games escolhida, a ROM aberta fica guardada na loja `roms` (como antes: abre sem diálogo da próxima vez).

## D25. O plano de organizar é do TS; o Rust só lista e move — **aceita** (M3, 01/11)
- A regra de "que console é" (extensão, zip, CD, Neo Geo pelos CRCs) mora no `domain` e serve pra arquivo aberto e pra
  pasta. O Rust junta os fatos (`library.scan`/`library.inventory`: tamanho, diretório do zip, cara de CD) e aplica os
  movimentos que a pessoa aprovou (`library.organize.apply`). Organizar mostra o plano antes (o antigo movia direto).

## D26. Painel de imagem e molduras copiados sem mudança — **aceita** (M7, 01/11)
- `web/visual.js` e `web/molduras.js` do antigo entram como `kofvisual.js`/`kofmolduras.js` (só a última linha vira
  `export`); um teste confere o SHA-256 do miolo. O renderizador (`engine/visual/render.ts`) é o `gl*`/`pintar` do antigo
  linha por linha, em WebGL 1 como lá. Resultado medido: os mesmos pixels nas 42 predefinições.

## D27. O servidor local atende cada pedido numa linha própria — **aceita** (M3.6, 01/11)
- Baixar uma capa (rede, até 20 s) não pode segurar o save que chega junto. Comandos binários vão em
  `application/octet-stream` com os argumentos no cabeçalho `X-Kof-Args` (nada de base64 em JSON).

## D28. BIOS na loja `bios` da pasta de dados — **aceita** (M11, 02/11)
- O antigo guardava a BIOS no navegador (loja `bios` do IndexedDB). Aqui ela fica em `<dados>/lojas/bios/`, com a chave
  = o nome que o núcleo procura (`gba_bios.bin`, `neogeo.zip`, `scph5501.bin`), e vai pro `/sistema` do núcleo antes de
  cada jogo. Não fica na `Kof Games/Config/bios` (a ARCHITECTURE previa): assim a BIOS não some quando a pessoa troca a
  pasta, e não precisa de comando novo no Rust. Ler também o que a pessoa puser à mão em `Config/bios` fica pro M15.

## D29. Música do SNES pelo Snes9x (sem o núcleo Kof) — **aceita** (M9, 02/11)
- O núcleo Kof é da Mel e fica fora do repositório até ela definir a licença; no antigo a jukebox do SNES usava o chip de
  som dele. Aqui: F7 guarda o estado do Snes9x (toca igual ao jogo, na instância separada); o .spc importado entra no
  bloco `SND` de um estado do Snes9x com uma ROM que não mexe no som, e as vozes que estavam soando são religadas por um
  pedacinho de código do SPC700 (MOV $F2/$F3 + JMP, sem mexer em registrador nem flag). Mudo por voz pelas opções
  `snes9x_sndchan_volume_N`; barras pelo envelope (ENVX) lido do estado. Quando o Kof chegar, ele volta a ser a opção.

## D30. N64 no Worker com OffscreenCanvas — **aceita** (M11, 02/11)
- O antigo criava um `<canvas id="kof-gl">` escondido na página. No Worker não tem página: um OffscreenCanvas vira o
  canvas do módulo e um `document` mínimo responde ao `#kof-gl` que a ponte procura. Mesmo binário do antigo.

## D31. Núcleo só de som e trilha pelo manifesto — **aceita** (M9, 02/11)
- O `somfm` (YM2612 + PSG) vem embutido no `KOFstation.html` publicado do antigo: o `pnpm nucleos` baixa o html de um
  commit fixo e guarda só o trecho do núcleo (conferido por SHA-256), e a `trilha.js` (comandos das 6 músicas) vem do
  mesmo commit. O violino é arquivo do `publicado/nucleos`, como os núcleos. Nada disso entra no git.

## D32. Núcleo nativo num processo filho, imagem pela página, som pela placa — **aceita** (M11b N.1, 02/11)
- O PS1 em wasm não tem dynarec e pesa. Núcleo libretro nativo (`.so`/`.dll`) roda no **processo filho** `kofstation
  --nativo` (crate `kof-nativo`; o mesmo executável, um processo por jogo): se o núcleo quebrar, só o filho morre e o
  supervisor guarda as últimas 300 linhas do log dele (o caçador de bugs manda junto). O filho recebe a configuração por
  uma linha JSON no stdin (o token nunca aparece na linha de comando) e fecha sozinho quando o stdin fecha (o app morreu).
- **Som pela placa** (cpal: ALSA/PulseAudio/PipeWire, WASAPI) ditando o ritmo, como o AudioWorklet do wasm (D22): o laço
  roda quadros enquanto houver menos de 60 ms guardados; sem placa, um relógio imita o consumo (testes, máquina sem som).
- **Imagem pra página** por uma WebSocket em 127.0.0.1 (porta aleatória, token de 128 bits na URL, `Origin` conferida),
  em RGBA igual ao `ponte.cpp` do antigo: a página desenha com os mesmos filtros, passadas e molduras. Só o quadro mais
  novo vai (quem está lento pula quadros, nunca acumula atraso). Botões, estados, bateria e comandos voltam pelo mesmo
  canal (protocolo em `docs/API_CONTRACTS.md` §5, fixtures dos dois lados em `packages/contracts/fixtures/nativo.json`).
- Imagem pela GPU (`SET_HW_RENDER`, N64 com GLideN64) ainda não: o núcleo que pede recebe "não" e cai pro software.
- Núcleos que a gente compila vão como anexo de Release no repositório KOFStation, pelo manifesto (SHA-256), no mesmo
  commit do núcleo que o antigo usa (N.2).
- Custo: o Linux precisa dos cabeçalhos do ALSA pra compilar (`libasound2-dev`/`alsa-lib-devel`); o executável pronto só
  precisa da `libasound.so.2`, que todo Linux com som tem.

## D33. Núcleos numa pasta ao lado do executável, como no antigo — **aceita** (Marcelo, 07/11)
- Antes o `kofstation` embutia o app web **e** os núcleos (38–46 MB num arquivo só). Agora fica igual ao antigo:
  `KOFstation/kofstation` (ou `KOFstation.exe`, ~8 MB, só o app web e o Rust), `nucleos/` (núcleos em WebAssembly e
  dados, um arquivo por núcleo com o hash no nome, mais a `lista.json` que diz qual é qual), `nativo/` (PCSX-ReARMed
  `.so`/`.dll`) e `versao.txt`. O `kofstation` serve `/nucleos/<nome>` lendo da pasta (`crates/kof-app/src/pastas.rs`,
  só nome simples, nada de `..`); o núcleo nativo é aberto direto da `nativo/` (não extrai mais na pasta de dados).
- Por quê: o executável fica pequeno, dá pra trocar um núcleo sem baixar o app inteiro (a base do atualizador, M15.1)
  e o Marcelo enxerga o que tem, como no antigo.
- Rodando do código (`cargo run`, `rodar.sh`) sem essas pastas do lado, usa as do repositório
  (`apps/desktop/public/nucleos/`, `third_party/cores/nativos/<plataforma>/`). Quem monta a pasta: `tools/empacotar.sh`.

## D34. Atualizador próprio com manifesto assinado (Ed25519), troca na próxima abertura — **aceita** (M15.1, 07/11)
- O que o lançador do antigo fazia (comparar a versão, baixar o que mudou, trocar, apagar núcleo velho, `atualizacao.log`,
  `nao-atualizar`, `fonte.txt`), agora no próprio `kofstation` (`crates/kof-atualiza` + `crates/kof-app/src/atualizacao.rs`)
  e **com assinatura**: o manifesto (`plataforma → caminho → {tamanho, sha256, url}`) é assinado com Ed25519 e cada
  arquivo é conferido pelo SHA-256 antes de entrar. Conferido com o `ring`, que já vinha pelo TLS (nada de crate novo).
- A chave pública mora em `crates/kof-app/chave-atualizacao.txt` e entra no executável; a privada é o secret
  `KOF_CHAVE_ATUALIZACAO` do GitHub (gerada pelo Marcelo com `node tools/manifesto.mjs chave`). Sem chave, compila e
  roda com o atualizador desligado (a página diz o motivo).
- Publicação: workflow `versao.yml` a cada envio na `main` (como o `publicado/` do antigo): Release `v<data>` marcada
  como a mais nova; o app lê `releases/latest/download/manifesto.json`. Arquivo igual ao da versão anterior não sobe de
  novo (o manifesto aponta pra Release antiga), então as Releases antigas não são apagadas.
- Troca: baixa pra `.atualizacao/` (com `pronto.json`) e só troca na próxima abertura, antes do servidor subir; o
  executável que roda muda de nome pra `.velho` (Windows deixa) e o novo é aberto na hora. Nada de Tauri updater: o
  app não é Tauri (D2) e o formato da pasta é o do antigo (D33).
- Por que não o "tem versão nova: feche e abra" do antigo só avisando: aqui ele já baixa por trás, e o aviso diz que
  vale na próxima abertura.

## D35. Rede: o `kofrede.c` do antigo por FFI e o serviço em Rust dentro do `kofstation` — **aceita** (M13, 08/11)
- O núcleo do protocolo (`kofrede.c` + Monocypher) entra **sem mudar um byte** (`third_party/kofrede`, SHA-256 no
  LEIA-ME de lá), compilado pelo `cc` no `crates/kof-net` e chamado por FFI (o `unsafe` fica todo em `ffi.rs`). É o
  mesmo código da `libkofrede.so` do APK atual: o pareamento é igual byte a byte, sem reescrever cripto.
- O serviço (`kofservico.c`, 773 linhas) virou Rust (`servico.rs`) com o mesmo comportamento e a **mesma API JSON**;
  a prova é rodar os testes do próprio antigo contra ele (`rede/teste/servicos.cjs` e `celular.cjs`, com o `Rede.java`
  do APK) e o novo contra o `kofservico` antigo nos dois sentidos (`tools/testar-rede.mjs`, no CI).
- Abre junto com o `kofstation` (como o kofservico abria com o lançador), nas portas do antigo (TCP/UDP 8650, TCP pula
  até +9 se ocupada). A página fala por uma WebSocket local em porta qualquer, com token e só a origem da página
  (`rede.ligar`), em vez da 8644 fixa e sem senha do antigo.
- Dados em `<pasta de dados>/rede` (`identidade.bin`, `pareados.txt`, `config.txt`, o formato do antigo), separados
  do antigo (`KOFnes/rede`): o celular pareia de novo com o PC novo. Os dois abertos juntos disputam a 8650.

## D36. PS2: o LRPS2 já compilado do antigo, OpenGL sem janela no processo do jogo, imagem pela página — **aceita** (08/11)
- O núcleo é o `pcsx2_libretro` que o antigo publica (commit 38d3a83f, o mesmo que o Marcelo já jogou), baixado pelo
  manifesto e conferido por SHA-256: nada de compilar o PCSX2 (20–30 min por plataforma). Fica na pasta `nativo/`.
- O `kof-nativo` dá ao núcleo um contexto OpenGL sem janela (`gl.rs`: EGL no Linux, com a tela do usuário ou sem
  nenhuma; WGL com uma janela escondida no Windows), um framebuffer no tamanho máximo e lê a imagem de volta com três
  buffers em rodízio e cerca (a placa nunca espera a CPU; no máximo 2 quadros de atraso). Não usa o `kofnativo.c`
  (SDL2) do antigo: um processo nativo só pra manter, e o DVD lido direto do disco (o antigo lia pela página).
- A imagem vai pra página como a do PS1 nativo (filtros e molduras iguais). Na resolução nativa (640×448) são ~70 MB/s
  dentro do PC. Se o Marcelo precisar de resolução aumentada ou os números mostrarem gargalo na cópia, entra o "modo
  direto" (janela nativa sem cópia, P.7).
- Opções iniciais como o antigo: renderer OpenGL e `pcsx2_ee_cycle_skip = Mild Underclock` (60 fps no Shadow of the
  Colossus no Ryzen 5 4600H). Pra comparar com o PCSX2 sozinho, ele pode desligar pela opção do núcleo.

## D37. Medir antes de otimizar: medidor por quadro, modo diagnóstico e opções de emulação no meio da migração — **aceita** (Marcelo, 08/11)
- Depois do primeiro teste do PS2 ("relativamente bem, umas engasgadas"), o Marcelo pôs o M16 antes do M14: medição
  quadro a quadro com o culpado de cada engasgo, um modo diagnóstico que grava a sessão pra ele mandar, e opções de
  emulação por console com perfis. Vale pra todos os emuladores.
- Desenho no [DIAGNOSTICO.md](DIAGNOSTICO.md), seguindo o que PCSX2 e DuckStation fazem (histórico circular, CPU por
  linha, intervalo de 0,5–1 s) mais o que eles não têm (percentis, cada engasgo com momento e culpado, arquivo).
- Estatística pura no `domain` (testável sem emulador); medição no processo/Worker; gravação pelo Rust com comandos
  com nome (`diag.*`); nada de ROM nem caminho completo no relatório.
