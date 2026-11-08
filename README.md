# KOFstation

The best emulator ever, and I'm not kidding.

Central de jogos retrô para **Linux e Windows** (e Android, mais pra frente): biblioteca, temas, filtros de imagem,
jukebox, saves, rebobinar, o celular como controle. Os emuladores são núcleos **libretro** consagrados; o KOFstation é a
camada de experiência em volta deles.

> **Este repositório é a arquitetura nova, em construção.** O app que funciona hoje, completo, está em
> [Marcelao98/kofstation-old](https://github.com/Marcelao98/kofstation-old) e continua sendo o produto até a troca.
> A migração anda em etapas com paridade total: nada do antigo pode se perder ([docs/PARIDADE.md](docs/PARIDADE.md)).

**Onde estamos:** o retrato pra ler em 5 minutos está em [docs/SITUACAO.md](docs/SITUACAO.md). Resumo (03/11/2026): M11b feito até o N.8 (PS1 nativo padrão, jukebox do SNES com Ondas/Notas, N64
desenhando), esperando o Marcelo testar; o PS2 nativo (N.9) é o próximo. Antes: M3 a M8 aprovados pelo Marcelo; **M9 a M11 feitos**, esperando ele testar — jukebox
(F7, ondas, notas, .spc, .wav, trilha do KOFstation, música do Início), abertura da 1ª vez, estatísticas, espaço usado,
traduções (IPS/BPS/UPS), caçador de bugs (F9) e a tela de BIOS. Roda SNES, NES, Game Boy/Color, GBA, Mega Drive, Master
System, Game Gear, **Neo Geo, PlayStation e Nintendo 64**. Detalhe de cada etapa: [docs/ROADMAP.md](docs/ROADMAP.md). O que aconteceu em cada sessão:
[docs/JORNAL.md](docs/JORNAL.md).

---

## A arquitetura hoje

### Visão geral: um executável, um navegador, um motor

```mermaid
flowchart LR
  subgraph PC["Computador (Linux ou Windows)"]
    APP["kofstation (Rust)<br/>crates/kof-app<br/>um executável só"]
    NAV["Chrome / Chromium / Edge / Brave<br/>em modo app (sem barra)<br/>perfil próprio do KOFstation"]
    DADOS[("~/.local/share/KOFstation<br/>config/ · lojas/ · cache/ · logs/")]
    KG[("Kof Games<br/>Games/&lt;console&gt; · Novos · Config · Saves")]
  end
  APP -- "abre e fecha junto" --> NAV
  NAV -- "http://127.0.0.1:porta<br/>página + /api com token<br/>(JSON ou binário)" --> APP
  APP --> DADOS
  APP -- "varre, organiza, lê ROM" --> KG
```

O `kofstation` leva **o app web inteiro e os núcleos dentro dele**. Ao abrir, ele sobe um servidor só em `127.0.0.1`
(porta aleatória, token aleatório, conferência de origem, cabeçalhos COOP/COEP) e abre o navegador da pessoa em modo
app. Fechou a janela, ele fecha. Por que assim e não Tauri/Electron: [docs/SPIKE_D2.md](docs/SPIKE_D2.md) e a decisão
D2 em [docs/DECISIONS.md](docs/DECISIONS.md).

### Camadas (quem pode falar com quem)

```mermaid
flowchart TB
  subgraph DESK["apps/desktop — React + TypeScript"]
    SC["screens/ — Início, Biblioteca, Estados, Jukebox, Estatísticas, BIOS, Bug, Abertura, Modo, Visual, Molduras, Teclas, Jogadores, Backup, Guia, Temas…"]
    CO["components/ — Menu, Lateral, MenuRapido, Aviso, Status, Desempenho"]
    HK["hooks/ — tela do jogo (filtros e moldura), entrada dos 4 jogadores, pausa, navegação por controle"]
    ST["stores/ (Zustand) — telas, config, jogo, biblioteca, capas, bateria, estados, auto, modo, rebob, visual, painel, moldura, entrada, jogadores, backup, jukebox, estatísticas, bios, bug, tradução, abertura…"]
    PL["platform/ — local (kofstation) · teste (memória, imita os comandos do Rust)"]
  end
  subgraph PKG["packages/ — TypeScript sem React"]
    AC["app-core — casos de uso: Kof Games, jogos (zip, Neo Geo, CD do PS1), armazém, config, saves/bateria, estados, backup, capas, base de jogos, músicas, estatísticas, BIOS, traduções, log"]
    DO["domain — puro: sistemas, detecção e CRC, busca e facetas, organizar, guarda (.kofsave), modos, entrada em camadas, jogadores, patches IPS/BPS/UPS, BIOS"]
    EN["engine — SessaoLibretro, Worker do jogo (bateria, estados, rebobinar, caçador de bugs; N64 com WebGL2 no Worker), Worker da jukebox (sonda, .spc, .wav, trilha FM, violino), som, RenderizadorVisual, molduras"]
    CT["contracts — tipos e exemplos do contrato com o Rust"]
  end
  subgraph RS["crates/ — Rust"]
    KA["kof-app — servidor local (uma linha por pedido) + api.rs (os comandos) + abre o navegador"]
    KF["kof-files — escopos, Kof Games, varredura, CRC, organizar, lojas, config, capas"]
    KC["kof-core — app.info, erros com código, log em arquivo (inclusive o da tela)"]
    KN["kof-nativo — núcleo libretro nativo num processo filho (kofstation --nativo): som pela placa, OpenGL sem janela pro PS2, imagem e botões por WebSocket local com token"]
    KU["kof-atualiza — atualizador: manifesto assinado (Ed25519), baixa só o que mudou, troca na próxima abertura"]
    KR["kof-net — rede entre aparelhos: kofrede.c do antigo (FFI) + o serviço do kofservico em Rust (UDP/TCP 8650), mesmo protocolo do APK; WebSocket da página com token"]
  end
  NU[("núcleos libretro do kofstation-old<br/>third_party/cores/manifest.json (SHA-256)")]

  SC --> AC
  SC --> ST
  CO --> ST
  HK --> EN
  ST --> AC
  ST --> EN
  AC --> DO
  AC --> EN
  AC --> CT
  PL -->|"HTTP + token"| KA
  KA --> KF
  KA --> KC
  KF --> KC
  KA -->|"abre e vigia o processo filho"| KN
  KN --> KC
  KA --> KU
  KA -->|"abre junto (linhas próprias)"| KR
  PL -.->|"WebSocket 127.0.0.1 + token (M13)"| KR
  KR <-.->|"TCP/UDP 8650, cifrado (rede de casa)"| CEL(["celular (APK) ou outro PC"])
  PL -.->|"WebSocket 127.0.0.1 + token (N.3)"| KN
  EN --> NU
```

Regras conferidas por lint (`eslint.config.js`): `domain` não importa nada do projeto; `engine` não usa React;
`screens/` e `components/` não falam com a `engine` nem com o backend direto. Detalhes:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/FRONTEND.md](docs/FRONTEND.md).

### Como um jogo roda

```mermaid
sequenceDiagram
  actor P as Pessoa
  participant T as Tela (React)
  participant J as Jogo (engine, página)
  participant W as Worker do núcleo
  participant S as AudioWorklet
  P->>T: Ctrl+O / arrasta a ROM (ou .zip)
  T->>T: app-core lerArquivoDeJogo → sistema + ROM
  T->>J: Jogo.abrir(sistema, ROM)
  J->>W: iniciar (carrega o núcleo /nucleos/#lt;núcleo#gt;.js)
  W-->>J: pronto (tamanho, fps, taxa do som)
  loop enquanto não está pausado
    S->>W: consome o som do anel (memória compartilhada)
    W->>W: mantém ~60 ms de som: roda quadros (botões → libretro)
    W-->>J: último quadro (RGBA)
    J->>T: WebGL desenha no ritmo do monitor
  end
```

O **som dita o ritmo** (decisão D22): o núcleo roda num Web Worker e o AudioWorklet consome no relógio da placa de som.
Medido: 60 fps e nenhuma falta de som, também com a CPU limitada a 4×. O adaptador do núcleo (`SessaoLibretro`) dá
**a mesma imagem e o mesmo som que o adaptador do app antigo**, quadro a quadro (`packages/engine/test/paridade.test.ts`).

### O que já existe e o que falta

| Parte | Estado |
|---|---|
| Casca: menus, barra lateral, Início, Guia, 126 temas, showcase, Voltar, atalhos, navegação por controle | ✅ M1 |
| Jogo: núcleo no Worker, som, imagem com escala/proporção, teclado e controle, pausa, turbo, volume, menu rápido, painel F3, abrir arquivo/.zip/arrastar | ✅ M2 |
| Biblioteca (busca, facetas, base de jogos, capas, sofá) e pasta Kof Games (organizar com plano) | ✅ M3 |
| Configurações em arquivo (camadas geral → console → jogo) e backup `.kofsave` (abre nos dois apps) | ✅ M4 |
| Save de bateria, estados (abrem nos dois apps), salvar automático, Continuar, modos de jogo | ✅ M5 |
| Rebobinar (no Worker, igual ao antigo) | ✅ M6 |
| Painel de imagem (os mesmos pixels do antigo), passadas, molduras, paletas | ✅ M7 |
| Controles e teclas por console/jogo, analógico no teclado, jogadores 2–4 | ✅ M8 |
| Jukebox e música (trilha FM, violino, .spc, .wav), abertura, música do Início | ⏸ M9 (falta o Marcelo testar) |
| Estatísticas, espaço usado, traduções, caçador de bugs (F9) e replay | ⏸ M10 |
| BIOS, GBA com BIOS, Neo Geo, PS1, N64 (núcleo do SNES: Snes9x; o Kof quando a Mel liberar) | ⏸ M11 |
| PS1 nativo (PCSX-ReARMed com recompilador, processo à parte, som pela placa, imagem pela página), jukebox do SNES com Ondas/Notas, N64 conferido | ⏸ M11b (N.1–N.8; falta o Marcelo testar) |
| PS2 nativo (LRPS2 do antigo, OpenGL sem janela no processo do jogo, DVD lido do disco) | ⏸ M12/N.9 (falta o Marcelo jogar) |
| Atualizador assinado (liga com a chave), pacote do Linux (`--instalar`), instalador do Windows, lado a lado com o antigo | ⏸ M15 (falta a chave e o Marcelo instalar) |
| Rede entre aparelhos (📡 Aparelhos, QR e código, pareia com o APK atual), celular como controle (rede e servidor do APK), 🖥 Jogar no PC (WebRTC), Levar pro celular | ⏸ M13 (falta o Marcelo testar com o celular) |
| Android (o APK servindo o app novo) | ⬜ M14 |

---

## Rodar

Só testar (sem compilar nada): a pasta `KOFstation` (o executável, `nucleos/`, `nativo/` e `versao.txt`, igual ao app
antigo) vai pra `~/Programas/Kof Games/` (a pasta de cima vira a Kof Games):

```bash
mkdir -p ~/Programas/"Kof Games" && curl -fL https://raw.githubusercontent.com/Marcelao98/KOFstation/teste-binarios/KOFstation-linux.tar.gz | tar -xz -C ~/Programas/"Kof Games" && ~/Programas/"Kof Games"/KOFstation/kofstation
```

No Windows: `KOFstation-windows.zip` da mesma branch, descompactado dentro da pasta Kof Games.

Pelo código (precisa de Node 22+, Rust pelo rustup e um navegador Chromium; detalhes em
[docs/INSTALAR.md](docs/INSTALAR.md)):

```bash
sh rodar.sh
```

Desenvolvimento:

| Comando | O que faz |
|---|---|
| `pnpm install` | dependências (versões travadas no `pnpm-lock.yaml`) |
| `pnpm nucleos` | baixa os núcleos do kofstation-old e confere o SHA-256 |
| `pnpm dev` | o app no navegador, com o backend de teste (sem Rust) |
| `pnpm check` | formato, lint, tipos e testes do TypeScript |
| `pnpm check:rust` | formato, clippy e testes do Rust |
| `pnpm e2e` | testes de fluxo no Chromium (Playwright) |
| `pnpm build && cargo build --release -p kof-app` | gera o executável `target/release/kofstation` |

O CI (GitHub Actions) roda tudo isso no Linux e no Windows a cada envio.

## Documentação

Mapa completo em [docs/README.md](docs/README.md). Pra quem chega agora: este README → [docs/JORNAL.md](docs/JORNAL.md)
(a última entrada) → [docs/ROADMAP.md](docs/ROADMAP.md). Agentes de IA: [AGENTS.md](AGENTS.md).

## Licença

GPL-3.0 ([LICENSE](LICENSE)). Terceiros, inclusive os núcleos que só podem ser usados sem fins comerciais:
[THIRD_PARTY.md](THIRD_PARTY.md). Nenhuma ROM, BIOS ou jogo é distribuído, nem indicado onde baixar.
