# Roadmap do KOFstation (passo a passo, com entregável e checkpoint em cada passo)

> Estado: ⬜ não começou · 🟨 em andamento · ⏸ esperando o Marcelo · ✅ pronto.
> Cada passo tem um **entregável** (o que existe quando ele acaba) e termina num **checkpoint**: paro, mostro e espero
> o "segue" (ou ele aprova vários de uma vez). A coluna **Tarefa** diz quem faz (ver "Divisão de tarefas").

## A migração está completa ✅ (17/11/2026)

O KOFstation novo substituiu o antigo (`kofstation-old`): **todos os consoles** (NES, SNES, Game Boy/Color/Advance,
Mega Drive, Master System, Game Gear, Neo Geo, PS1, N64 e PS2), biblioteca, saves e estados, rebobinar, filtros e
molduras, controles, jukebox, estatísticas, rede entre aparelhos, o celular como controle e "jogar no PC", pacotes de
Linux e Windows com atualizador, e o APK do celular com PS1/N64 nativos. Tudo em React + TypeScript + Rust, em camadas,
com testes e CI no Linux e no Windows. O Marcelo decidiu (D38) que **o novo é o produto**; o antigo virou arquivo (o
repositório fica: o novo ainda baixa de lá os núcleos e as `.so` do celular). O roadmap da migração, etapa por etapa,
está guardado em [ROADMAP-MIGRACAO.md](ROADMAP-MIGRACAO.md).

## A regra de agora: melhorar o que temos antes de crescer

**Nenhum emulador novo antes de os que já temos estarem lisos, sem defeito e bonitos.** Cada melhoria é medida (antes
× depois, com número) e documentada; o que não melhora o número sai. O PS2 vem primeiro porque é o mais pesado e o que
o Marcelo mais sente; o mesmo método depois passa por todos os consoles.

```mermaid
flowchart LR
  F0["0 · Conferir no uso<br/>(os ⏸ da migração)"]
  F1["1 · Régua de medição<br/>(banco automático + PCSX2)"]
  F2["2 · PS2 sem defeito<br/>(cartão, D-pad, memória)"]
  F3["3 · PS2 liso<br/>(engasgos, RAM, janela própria)"]
  F4["4 · Opções completas<br/>(tudo no menu, ✨ Bonito)"]
  F5["5 · Gráficos melhores<br/>(núcleo + filtros da tela)"]
  F6["6 · Todos os consoles lisos<br/>(PS1, N64, wasm)"]
  F7["7 · Celular afinado"]
  F8["8 · Casa própria<br/>(main, atualizador, T.2)"]
  F9["9 · Só então: emuladores novos"]
  F1 --> F2 --> F3 --> F4 --> F5 --> F6 --> F7 --> F9
  F0 -.-> F6
  F8 -.-> F9
```

A fase 0 corre em paralelo (é o Marcelo usando no dia a dia). A fase 8 pode andar a qualquer momento: só depende de
decisões dele.

## Como cada passo é feito

1. **Medir antes** com a régua (fase 1): o número que o passo quer mudar e os que ele não pode piorar.
2. **Uma mudança por vez**, na camada certa (`domain` puro, `engine` sem React, telas pelo `app-core`, Rust com comandos
   com nome), com teste junto.
3. **Medir depois**, nas mesmas condições, 3 rodadas. Ficou melhor que a variação entre rodadas? Fica. Senão, sai.
4. **Anotar** no diário da fase (`docs/PS2-LISO.md` pro PS2; um por console quando chegar a vez) e no JORNAL.
5. `pnpm check`, `pnpm check:rust`, `pnpm e2e` quando tocar em tela/jogo; CI verde no Linux e no Windows.
6. **Checkpoint**: print/números pro Marcelo; ele joga quando é coisa que só o olho dele confirma.

Quem faz: o que precisa de placa de vídeo, BIOS e jogos de verdade roda **no PC do Marcelo** (Claude Code local, tarefas
em [agentes/](agentes/LEIA-ME.md)); revisão, junção e o que não precisa de jogo de verdade, na nuvem. **Nunca** nome
de jogo, ROM, BIOS ou caminho pessoal no repositório (os jogos de teste são "jogo pesado A/B/C").

---

## Divisão de tarefas

> Como na migração: um agente **orquestrador** (na nuvem: este roadmap, as decisões, revisar e juntar as branches,
> JORNAL/SITUACAO, os pacotes da `teste-binarios`) e agentes com **uma tarefa cada**, descrita em
> `docs/agentes/<letra>-<nome>.md`. Regras pra quem faz tarefa: [agentes/LEIA-ME.md](agentes/LEIA-ME.md).
> **Local** = Claude Code no PC do Marcelo (placa de vídeo, BIOS, jogos de verdade). **Nuvem** = sem jogo de verdade.

| Tarefa | O quê | Onde | Branch | Depende de | Fases | Estado |
|---|---|---|---|---|---|---|
| **F** | [Jogo pesado A liso hoje](agentes/F-ps2-liso-hoje.md): experimentos curtos que apontam o culpado dos engasgos + cartão de memória | local | `agente-d/ps2-liso` | — | 2, 3 (atalho) | ✅ junta em 18/11 (`d2b1d8d`): "liso liso" |
| **D** | [PS2 liso como o PCSX2](agentes/D-ps2-liso.md): régua de medição, tabela de diferenças, um passo por vez | local | `agente-d/ps2-liso` | F | 1, 3 | sem pressa (o PS2 já está liso pro Marcelo) |
| **E** | [Cartão, opções completas e gráficos](agentes/E-ps2-cartao-e-opcoes.md) | local | `agente-d/ps2-liso` | F (parte 1), D (perfis) | 2, 4, 5 | partes 1–2 feitas na F; parte 3 (gráficos) adiada |
| **R** | [Rebobinar no PS1 e N64 com a música voltando junto](agentes/R-rebobinar.md) (fase R inteira) | local | `agente-r/rebobinar` | — | R | ⏸ feita, esperando ele ouvir/jogar |
| **G** | Todos os consoles lisos (o método das fases 1–3 no PS1, N64 e WebAssembly) | local + nuvem | a definir | D | 6 | a escrever |
| **H** | Celular afinado | local (aparelho) | a definir | 0.2 | 7 | a escrever |
| **O** | Orquestrador: revisar e juntar, pacotes, docs, fase 8 | nuvem | `claude/busy-ritchie-wrvk8h` | — | 0, 8 | contínua |

Arquivos quentes (uma tarefa por vez): `crates/kof-nativo/src/{nucleo,filho,canal}.rs`, `packages/engine/src/nativo.ts`,
`apps/desktop/src/stores/jogo.ts`, `packages/contracts/*`. F, D e E mexem neles: por isso rodam **em sequência, na mesma
branch**, não em paralelo.

---

> **18/11 (Marcelo):** "pra mim está bem otimizado, de verdade; meu PC não é o melhor, não preciso me preocupar com
> melhorar mais gráficos". O PS2 roda liso no jogo pesado A. **O que sobra das fases 1, 3, 4 e 5 fica sem pressa**
> (anotado, não esquecido): só volta se ele sentir engasgo, quiser o jogo pesado B, ou trocar de PC. O foco passa pra
> fase 0 (conferir no uso), 8 (casa própria) e, quando ele quiser, 6 e 7.

> **18/11 (Marcelo):** "já testei tudo, exceto o Windows; pode juntar tudo". A branch de trabalho vai pra `main` (8.1)
> e o próximo passo é **funcionalidade nova** (ver "Próximas funcionalidades" no fim), com a regra de sempre: medir, uma
> coisa por vez, sem quebrar o que já roda liso.

## Fase 0 · Conferir no uso (os ⏸ que sobraram da migração)

O passo a passo de cada um está em "Pra você testar" do [SITUACAO.md](SITUACAO.md). Bug achado aqui entra como passo
na fase que cuida do assunto (ou na hora, se for grave).

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 0.1 | Rede, atalhos no Início e no ☰, "jogar no PC" | atalhos (feito 16/11) | ele usa e opina | O | ✅ testado pelo Marcelo (18/11) |
| 0.2 | APK: PS1/N64 nativos, pasta de ROMs, controle por console, atualizador | APK da `teste-binarios` | ele usa no celular | O | ✅ testado pelo Marcelo (18/11) |
| 0.3 | Neo Geo, N64, jukebox, estatísticas, tradução, caçador de bugs | pacote atual | ele usa | O | ✅ testado pelo Marcelo (18/11) |
| 0.4 | Instalar no Windows | `KOFstation-instalar.exe` | alguém com Windows instala e abre | O | ⏸ ele vai pedir pra alguém com Windows |

## Fase 1 · A régua de medição

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 1.1 | Banco automático | `tools/medir-ps2.mjs`: abre o jogo, carrega um estado, aperta uma sequência fixa e imprime fps, p50/p95/p99, engasgos/min, quadros repetidos, CPU por linha, buracos de som | 3 rodadas iguais dão números próximos | D | ✅ 17/11 (`--teclas --mexer --sonda-leve --perfil --opcao --fechar-janela`; falta o vídeo e os buracos de som) |
| 1.2 | Memória × engasgos | memória por processo (jogo, Chromium, `kofstation`), livre/swap e o momento de cada engasgo, no mesmo gráfico | gráfico do jogo pesado A | F → D | ⬜ |
| 1.3 | O que o olho vê | vídeo da janela + contagem de quadros repetidos | o número bate com o que ele sente | D | ⬜ |
| 1.4 | A régua | tabela PCSX2 · antigo · novo no mesmo trecho, em `docs/PS2-LISO.md` | ele vê a tabela | D | ⬜ |

## Fase 2 · PS2 sem defeito

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 2.1 | Cartão de memória | o jogo salva no cartão, fecha, reabre e carrega; teste automático em `kof-nativo/tests` | ele salva no jogo pesado A | F (E parte 1) | ✅ 17/11 (o app fecha o jogo antes de sair; teste `ps2_de_verdade`) |
| 2.2 | O "pra baixo" no menu de salvar | D-pad e analógico corretos no PS2 | o menu desce com teclado e controle | F (E parte 1) | ✅ 17/11 (o direcional é T F G H; controles ficam como estão, decisão do Marcelo) |
| 2.3 | Jogo pesado B sem erro de memória | o motivo achado (log do sistema) e corrigido | ele joga 10 min | D | ✅ 19/11: reproduzido (OOM do kernel matou o Chrome do app em ~10 min); causa: a fila de quadros da página só cortava no requestAnimationFrame, que o Chrome para com a janela escondida/coberta (renderer 290 → 4.787 MB em 3 min); agora corta ao entrar (232–309 MB estável em 5 min); ⏸ ele joga 10 min |

## Fase 3 · PS2 liso

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 3.1 | Os engasgos esporádicos | cada suspeito (salvar automático, bateria a cada 1 s, lixo de quadros, shader na 1ª vez, swap) medido e corrigido ou descartado | números antes × depois | **F** | ✅ 17/11 (F5/F8 de ~2,2 s → ~0,6 s; o Marcelo jogou liso) |
| 3.2 | Menos RAM | filas menores, quadro no tamanho da tela, estado e bateria pelo Rust, Chromium enxuto | memória total antes × depois | F → D | 🟨 19/11: ✅ Chrome enxuto (`104b0fe`, Chrome inteiro 1.850–1.980 → 1.653–1.724 MB); ✅ estado pelo Rust (o processo monta o pacote da loja numa linha separada; F5 750→300 ms, F8 680→290 ms, Chrome com F5 1,9–2,0 GB → 1,45 GB). Falta: o quadro menor na placa (a página ainda recebe 1,1 MB por quadro) |
| 3.3 | Diferenças do PCSX2 | tabela "PCSX2 × nós" com o custo de cada diferença | tabela no diário | D | ⬜ |
| 3.4 | Janela própria pro PS2 | o jogo desenha direto na placa (opção experimental primeiro), X11 e Wayland, F3/menu/print funcionando | desenho aprovado antes; p99 igual ao PCSX2 | F/D | ❌ descartada 19/11: não dá pra ficar igual (menu, F3, avisos, ⏺ e molduras animadas são página; Wayland não posiciona janela), e ele só queria se ficasse igual |
| 3.5 | Ritmo e linhas | laço pelo relógio, MTVU, prioridade, se a medição pedir | número antes × depois | D | ⬜ |
| 3.6 | **Liso como o PCSX2** | os dois jogos pesados, 10 min cada, sem engasgo | ⏸ ele joga e concorda | F/D | ⬜ |

## Fase 4 · Opções completas

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 4.1 | Lista do núcleo | comando que leva tudo o que o núcleo declara até a tela (Rust → contrato → `app-core`) | teste Rust + unit | E | ✅ PS2 (82, do cabeçalho) · ✅ PS1 (53, do PCSX rodando: `opcoes-ps1-declaradas.ts`, 19/11) |
| 4.2 | **Toda opção no menu** | grupos como no PCSX2 (Gráficos, Emulação, Som, Cartão, Correções, Sistema), Avançado, ⚠ nas perigosas, ⚡/↻ conferidos, "voltar ao perfil" | print com PS2 e PS1 | E | ✅ PS2 (tela própria ⚙ Opções de emulação) · ✅ PS1 (19/11: as 36 que faltavam no Avançado, em português e no grupo certo; BIOS e cartão 1 fixos pelo app) |
| 4.3 | Perfil ✨ Bonito | o 4º perfil + os valores de todos os perfis decididos com a régua | tabela no diário | E | ✅ 19/11: medido peça por peça no jogo pesado A (PS2-LISO.md); o culpado era a transparência Alta junto da 2x: no Bonito vira Básica (133 → 39–60 engasgos/min, 60 fps, 0 falta de som); ⏸ ele joga no Bonito |
| 4.4 | Renderer do PS2 | OpenGL/Vulkan escolhível | medido antes de virar padrão | E | ⬜ |
| 4.5 | Tela larga e 60 fps | desligados por padrão, botão por jogo | um jogo com tela larga | E | ✅ 19/11: "Aviso de tela larga" (e as melhorias do jogo) por jogo no ⚙ Opções de emulação, desligados por padrão; a tela agora segue a proporção que o núcleo diz quando ela é larga (antes forçava 4:3) e o aviso `geometria` do nativo chega na página; jogo pesado A em 16:9 conferido por print |
| 4.6 | Os outros consoles | o mesmo menu com o que cada núcleo declarar | print de cada um | E/G | 🟨 o curado já existe (N64 12, SNES 5, GB 6, NES 5, Mega Drive 5, GBA 6); faltam as declaradas (65/43/17/47/62/17): o `opcoes-wasm.mjs` acha as descrições, mas na tabela errada (SNES em turco) ou vazias; sem o texto original não dá pra traduzir com segurança (19/11) |

## Fase 5 · Gráficos melhores (adiada pelo Marcelo, 18/11)

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 5.1 | PS2 no núcleo | correções de resolução alta, nitidez (CAS), FXAA, ajuste de cor, texturas HD se houver | print antes × depois + custo em fps | E | ⬜ |
| 5.2 | Filtros da tela (F4) | nitidez, ampliação estilo FSR/xBR, bloom melhor, pra todos os consoles | teste de pixels + print | E | ⬜ |
| 5.3 | ✨ Bonito revisto | o perfil com o que entrou | ⏸ ele aprova o visual | E | ⬜ |

## Fase 6 · Todos os consoles lisos

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 6.1 | PS1 nativo no PC | engasgos, memória e latência medidos e corrigidos | números + ele joga | G | ⬜ |
| 6.2 | N64 | idem | idem | G | ⬜ |
| 6.3 | WebAssembly (SNES, Mega Drive, GBA, Neo Geo…) | ritmo, abertura, memória da página | números | G | 🟨 ritmo ✅ 19/11 (`medir-ritmo.mjs`, 3×20 s: ~3.580 novos/min, 16–19 repetidos, 0–6 pulados, p50/p95/p99 16,67 ms); falta abertura e memória |
| 6.4 | Latência de entrada | do botão à tela, comparada com o RetroArch | tabela | G | ⬜ |
| 6.5 | Abertura | tempo até jogar (app e biblioteca grande) | número antes × depois | G | ⬜ |

## Fase 7 · Celular afinado

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 7.1 | Medir no aparelho | abertura, PS1/N64, bateria, temperatura | números do celular dele | H | ⬜ |
| 7.2 | O que a fase 0 apontar | correções | ele usa | H | ⬜ |
| 7.3 | APK sem o APK antigo | as `.so` das Releases do repositório novo | APK monta no CI sem o antigo | H | ⬜ |

## Fase 8 · Casa própria (decisões do Marcelo; anda a qualquer momento)

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| 8.1 | Juntar na `main` | PR da branch de trabalho | ele pede e aprova | O | ✅ PR Marcelao98/KOFstation#3 (18/11) |
| 8.2 | Chave do atualizador | cada envio na `main` vira versão e o app se atualiza sozinho | ⏸ ele cria a chave ("Pra você fazer" no SITUACAO) | O | ⏸ |
| 8.3 | Releases próprias | núcleos e `.so` no repositório novo; o novo para de baixar do antigo | CI sem o antigo | O | ⬜ |
| 8.4 | T.2 | a última versão do antigo avisa e leva pro novo | ele decide quando | O | ⬜ |

## Fase 9 · Só depois de tudo acima: emuladores novos

Nada decidido; cada um entra pelo mesmo caminho (manifesto com SHA-256, Linux e Windows, testes, régua):

- **PS1 com gráfico melhor** no PC (Beetle PSX HW ou SwanStation), mantendo o PCSX-ReARMed no celular ("depois", 17/11).
- Outros consoles que o Marcelo quiser (ex.: PSP, GameCube/Wii, Saturn, DS): ele escolhe a ordem.
- **Ideia do Marcelo pro Wii (17/11): o celular como Wiimote.** O giroscópio/acelerômetro do celular vira o movimento e
  a mira (ponteiro na tela), o toque vira os botões, pela rede pareada que já existe (o mesmo caminho do "celular como
  controle"). É a parte mais trabalhosa do Wii; entra junto com ele, nunca antes das fases 1–8.

---

## Onde parou (17/11, fim da tarefa F)

O Marcelo joga o jogo pesado A liso, com resolução maior, e **não quer mais otimização agora** ("rodando de boa, não
precisa otimizar tanto"). Tudo o que foi feito e o que falta está em [NUCLEO-NATIVO-PESADO.md](NUCLEO-NATIVO-PESADO.md)
(guia pro próximo núcleo pesado, ex.: GameCube/Wii) e o diário em [PS2-LISO.md](PS2-LISO.md). Fica anotado, sem
pressa, nesta ordem: ✨ Bonito peça por peça (4.3) → o "A" e o estado fora da página (3.2) → jogo pesado B (2.3) →
opções do PS1 e dos outros (4.1/4.6) → 4.4/4.5 → fase 5 → janela própria (3.4, desenho aprovado antes).

## Instrução pro Claude Code local (tarefa F, já feita)

Na pasta do repositório, no PC do Marcelo:

```bash
git fetch origin && git checkout claude/busy-ritchie-wrvk8h && git pull && git checkout -B agente-d/ps2-liso
```

E no Claude Code:

> Leia `AGENTS.md`, `docs/agentes/LEIA-ME.md`, a seção "Regras desta tarefa" de `docs/agentes/D-ps2-liso.md` e
> `docs/agentes/F-ps2-liso-hoje.md`, e faça a tarefa F (estamos na branch `agente-d/ps2-liso`). Objetivo: eu jogar o
> jogo pesado A liso hoje e conseguir salvar no cartão. BIOS: (caminho). Jogo pesado A: (caminho). Estado no trecho que
> engasga: (caminho). Estado no menu de salvar: (caminho, se tiver). Nunca escreva nome de jogo no repositório. Me
> mostre os números a cada achado e me chame pra jogar quando achar que melhorou. Antes de fazer a janela própria, me
> mostre o desenho.

## Próximas funcionalidades (a escolher com o Marcelo, 18/11)

A migração acabou e o que temos está liso: agora pode crescer. Cada item vira uma fase com entregável e checkpoint
quando ele escolher. Emulador novo continua sendo a fase 9 (ele escolhe a ordem).

Escolhidas em 18/11, nesta ordem (as fases com entregáveis entram quando ele responder as perguntas abertas):

### Fase R · Rebobinar no PS1 e no N64, com a música voltando junto (decidido 18/11)

Decidido: **a música volta invertida ao rebobinar, com efeito de transição**; **o N64 entra junto com o PS1**. O som
vale pra **todo console que rebobina** (o anel grava o som que saiu, seja qual for o chip): NES, SNES, Game Boy/Color,
GBA, Mega Drive, Master System, Game Gear, Neo Geo, e o PS1/N64 quando ganharem rebobinar. Só o PS2 fica de fora (não
rebobina). O que já existe por aí: o RetroArch inverte o som do quadro que roda depois de cada estado carregado
(`audio/audio_driver.c`, `state_manager_frame_is_reversed`), sem transição, e com buraco entre as fotos; o Mesen
(NES) toca imagem e som ao contrário desde a 0.9; o BizHawk não faz e o som fica bagunçado (issue
TASEmulators/BizHawk#3201). O nosso: o som **que realmente saiu**, contínuo, com fade, efeito de fita e crossfade ao
soltar.

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| R.1 | Contas do som | funções puras no `domain` (inverter por quadro, curva de fade, crossfade, filtro de "fita"), vetores de teste em fixture | testes amostra a amostra | nuvem | ✅ `82020f3` |
| R.2 | Som ao rebobinar nos consoles da página | anel com os últimos segundos de som no `worker.ts`, tocado ao contrário em sincronia com a imagem (2× como a imagem), fade ao começar, crossfade ao soltar; opção "Som ao rebobinar: 📼 fita / 🔇 mudo" | e2e: sai som rebobinando; ao soltar, o som é idêntico ao de quem carregou aquele estado; ⏸ ele ouve no SNES | nuvem | ✅ `4ccf8c8`; ⏸ ele ouve |
| R.3 | Rebobinar no PS1 nativo (**desligado por enquanto**, pedido dele 19/11; o PS2 nunca deveria ter ligado: ver JORNAL 19/11) | `kof-nativo/src/rebobinar.rs` (o algoritmo do `rebobinador.ts` em Rust, dentro do processo do jogo; o estado nunca passa pela página), comando liga/segura/solta | teste Rust (voltar N quadros e rodar de novo dá a mesma imagem) + medido com × sem gravar | local | ✅ `85ebed7` (foto ~1,1 ms); ⏸ ele rebobina |
| R.4 | Rebobinar no N64 | o mesmo, com o estado de ~16 MB (fotos mais espaçadas se a medição pedir) | idem | local | ✅ no Worker (no PC o N64 é wasm): foto a cada 6 quadros, ~12 ms cada; ⏸ ele joga |
| R.5 | Som ao rebobinar no PS1/N64 | o anel e as contas do R.1 no `rebobinar.rs` (mesmos vetores de teste) | ⏸ ele ouve no PS1 e no N64 | local | ✅ junto com o R.3 (N64: o do Worker); ⏸ ele ouve |

### Fase G · Gravar o jogo (pedido 18/11)

Decidido com o Marcelo (18/11): grava **como ele vê** (moldura + tela com o filtro do F4, não o jogo puro) e o modo
**liga/desliga** vem primeiro. O vídeo é montado na página (o canvas do `RenderizadorVisual` + o desenho da moldura,
num canvas próprio, a cada quadro do monitor), gravado pelo `MediaRecorder` do navegador (MP4 H.264+AAC quando dá,
senão WebM) e vai em pedaços de 1 s direto pro disco, em `<Kof Games>/Gravações/` (não fica inteiro na memória).

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| G.1 | Gravar liga/desliga | F10, menu rápido e menu Emulação; selo ⏺ com o relógio (clicar para); `domain/gravacao.ts` (formato, nome, tamanho até 1080p), `engine/gravador.ts`, `app-core/gravacao.ts` (pedaços em ordem), `gravacao.parte`/`gravacao.fim` no Rust (`kof-files/gravacoes.rs`); som dos consoles da página (antes do volume: grava cheio mesmo no mudo); jogo fechou = salva | e2e `gravar.spec.ts` (vídeo abre, 1080p, com som; sem pasta = erro e para); ⏸ ele grava um jogo e assiste | local | ✅ `2635305`; aprovado por ele (18/11, gravou e funcionou) |
| G.2 | Som do PS1/PS2 nativos na gravação | comando `somPraPagina` e mensagem `SOM` no protocolo nativo (fixture dos dois lados); o `filho.rs` manda uma cópia do que toca na placa (antes do volume) só enquanto grava; `JogoNativo.somPraGravar()` toca num AudioContext na taxa do núcleo ligado só ao gravador | `pnpm check`, `check:rust` (contrato), e2e `gravar.spec.ts`; ⏸ ele grava um jogo de PS1 e um de PS2 | local | 🟨 código escrito 19/11 **sem compilar nem testar** (ele estava jogando): falta rodar os testes e ele gravar |
| G.3 | "Salvar os últimos 30 s" | o app guarda sempre o último trecho (memória limitada) e um atalho salva o que já passou | medir o custo de gravar sempre (F3) antes de ligar por padrão | local | ⬜ (opcional, ele escolhe) |

Em aberto: o custo de gravar num jogo pesado (montar 1080p a cada quadro + codificar) não foi medido num jogo de
verdade; medir com o F3 no G.1 (com × sem gravar) quando ele liberar a máquina. A moldura animada sai parada no vídeo.

1. **Rebobinar no PS1 nativo.** Dentro do processo do jogo, em Rust (`kof-nativo/src/rebobinar.rs`, o mesmo algoritmo
   do `engine/rebobinador.ts`: estado inteiro mais novo + só os pedaços de 16 KB que mudaram). O estado nunca passa
   pela página. Medido com `tools/medir-ps2.mjs` (com × sem gravar) antes de ligar por padrão. Risco: a foto com as
   linhas de vídeo e som do PCSX paradas. *Aberto: o N64 (estado ~16 MB) entra junto?*
2. **Rebobinar com a música voltando junto.** Anel com os últimos segundos de som, marcado por quadro; ao rebobinar,
   toca ao contrário sincronizado com a imagem, com efeito de fita, fade ao começar e crossfade ao soltar. A música
   continua exatamente de onde parou porque o chip de som volta junto no estado. Contas do som em funções puras no
   `domain`, com os mesmos vetores de teste no `worker.ts` (consoles da página) e no `rebobinar.rs` (PS1). Opção
   "Som ao rebobinar: 📼 fita / 🔇 mudo". *Aberto: fita a 2× ou velocidade normal invertida (ou as duas)?*
### Fase B · Biblioteca com cara de console (19/11; fonte da sinopse escolhida pelo Claude, D39)

| # | Passo | Entregável | Checkpoint | Tarefa | Estado |
|---|---|---|---|---|---|
| B.1 | Obra × versões | `domain/obras.ts` (rótulos No-Intro/GoodTools → "EUA · Rev 1 · Tradução PT-BR", peso: tradução PT > Brasil > EUA > Mundo > Europa > Japão; beta, hack e cópia ruim no fim); uma linha por obra com "N versões"; "qual versão?" ao jogar (↑↓ Enter Esc), a escolha lembrada (`versao.<obra>`); zip com várias ROMs de cartucho = uma versão por ROM (`file.zip.read` só dela; reabrir abre a mesma) | unit + e2e `biblioteca-obras.spec.ts`; ⏸ ele vê a biblioteca dele | local | ✅ `e72f7c3`; aprovado (19/11) |
| B.2 | Catálogo | "📖 Catálogo" mostra em cinza os jogos da base (libretro-database, ~19 mil) que ele não tem, com ano/gênero/empresa na busca e nas facetas; sem Jogar, **sem link nem dica de onde baixar** | unit + e2e | local | ✅ `70a8ba3`; aprovado (19/11) |
| B.3 | Ficha com sinopse e nota | `jogo.sobre` no Rust (Wikidata + Wikipédia pt/en, cache, D39); a ficha mostra a nota (média 0–100 das críticas do Wikidata), a sinopse e a fonte com o link do artigo; "sem internet" e "sem artigo" avisados | unit Rust/TS, teste pela internet (ignorado no CI) e e2e com resposta falsa | local | ✅ `7935438`; aprovado (19/11) |
| B.4 | Capas no catálogo e por obra | a capa oficial (libretro-thumbnails) também pros jogos do catálogo (as regiões USA, World, USA+Europe, Europe, Japan tentadas primeiro) e, dos que ele tem, pela região da versão principal | unit | local | ✅ 19/11 |

3. **Biblioteca com cara de console.** Jogo (a obra) separado dos arquivos (versões: região, revisão, tradução, hack):
   um zip com várias traduções vira um jogo só, com "qual versão?" ao clicar. Catálogo completo por console (bases
   No-Intro/Redump), os que ele não tem em cinza, com sinopse, nota, ano e gênero (base com API a escolher). Jogo em
   cinza **nunca** tem link ou dica de onde baixar.

**Rebobinar no PS2: fica pra depois**, quando o Marcelo estudar mais ou trouxer alguém de programação de baixo nível
(18/11). Por quê: a foto tem 48 MB e leva 35–42 ms pra sair (um quadro tem 16 ms); comparar e guardar isso disputa o
processador com o jogo e a memória de um PC com 7 GB. Um caminho possível, se um dia for: uma foto por segundo, tirada
e comprimida numa linha separada, voltando aos saltos com uma transição, medido pra não trazer os engasgos de volta.

