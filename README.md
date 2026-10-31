# KOFstation

The best emulator ever, and I'm not kidding.

Central de jogos retrô para **Linux e Windows** (e Android, mais pra frente): biblioteca, temas, filtros de imagem,
jukebox, saves, rebobinar, o celular como controle. Os emuladores são núcleos **libretro** consagrados; o KOFstation é a
camada de experiência em volta deles.

> **Este repositório é a arquitetura nova, em construção.** O app que funciona hoje, completo, está em
> [Marcelao98/kofstation-old](https://github.com/Marcelao98/kofstation-old) e continua sendo o produto até a troca.
> A migração anda em etapas com paridade total: nada do antigo pode se perder ([docs/PARIDADE.md](docs/PARIDADE.md)).

**Onde estamos (31/10/2026):** etapa **M2 pronta** — o app novo já roda jogo (SNES, NES, Game Boy/Color, GBA, Mega Drive,
Master System, Game Gear) com a mesma imagem e o mesmo som do antigo, quadro a quadro. Ainda sem biblioteca e sem
saves. Detalhe de cada etapa: [docs/ROADMAP.md](docs/ROADMAP.md). O que aconteceu em cada sessão:
[docs/JORNAL.md](docs/JORNAL.md).

---

## A arquitetura hoje

### Visão geral: um executável, um navegador, um motor

```mermaid
flowchart LR
  subgraph PC["Computador (Linux ou Windows)"]
    APP["kofstation (Rust)<br/>crates/kof-app<br/>um executável só"]
    NAV["Chrome / Chromium / Edge / Brave<br/>em modo app (sem barra)<br/>perfil próprio do KOFstation"]
    LOG[("~/.local/share/KOFstation<br/>logs/")]
  end
  APP -- "abre e fecha junto" --> NAV
  NAV -- "http://127.0.0.1:porta<br/>página + /api com token" --> APP
  APP --> LOG
```

O `kofstation` leva **o app web inteiro e os núcleos dentro dele**. Ao abrir, ele sobe um servidor só em `127.0.0.1`
(porta aleatória, token aleatório, conferência de origem, cabeçalhos COOP/COEP) e abre o navegador da pessoa em modo
app. Fechou a janela, ele fecha. Por que assim e não Tauri/Electron: [docs/SPIKE_D2.md](docs/SPIKE_D2.md) e a decisão
D2 em [docs/DECISIONS.md](docs/DECISIONS.md).

### Camadas (quem pode falar com quem)

```mermaid
flowchart TB
  subgraph DESK["apps/desktop — React + TypeScript"]
    SC["screens/ — Início, Guia, Temas, Pendente…"]
    CO["components/ — Menu, Lateral, MenuRapido, Aviso, Status, Desempenho"]
    HK["hooks/ — tela do jogo, entrada, pausa, navegação por controle"]
    ST["stores/ (Zustand) — telas, prefs, jogo, avisos, showcase"]
    PL["platform/ — local (kofstation) · teste (memória)"]
  end
  subgraph PKG["packages/ — TypeScript sem React"]
    AC["app-core — casos de uso: obterInfo, lerArquivoDeJogo, observarControle, erros"]
    DO["domain — puro: sistemas, temas, frases, controle virtual, zip"]
    EN["engine — SessaoLibretro, Worker, anel de som, AudioWorklet, WebGL, escala"]
    CT["contracts — tipos e exemplos do contrato com o Rust"]
  end
  subgraph RS["crates/ — Rust"]
    KA["kof-app — servidor local + abre o navegador"]
    KC["kof-core — app.info, erros com código, log em arquivo"]
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
  KA --> KC
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
| Biblioteca e pasta Kof Games | ⬜ M3 |
| Configurações em arquivo e backup `.kofsave` | ⬜ M4 |
| Saves, estados, modos de jogo, rebobinar | ⬜ M5–M6 |
| Painel de imagem, filtros, molduras | ⬜ M7 |
| Controles configuráveis, jogadores 2–4 | ⬜ M8 |
| Jukebox e música, estatísticas, patches, caçador de bugs | ⬜ M9–M10 |
| PS1, N64, Neo Geo, PS2 | ⬜ M11–M12 |
| Rede e celular, pacotes e atualização, Android | ⬜ M13–M15 |

---

## Rodar

Só testar (sem compilar nada; o `git` pede o login do GitHub se o repositório for privado):

```bash
git clone --depth 1 -b teste-binarios https://github.com/Marcelao98/KOFstation ~/Downloads/kofstation-teste && chmod +x ~/Downloads/kofstation-teste/kofstation && ~/Downloads/kofstation-teste/kofstation
```

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
