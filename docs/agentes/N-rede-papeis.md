# Tarefa N · Rede redesenhada: aparelhos com papéis (Núcleo, Tela, Controle), trocados como num Switch

**Quem faz:** o Claude Code **no PC do Marcelo** (ele tem o PC, o celular e a TV/segundo aparelho pra testar de
verdade). **Branch:** `agente-n/rede`, a partir da `claude/busy-ritchie-wrvk8h`. Leia antes o
[AGENTS.md](../../AGENTS.md), o [LEIA-ME](LEIA-ME.md) e a **fase C** do [ROADMAP](../ROADMAP.md) (onde a conectividade
mora hoje e o desenho dos cenários). Esta tarefa **é** a fase C, passos C.1–C.4, com o pedido dele de 21/11.

**Regras de sempre:** uma mudança por vez, com teste; commits em português, sem nome de modelo de IA, com as linhas de
co-autoria que o sistema indicar; não abra PR. Antes de cada push: `pnpm check`, `pnpm check:rust` (se mexeu no Rust),
`pnpm e2e`. A rede tem testes que comparam com o protocolo do antigo (`tools/testar-rede.mjs` no CI): o protocolo de
fio continua compatível com o APK.

## O pedido (21/11, palavras dele)

"Redesenho da camada de rede. Configurar aparelhos, **no máximo 3**, cada um com uma função: **aparelho tela**,
**aparelho núcleo** e **aparelho teclado/controle**. Na rede local. Que seja **fácil**. E no **menu lateral**, que seja
**tipo Switch**. Isso é obrigatório."

## O modelo (no `domain`, puro e testado)

- **Papéis:** `nucleo` (roda o emulador), `tela` (mostra a imagem e toca o som), `controle` (teclado, controle físico ou
  toque de onde saem os botões).
- **Arranjo** = `{ nucleo: aparelho, tela: aparelho, controles: aparelho[] }`, com **até 3 aparelhos distintos** no
  total. Um aparelho pode ter mais de um papel (o PC sozinho tem os três).
- **Regras** (funções puras, com teste): o núcleo precisa conseguir rodar o console (a ficha do aparelho: o PS2 e o
  Wii só no PC; ver C.2); a tela precisa de um caminho de imagem até ela; um arranjo inválido diz **por quê**, em
  português.
- **Arranjos prontos** (os "cenários" da fase C), com ícone e nome curto:
  - 🖥 **PC sozinho** — núcleo, tela e controle no PC.
  - 📺 **PC + celular de controle** — núcleo e tela no PC (TV), controle no celular.
  - 📱 **Portátil** — núcleo no PC, tela e controle no celular (o "jogar no PC" de hoje).
  - 🖥📺📱 **Três aparelhos** — núcleo no PC, tela em **outro** aparelho (notebook/PC da sala/celular), controle num
    terceiro (celular ou o teclado de outro PC). **Isto é novo:** hoje a imagem só vai do PC pro celular.
  - 📱 **Celular sozinho** — tudo no celular (o APK).

## Os passos (pare e mostre ao Marcelo ao fim de cada um)

### N.1 · Transporte separado (C.1)
Uma interface "transporte" no `app-core`: o de hoje (`crates/kof-net` + `kof-app/src/rede.rs` + `app-core/rede.ts`)
vira o transporte **local**; os canais (`pad`, `jogo`, a sinalização do WebRTC) não sabem por onde passam. Desenho em
`docs/CONECTIVIDADE.md` (diagrama do antes e do depois). Testes do `app-core` com um transporte falso. Nada muda pro
usuário. (É o que deixa a internet, C.5, entrar depois sem reescrever.)

### N.2 · Ficha de cada aparelho (C.2)
Cada aparelho conta aos outros o que tem: tipo (PC/celular), processador, memória, tela, controles ligados, quais
consoles roda. Vai pela rede pareada (mensagem nova, compatível: aparelho antigo que não manda ficha aparece como
"ficha desconhecida"). A tela 📡 Aparelhos mostra a ficha.

### N.3 · Papéis funcionando (o miolo)
Generalizar o que já existe, sem jogar fora:
- **Imagem e som pro aparelho tela:** hoje o `stores/transmissao.ts` manda o jogo do PC pro **celular** por WebRTC
  ("Levar pro celular"). Generalizar pra **qualquer aparelho pareado** como tela (inclusive outro PC), com a mesma
  medição de atraso (o ping que já aparece).
- **Botões do aparelho controle:** hoje o celular vira controle pelo canal `pad` (`stores/modoControle.ts`,
  `stores/celular.ts`). Generalizar pra **qualquer aparelho** (o teclado/controle de outro PC também), como jogador 1–4.
- **Trocar com o jogo rodando, sem perder nada** (o estado continua no núcleo; só muda pra onde vai a imagem e de onde
  vêm os botões).

### N.4 · O menu lateral "tipo Switch" (obrigatório)
No menu lateral (`apps/desktop/src/components/Lateral.tsx`), um bloco **📡 Aparelhos** sempre à mão:
- os aparelhos conectados (até 3) com ícone e os papéis de cada um como **chips** (🧠 Núcleo · 📺 Tela · 🎮 Controle);
- os **arranjos prontos** como botões grandes: **um toque troca** (tipo tirar o Switch da base);
- trocar um papel avulso (tocar no chip e escolher o aparelho);
- funciona pelo **controle** também (o menu lateral já navega pelo controle);
- se um aparelho cair, volta sozinho pro arranjo possível e avisa (ex.: a tela caiu → a imagem volta pro núcleo).
Mostrar um **desenho/print ao Marcelo antes** de fechar o visual. O mesmo bloco no ☰ do meio do jogo e no celular.

### N.5 · Lembrar e sugerir (C.4)
Lembrar o último arranjo por aparelho, console e jogo (as camadas que já existem); sugerir pela ficha (PS2/Wii →
núcleo no PC).

**Pronto quando:** o Marcelo, na rede de casa, troca entre os arranjos pelo menu lateral **com o jogo rodando**,
inclusive o de três aparelhos (PC roda, outro aparelho mostra, celular controla), sem perder o jogo; testes unit (o
modelo), do `app-core` (transporte falso) e e2e com 2–3 páginas ligadas pelo "cabo" de teste (como o
`e2e/celular-pc.spec.ts`).

## Relatório

*(o agente preenche: o que fez em cada passo, números (atraso da imagem e dos botões), o que ficou de fora, comandos)*
