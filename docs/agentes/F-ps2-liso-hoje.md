# Tarefa F · Jogo pesado A liso hoje (o atalho das tarefas D e E)

**Quem faz:** o Claude Code **no PC do Marcelo**. **Branch:** `agente-d/ps2-liso` (a mesma das tarefas D e E).
Leia antes o [AGENTS.md](../../AGENTS.md), o [LEIA-ME](LEIA-ME.md) e as **regras da [tarefa D](D-ps2-liso.md)** (nome de
jogo nunca no repositório; caminhos só em variável de ambiente; relatórios fora do repositório).

**O objetivo de hoje, nas palavras dele:** "jogar o jogo pesado A liso, liso, hoje". Hoje ele roda relativamente liso,
mas **engasga em momentos esporádicos** e **o menu de salvar não desce nem salva no cartão**. Esta tarefa é o caminho
mais curto: experimentos rápidos que apontam o culpado, e a correção do que for achado. O banco de medição completo,
a régua com o PCSX2 e as opções completas continuam nas tarefas D e E, **depois**.

## Como trabalhar hoje

- **Experimento curto, uma coisa por vez**: 5 minutos no mesmo trecho (o estado salvo que o Marcelo fez), anotar
  engasgos/min e p99 do F3 e a memória (comando abaixo), mudar uma coisa, repetir. Guarde os números num arquivo fora do
  repositório e passe pro `docs/PS2-LISO.md` (crie se não existir) só com "jogo pesado A".
- Achou o culpado: corrija **do jeito certo** (na camada certa, com teste), não só desligando. Se a correção certa for
  grande, faça primeiro o contorno seguro (uma opção, um padrão diferente pro PS2) pra ele jogar hoje e anote a correção
  certa como próximo passo.
- **Mostre ao Marcelo a cada achado** (número antes × depois) e deixe ele jogar quando achar que melhorou.
- `pnpm check`, `pnpm check:rust`, `cargo test --workspace --no-fail-fast` e `pnpm e2e` (se tocou na página) antes de
  cada push. Commits em português, sem nome de modelo e **sem nome de jogo**.

Memória (com o jogo aberto):

```bash
ps -eo rss,args --sort=-rss | grep -iE "kofstation|chrom" | grep -v grep | head -12 | awk '{printf "%6.0f MB  %s\n",$1/1024,substr($0,index($0,$2),80)}'; free -h
```

## Os passos, nesta ordem

### 1 · Linha de base (15 min)
Abra o app, carregue o estado do trecho que engasga, ligue o 🩺 (Ajuda → 🩺 Modo diagnóstico) e jogue/deixe rodar 5 min.
Anote: engasgos/min, p99, **em que segundos** os engasgos aconteceram (o `engasgos.csv` do 🩺 tem o momento e o
"culpado"), a memória por processo no começo e no fim, e se a swap foi usada. Olhe se os engasgos têm **intervalo
regular** (a cada ~2 min? a cada 1 s?) ou **lugar fixo** (sempre no mesmo ponto do trecho).

### 2 · Salvar automático (suspeito de engasgo a cada ~2 min)
Desligue o salvar automático e repita. Sumiu o engasgo periódico? Então o estado do PS2 (dezenas de MB) gerado no laço
do filho e atravessando a página é o culpado (`apps/desktop/src/stores/auto.ts`; no nativo vale `autoSegundos`).
Correção certa: o filho grava o estado direto no disco pelo Rust (comprimido) e a página só recebe "salvo". Contorno pra
hoje, se a certa demorar: no PS2 o automático só ao pausar/fechar (com aviso na tela de opções).

### 3 · Bateria a cada 1 s (suspeito de engasgo regular)
`packages/engine/src/nativo.ts` (`conferirSram`, a cada 1000 ms) pede ao filho a `RETRO_MEMORY_SAVE_RAM` inteira
(`crates/kof-nativo/src/nucleo.rs`, `bateria()`) e compara na página. Meça o tamanho no PS2. Se for grande: o Rust guarda
um resumo (hash) e só manda quando mudou. Isso também liga com o cartão de memória (passo 5).

### 4 · Lixo de quadros na página (suspeito de engasgo aleatório + RAM alta)
Cada quadro chega como um `ArrayBuffer` novo (4–10 MB, 60 por segundo). Confirme com o rastro de coleta de lixo do
Chromium (abrir o app com `--js-flags=--trace-gc` ou o perfil de desempenho) se as pausas de GC caem nos engasgos.
Experimento rápido: resolução interna 1× (menos bytes por quadro): os engasgos diminuem? Correções, da menor pra maior:
filas menores (`canal.rs` 6, `fila-de-quadros.ts` 3), quadro no tamanho da tela quando a interna for maior, e a **janela
própria** (o jogo desenha direto na placa, a página não recebe imagem). A janela própria é grande: **mostre o desenho ao
Marcelo antes** (como fica com X11/Wayland, F3, menu rápido, print, moldura) e, se ele topar, faça primeiro como opção
"🪟 Janela própria (experimental)" só pro PS2.

### 5 · Cartão de memória e o "pra baixo" (pra ele conseguir salvar hoje)
O que fazer e onde olhar está na [tarefa E, parte 1](E-ps2-cartao-e-opcoes.md). Teste: salvar no jogo, fechar o app,
reabrir, carregar.

### 6 · Shader na primeira vez (se o engasgo tiver lugar fixo)
Passe duas vezes pelo mesmo ponto: engasga só na 1ª? Então é shader montado na hora. Confira que o cache de shaders do
núcleo está ligado e gravando em disco (`pcsx2_disable_shader_cache`, a pasta dele existe e cresce), e se o núcleo tem
compilação assíncrona/pré-carga.

### 7 · Opções do núcleo que costumam ajudar
Só depois dos passos acima, com número: MTVU ligado (VU1 em outra linha), `pcsx2_ee_cycle_skip`/`cycle_rate`, renderer
(se o núcleo aceitar Vulkan sem janela). O que ajudar vira o padrão do perfil ⚖ do PS2 (`packages/engine/src/nucleos.ts`
e `packages/domain/src/opcoes-nucleo.ts`).

## Pronto quando

O Marcelo joga o jogo pesado A por 10 minutos (incluindo o trecho que engasgava), **sem engasgo que ele perceba**, e
consegue salvar no cartão de memória e carregar depois de reabrir. Números antes × depois no `docs/PS2-LISO.md`.

## Pra começar (o Marcelo cola no Claude Code local, na pasta do repositório)

Veja o bloco "Instrução pro Claude Code local" no fim do [ROADMAP](../ROADMAP.md) ou na conversa.

## Relatório

Detalhes e números em [docs/PS2-LISO.md](../PS2-LISO.md) (17/11). Resumo:

- **Passo 2/estado (feito):** a travada ao salvar/carregar estado e no salvar automático era a página (base64 byte a
  byte 2,1 s + gzip 1,6 s + cópia do fetch 0,5 s, com 48 MB), não o núcleo (40 ms). Corrigido em `packages/app-core`
  (base64 nativo, Worker, Blob). Medido no Chrome isolado: parada da tela 1.617 → 33 ms. No app: F5 2,2 → 1,5 s antes do
  Blob; com o Blob, falta medir.
- **Passo 3 (feito, sem mudança):** a bateria do PS2 tem 0 bytes; pedir a cada 1 s não custa nada.
- **Memória:** a máquina tem 7,2 GB e estava com 4,6 GB na swap (o Firefox ~2 GB); o processo do jogo foi parar
  parcialmente na swap. Orientação: fechar o Firefox pra jogar.
- **Passo 5 ("não desce"):** o direcional do PS2 é T F G H, as setas são o analógico. O modo "misto" (analógico aperta o
  direcional) e um aviso na tela foram tentados e desfeitos: controles como estavam.
- **Passo 5 (cartão):** o `Mcd001.ps2` (slot 1) está todo 0xFF (nunca formatado); o slot 2 está formatado. O Marcelo
  formatou pelo jogo e salvou; falta conferir que sobrevive a fechar e reabrir.
- **Ficou pra depois:** passo 4 (fila de quadros / GC / janela própria, com desenho antes), passo 6 (shader: o cache
  `gl_programs.bin` existe), passo 7 (opções), o `WebSocket.send` de 48 MB no F8 (~255 ms).
