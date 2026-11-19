# PS2 liso: diário de medições (tarefas D e F)

Só números e "jogo pesado A/B" (nome de jogo nunca entra aqui). Medições na máquina do Marcelo (Linux, 7,2 GB de RAM,
Chrome 157, LRPS2 `38d3a83f`). Relatórios completos (com o nome do jogo dentro) ficam em `~/kof-medidas/`.

## Como medir

```bash
source ~/kof-medidas/ambiente.sh               # KOF_JOGO_A, KOF_BIOS_PS2, KOF_APP (fora do repositório)
node tools/medir-ps2.mjs --jogo A --rodadas 1 --aquecer 20 --segundos 180 \
  --estado <arquivo .bin da loja estados> --teclas --mexer [--perfil]
```

- `--estado`: começa do estado salvo (copia pra loja do app de medição e aperta F8).
- `--teclas`: aperta F5, F5 e F8 aos 15%, 45% e 75% do trecho e mede, nos 8 s seguintes, a maior parada da página e o
  maior tempo sem quadro novo.
- `--mexer`: anda pelo cenário (setas seguradas 1–3 s, às vezes com o botão de correr).
- `--perfil`: liga o profiler do Chrome nos 4 s depois de cada tecla e imprime as funções que mais pararam a página.
  Cuidado: a sonda da medição faz `getImageData` a cada vsync e ela mesma pesa quando a placa está ocupada.

O custo dentro do processo do jogo (sem página):

```bash
KOF_JOGO="$KOF_JOGO_A" KOF_ESTADO=<estado cru do núcleo> \
  cargo test -p kof-nativo --release --test ps2_de_verdade -- --ignored --nocapture
```

## 17/11 · Tarefa F

### Achado 1 · Salvar e carregar estado travavam a tela (e o salvar automático a cada 2 min)

O estado do PS2 tem **48 MB** crus. No processo do jogo, o custo é pequeno:

| No núcleo (jogo pesado A) | Tempo |
|---|---|
| quadro (p50 / p99) | 5,6 / 7,9 ms |
| salvar estado | 35–42 ms |
| carregar estado | 21 ms (125 ms na 1ª) |
| bateria (`RETRO_MEMORY_SAVE_RAM`, pedida a cada 1 s) | **0 bytes**, 0 ms |

Quem travava era a **página**, na mesma linha que desenha o jogo (Chrome 157, 48 MB):

| Parte | Antes | Depois |
|---|---|---|
| base64 (`String.fromCharCode` + `btoa` numa string gigante) | 2.145 ms | 59 ms (`toBase64`) |
| `JSON.stringify` com o base64 dentro | 187 ms | 0 (texto montado na mão) |
| gzip (`CompressionStream`, roda na linha da página) | 1.617 ms | no Worker |
| `fetch` com corpo `Uint8Array` de 18 MB (cópia na página) | ~490 ms | Blob (sai por fora) |
| carregar: de-base64 + `JSON.parse` | 311 + 133 ms | `fromBase64` no Worker, base64 recortado sem parse |

Teste isolado no Chrome: a maior parada da tela durante o gzip caiu de **1.617 ms pra 33 ms** com tudo no Worker.

No app de verdade (3 min jogando, F5, F5 e F8, sonda ligada):

| Versão | F5 (página parada) | F8 | Engasgos/min | p99 |
|---|---|---|---|---|
| antes (página de hoje)¹ | 1.666–2.166 ms | 0–1.666 ms | 106–115 | 26,4–26,8 ms |
| + base64 rápido + Worker | 1.466–1.533 ms | 650 ms | 98 | 26,2 ms |
| + Blob no `fetch` (3 min mexendo, sonda pesada) | 983–1.017 ms | 1.266 ms | 68 | 26,0 ms |
| + Blob, sonda leve (só o relógio do vsync, 2 × 40 s) | 600–717 ms | 467–500 ms | 15–33 | 24,2–25,0 ms |

¹ a primeira medição pode ter rodado com a página antiga ou já com o base64 rápido (o binário de teste não foi conferido
antes dela); o "antes" seguro é o do Chrome isolado acima.

Com tudo junto, o código do app no F5 gasta ~100 ms; o resto da parada (~0,5 s) é o próprio Chrome recebendo os 48 MB
do estado pela WebSocket ("(program)" no profiler) e, no F8, mandando (`send`, ~200 ms). Próximo passo: o estado não
passa mais pela página (o processo do jogo grava num arquivo de troca e o Rust do app converte e guarda).

Antes do Blob, pelo profiler: `fetch` ~490 ms (resolvido com o Blob, falta medir) e
`getImageData` 470–680 ms, que é da própria sonda da medição. No F8: `WebSocket.send` dos 48 MB pro processo do jogo,
~255 ms (próximo passo: mandar o estado pelo disco ou em pedaços).

**O que mudou** (`packages/app-core`):
- `estado-texto.ts`: o formato (o mesmo de antes, byte a byte) com base64 nativo e texto montado/recortado sem
  `JSON.stringify`/`JSON.parse` nos MB do base64. Teste em `estados.test.ts` confere que o texto é idêntico ao do
  `JSON.stringify` e que a volta sem `toBase64` (pedaços múltiplos de 3) dá o mesmo base64.
- `estado-worker.ts` + `estado-trabalho.ts`: estados de 1 MB pra cima são montados e desmontados num Worker; sem Worker
  (Node, erro), faz na hora e registra o aviso no log.
- `armazem.ts`: `por()` aceita Blob e manda pelo `enviarArquivo` (o fetch lê o Blob sem copiar na página).

### Achado 2 · Memória: a máquina está sem folga

Com o jogo aberto: 7,2 GB de RAM, **4,6 GB na swap**, 1,9 GB disponíveis. O processo do jogo chegou a ter 194–275 MB
na swap durante as medições, o que por si só dá engasgo esporádico. Quem mais ocupa fora do app: o Firefox e as abas
dele (~2 GB entre RAM e swap). No app: jogo ~410→470 MB, página 600–1.170 MB (com o Chrome da GPU).

Pra jogar: fechar o Firefox. Próximo passo no app: a página ainda pesa (a fila de quadros de 4–10 MB cada, passo 4 da
tarefa F).

### Achado 3 · "O menu do cartão não desce"

No PS2, as **setas** são o **analógico** e o **direcional** fica em **T F G H** (`DIRECIONAL_ANALOG` em
`packages/domain/src/entrada.ts`). A pergunta "salvar no cartão?" do jogo pesado A só lê o direcional: o "pra baixo" é
o **G**. Tentado: fazer o analógico apertar o direcional também (modo "misto", como o PS1). O menu desceu, mas
no jogo o direcional troca de arma e as setas passaram a trocar de arma enquanto ele andava. **Desfeito.** O aviso na tela com as teclas do direcional também foi feito e desfeito a pedido do Marcelo: os
controles ficam como estavam (setas = analógico, T F G H = direcional).

### Achado 4 · Cartão de memória: o save se perdia ao fechar a janela

Os cartões ficam em `<dados>/nativo/sistema/ps2/pcsx2/memcards/` (o núcleo cuida deles; a bateria do PS2 tem 0 bytes).
Lendo o LRPS2 (`pcsx2/MemoryCardFile.cpp` e `libretro-common/vfs/vfs_implementation.c`, commit `38d3a83f`): cada escrita
do jogo vai pro arquivo na hora, mas por um `FILE*` com **buffer de 64 KB** (`setvbuf`), e o cartão só é fechado
(buffer descarregado + soma de verificação) no `VMManager::Shutdown`, dentro do `retro_unload_game`. O núcleo não pede
a camada de arquivos ao frontend (não dá pra trocar o buffer por fora).

O app, ao fechar a janela, fazia `std::process::exit(0)` na hora (`crates/kof-app/src/main.rs`), sem fechar o processo
do jogo: o núcleo nunca fechava o cartão e o fim do save (o que estava no buffer) se perdia. Sinal disso no dia: o
slot 2 foi formatado às 12:49 (formatar escreve MB, o buffer transbordou) e, ao fechar às 12:54, o arquivo nem foi
tocado.

Correção: antes de sair (janela fechada ou sem sinal de vida), o app fecha o jogo nativo e espera
(`nativo::Fechador`); a espera antes de forçar subiu de 3 pra 10 s (`supervisor.rs`).

| Fechar pela janela (jogo pesado A aberto) | O app sai em | Cartões gravados ao fechar |
|---|---|---|
| antes | 0,5 s | nenhum |
| depois | 0,5 s | Mcd001 e Mcd002 |

No núcleo sozinho (`ps2_de_verdade`): fechar leva **186 ms** e grava o cartão (o teste confere). Fica de risco: se o
processo do jogo cair no meio, até 64 KB do último save ainda podem se perder (só um VFS próprio no núcleo resolve).

O `Mcd001.ps2` do Marcelo continua sem formatação (todo 0xFF) e o slot 2 formatado e vazio: com a correção, formatar e
salvar pelo jogo deve sobreviver a fechar e reabrir (a conferir com ele).

Comandos: `node tools/medir-ps2.mjs --jogo A --rodadas 1 --aquecer 15 --segundos 10 --fechar-janela` e o
`ps2_de_verdade` acima.

### Achado 5 · ✨ Bonito no jogo pesado A: engasga muito (o Marcelo jogando, 17/11)

O perfil ✨ Bonito do PS2 (resolução interna 2x, anisotrópico 8x, MTVU ligado) **engasgou muito** na máquina do
Marcelo. Ainda sem número: medir cada peça separada com o banco (`--opcao pcsx2_upscale_multiplier=2x`, depois só o
anisotrópico, depois só o MTVU) e deixar no Bonito só o que couber liso. Suspeita principal: a resolução 2x (quatro
vezes os pixels, e a página recebe cada quadro 4× maior).

Atualização (17/11, à noite): o Marcelo aumentou só a **resolução interna** pelo painel e jogou o jogo pesado A
"de boa". Então a 2x sozinha cabe; a suspeita do engasgo do Bonito passa pro **anisotrópico 8x** ou o **MTVU**
(a medir). O resumo de tudo pra quem for fazer o próximo núcleo pesado está em
[NUCLEO-NATIVO-PESADO.md](NUCLEO-NATIVO-PESADO.md).

## 19/11 · 3.2 Menos RAM (máquina livre, jogo pesado A, estado salvo, andando)

- **Regressão da fase R** (achada aqui): o processo ligava o rebobinar no PS2 (foto de 48 MB a cada 2 quadros). Fora:
  fps 50,6–56,7 → 60, engasgos 810–1030 → 8–9/min, faltas de som 457–976 → 0 (era o chiado), CPU 103–119% → 47%.
- **Chrome enxuto** (`navegador.rs`, flags sem extensões, rede em segundo plano, renderer de reserva...): o Chrome do
  app inteiro (soma dos processos, `medir-ps2.mjs` agora mostra) 1.850–1.980 → 1.653–1.724 MB no pico; fps igual.
- **Estado pelo Rust** (`kof-nativo/src/pacote.rs`, `salvarEstadoPacote`/`CARREGAR_PACOTE`): o base64 + gzip (64 MB de
  texto) saiu da página e foi pra uma linha separada do processo. 1ª tentativa piorou o F5 (750 → 2.000 ms): o perfil
  mostrou o `fetch` copiando os 21 MB na linha da página (o caminho antigo mandava um Blob); com o Blob, F5 300–317 ms,
  F8 283–300 ms, sem quadro novo 383–400 ms (era 905–941), Chrome com F5 1.445 MB (era 1.891–1.988). O pacote do
  Rust (gzip rápido) tem 21 MB; o da página tinha 18.

## 19/11 · 4.3 O ✨ Bonito peça por peça (jogo pesado A, 60 s andando, 1 rodada cada salvo onde diz)

| Bonito com... | engasgos/min | p99 | faltas |
|---|---|---|---|
| tudo (2x, aniso 8x, MTVU, transparência Alta, sem underclock) | 133 | 27,1 ms | 0 |
| sem o anisotrópico | 95 | 26,5 | 0 |
| sem o MTVU | 88 | 26,1 | 0 |
| underclock leve | 88 | 26,2 | 8 |
| **transparência Básica** | **45** | 25,2 | 0 |
| underclock leve + Básica | 59 | 25,6 | 0 |
| Básica, MTVU ligado (2 rodadas) | 54 · 39 | 25,4 · 25,1 | 0 |
| Básica, MTVU desligado (2 rodadas) | 58 · 60 | 25,5 · 25,4 | 0 |

O Equilibrado no mesmo trecho: 8–17 engasgos/min, p99 24,5 ms. Decidido: o Bonito fica com a transparência **Básica**
(o resto igual). O MTVU não muda nada com a Básica; fica ligado como estava.

## 19/11 · 2.3 O erro de memória do jogo pesado B (achado e corrigido)

- **Reproduzido:** 10 min do jogo B (do salvar automático dele, convertido em estado na pasta de medidas): às ~10 min o
  kernel ficou sem memória (OOM global) e matou um processo do Chrome do app com 453 MB na RAM e **3,2 GB na swap**.
- **Armadilha da medição:** com o `medir-ps2.mjs` ligado pela depuração (CDP), quem crescia era o processo principal do
  Chrome (~600 MB/min: a depuração guarda as mensagens da WebSocket) e o renderer ficava parado, porque a sonda mantinha
  a página acordada. Nova opção `--sem-cdp`: abre o jogo, solta a depuração e só olha o `/proc`.
- **Causa:** sem depuração, o **renderer** foi de 290 a 4.787 MB em 3 min. A `FilaDeQuadros` (engine) só cortava no
  `tirar`, que roda no `requestAnimationFrame`; com a janela escondida ou coberta o Chrome para o rAF e os quadros
  (~1 MB cada) se acumulavam. Corrigido: o `empurrar` também corta em `MAX_NA_FILA` (vale pro wasm também).
- **Depois:** renderer 232–309 MB e o Chrome todo ~1.420–1.500 MB, estáveis nos 5 min.

## 19/11 · 4.5 Tela larga, e um bug da 3.2 achado no caminho

- A tela forçava 4:3 em console de TV e o `JogoNativo` ignorava o aviso `geometria`: com o "Aviso de tela larga" o jogo
  saía espremido. Agora a geometria chega na página e a tela usa a proporção do núcleo quando ela é ≥ 1,5.
- O teste pegou um bug do estado pelo Rust: o salvar automático (loja `autos`, sem gzip) do PS2 tem ~67 MB e o padrão do
  tungstenite recusa mensagem acima de 64 MB ("Message too long"), derrubando a conexão no "Continuar". O teto da
  conexão local foi pra 256 MB (`MAX_MENSAGEM`), com teste de 70 MB no `processo.rs`.
