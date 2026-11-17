# Tarefa E · PS2: cartão de memória, menu de salvar e o pacote completo de opções (PS2 e PS1)

**Quem faz:** o Claude Code **no computador do Marcelo** (tem a placa, a BIOS e os jogos), junto com a
[tarefa D](D-ps2-liso.md) (engasgos). **Branch:** a mesma `agente-d/ps2-liso`. Leia antes o [AGENTS.md](../../AGENTS.md),
o [LEIA-ME](LEIA-ME.md) desta pasta e as **regras da tarefa D** (nome de jogo nunca no repositório: "jogo pesado A/B";
caminhos só em variável de ambiente; relatórios do 🩺 fora do repositório).

## O que o Marcelo viu (17/11), no jogo pesado A

1. **Roda relativamente liso**, mas **engasga em alguns momentos** do jogo. → tarefa D (Fase 0 já com esse trecho).
2. **No menu de salvar do jogo não consegue ir pra baixo** nem **salvar no cartão de memória**. → parte 1 abaixo.
3. Quer o **pacote completo de opções** ("multiconfiguração": PS2 como o PCSX2, PS1 com várias opções de gráfico,
   emulação etc.). → parte 2 abaixo.

Ordem: **parte 1 primeiro** (é defeito: o jogo não salva), depois a Fase 0/1 da tarefa D com o trecho que engasga,
depois a parte 2.

## Parte 1 · Cartão de memória e o "pra baixo" no menu de salvar

Reproduza sozinho: abra o jogo pesado A, chegue no menu de salvar (pelo estado salvo que o Marcelo fizer ali, guardado
fora do repositório) e tente salvar. Hipóteses, **confira cada uma com número/log antes de mexer**:

- **Não existe cartão no slot 1.** O LRPS2 cria/acha os cartões numa pasta dentro do diretório de saves que o
  `kof-nativo` informa (`ENV_GET_SAVE_DIRECTORY`, em `crates/kof-nativo/src/nucleo.rs`; a pasta é
  `<dados>/nativo/saves/ps2`, montada em `crates/kof-app/src/nativo.rs`). Veja: a pasta existe e é gravável? Depois de
  abrir o jogo, aparece algum `.ps2` (ex.: `Mcd001.ps2`)? Alguma opção do núcleo liga/desliga o cartão (procure nas
  opções que ele declara: `opcoes_declaradas()` em `nucleo.rs`, teste `crates/kof-nativo/tests/opcoes.rs`)? Compare
  com o RetroArch + o mesmo `pcsx2_libretro`: onde ele põe o cartão e com que nome.
- **O cartão é criado mas não é gravado no disco** (o núcleo grava na memória e só escreve ao fechar, ou espera
  `retro_serialize`/`RETRO_MEMORY_SAVE_RAM`): veja `nucleo.rs` ~709 ("Bateria ... no PS1, o cartão de memória 1") e o que
  o PS2 usa. Teste: salvar no jogo, fechar o app, reabrir, carregar.
- **O "pra baixo" não chega.** No PS2 o teclado/controle manda o direcional para o **analógico** (`ANALOGICO` em
  `apps/desktop/src/stores/entrada.ts`) e alguns menus de cartão só aceitam o **D-pad**. Confira com o log do que chega
  em `estado_da_entrada` (`nucleo.rs` ~373: `RETRO_DEVICE_JOYPAD` bit 5 = baixo) quando aperta ↓ no teclado e no
  controle. Se for isso: o direcional manda **os dois** (D-pad e analógico) no PS2, como o PCSX2 faz com o mapeamento
  padrão, ou o D-pad fica no direcional e o analógico nas teclas do analógico. Pode ser também o cartão vazio/ausente
  (o menu não tem para onde descer): resolva o cartão antes de concluir.

Pronto quando: salvar no cartão, fechar o app, reabrir e carregar funciona no jogo pesado A (e num segundo jogo), e há
um teste automático do caminho do cartão (pasta, arquivo criado, sobrevive a fechar/abrir) em `crates/kof-nativo/tests/`.

## Parte 2 · O pacote completo de opções ("multiconfiguração")

**O que já existe (M16.4):** catálogo curado em `packages/domain/src/opcoes-nucleo.ts` (PS2: ~23 opções, ex.
resolução interna, EE cycle rate/skip, MTVU, filtros, blending, deinterlace, FPU/VU, cache de shaders; PS1 e os
WebAssembly também), perfis ⚡ Rápido / ⚖ Equilibrado / 🎯 Fiel, camadas geral → console → jogo
(`opcoes-camadas.ts`), a tela F6 → ⚙ Opções de emulação com **Avançado**, "⚡ vale na hora" × "↻ vale ao reabrir" e o
🩺 gravando as opções usadas. **O que faltou:** o Avançado mostrar **tudo o que o núcleo declara** (o Rust já guarda:
`opcoes_declaradas()`, mas nada leva isso pra tela) e algumas escolhas grandes fora do catálogo (ex.: o renderer do
PS2 está fixo em OpenGL em `packages/engine/src/nucleos.ts`).

Fazer:

1. **Comando que lista as opções do núcleo** (`kof-nativo` → `kof-app` → `app-core` → tela), com nome, valores e padrão,
   pro PS2 (LRPS2) e o PS1 nativo (PCSX-ReARMed). A tela mostra no **Avançado** cada uma em português quando o catálogo
   tem a tradução, e com o nome do núcleo quando não tem. Nada de opção escondida.
2. **Organizar como o PCSX2** (o Marcelo conhece aquelas telas): grupos **Gráficos** (renderer, resolução interna,
   filtros, texturas, deinterlace, widescreen…), **Emulação** (EE/VU, ciclos, MTVU, FPU, velocidade), **Som**,
   **Cartão de memória**, **Correções do jogo** (hacks), **Sistema** (BIOS, inicialização rápida). O PS1 com os grupos
   equivalentes (recompilador, resolução/"enhanced", dithering, filtros, frameskip, SPU…).
3. **Renderer do PS2 escolhível** (OpenGL / Vulkan / software, o que o núcleo aceitar sem janela), medido com a tarefa D
   antes de virar padrão de algum perfil.
4. **Perfis revistos com número**: com o banco da tarefa D, os valores de ⚡ ⚖ 🎯 no PS2 e no PS1 passam a ser os que
   mediram melhor (anote no `docs/PS2-LISO.md`). Perfil por jogo pelas camadas que já existem (sem nome de jogo no
   código: a camada "jogo" guarda pela identificação do jogo, no computador de quem joga).
5. **Cada opção nova com dica** (o texto curto que a tela já mostra) e marcada "vale na hora" só se você conferiu que o
   núcleo relê (`GET_VARIABLE_UPDATE`) e a imagem/velocidade muda sem reabrir.

Arquivos: os da tarefa D, mais `packages/domain/src/opcoes-nucleo.ts`, `opcoes-camadas.ts`, `packages/app-core/**` (o
pedido novo), `packages/contracts/**` (o comando novo), `crates/kof-app/src/**` (só o comando), a tela de opções em
`apps/desktop/src/screens/Estados/**` (onde está a aba ⚙ Opções de emulação) e `apps/desktop/src/stores/entrada.ts` (só
se a parte 1 confirmar o D-pad). Testes: unit do catálogo/camadas, teste Rust da lista declarada, e2e da tela
(`apps/desktop/e2e/opcoes-emulacao.spec.ts`).

## Pra começar (o Marcelo cola no Claude Code local, na pasta do repositório)

> Leia `AGENTS.md`, `docs/agentes/LEIA-ME.md`, `docs/agentes/D-ps2-liso.md` e `docs/agentes/E-ps2-cartao-e-opcoes.md`.
> `git fetch origin && git checkout claude/busy-ritchie-wrvk8h && git pull && git checkout -B agente-d/ps2-liso`.
> Faça nesta ordem: tarefa E parte 1 (cartão e o "pra baixo"), tarefa D Fases 0–2 com o trecho que engasga, tarefa E
> parte 2 (opções completas), tarefa D Fase 3. A BIOS e os jogos estão em: (caminhos aqui). O jogo pesado A é (arquivo)
> e o B é (arquivo). Nunca escreva nome de jogo no repositório. Pare e me mostre ao fim de cada parte (print, números,
> o que mudou), e antes de fazer o modo janela própria.

## Relatório

*(o agente preenche: o que fez em cada parte, números antes × depois, o que ficou de fora, comandos pra conferir)*
