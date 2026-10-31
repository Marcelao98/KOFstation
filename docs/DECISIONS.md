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

## D2. Casca desktop: Tauri 2 × Rust local + Chromium — **pendente (spike F4b)**
- **Contexto:** Windows usa WebView2 (Chromium, o motor de hoje). Linux usa WebKitGTK, que precisa provar wasm pesado,
  WebGL com passadas, Gamepad, AudioWorklet, WebRTC e SharedArrayBuffer. Linux tem prioridade igual (D0).
- **Decisão:** decidir pelos 7 critérios do [PLANO_DETALHADO §5](auditoria/PLANO_DETALHADO.md#5-spike-do-tauri-no-linux-f4b-critérios-objetivos).
  Falhou qualquer um no Linux → opção B (backend Rust serve o app num endereço local com token e abre o Chromium em
  modo app).
- **Consequências:** os crates de backend não podem depender do Tauri; a casca é uma camada fina e trocável.
- **Alternativas:** Electron (motor igual em tudo, +~100 MB e um Node que não usamos); continuar com `file://` (não).

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
