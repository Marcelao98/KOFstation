# Tarefa M · Mesa de aparelhos: ver, configurar e trocar tudo num lugar só (multijogador e Wiimote calibrado)

**Quem faz:** o Claude Code **no PC do Marcelo** (PC, celulares e, se tiver, um segundo PC/notebook pra testar de
verdade). **Branch:** `agente-m/mesa`, a partir da `claude/busy-ritchie-wrvk8h` (que já tem N, P e W). Leia antes o
[AGENTS.md](../../AGENTS.md), o [LEIA-ME](LEIA-ME.md), o [CONECTIVIDADE.md](../CONECTIVIDADE.md) (como a rede ficou
na tarefa N), o relatório da [tarefa N](N-rede-papeis.md) e a seção do Wiimote no [WII-LISO.md](../WII-LISO.md) e no
JORNAL de 22/11 (W.6).

**Regras de sempre:** uma mudança por vez, com teste; commits em português, sem nome de modelo de IA, com as linhas de
co-autoria que o sistema indicar; não abra PR; nome de jogo nunca no repositório. Antes de cada push: `pnpm check`,
`pnpm check:rust` (se mexeu no Rust), `cargo test --workspace --no-fail-fast` e `pnpm e2e`. **Tudo no `kof-nativo`
passa pelo banco do PS2** (`tools/medir-ps2.mjs`). Os testes de rede que comparam com o antigo continuam passando (o
APK antigo ainda pareia). **Controles só com o Marcelo:** no modo automático, siga o que está aqui e anote.

## O pedido (22/11, palavras dele)

"Melhorar o networking: ver os dispositivos, setar controle etc., trazer pra tela de forma mais fácil. **Controlar
dispositivos, como se fosse uma rede, fácil de configurar.** Dispositivo core, dispositivo tela, e os outros são
controles (que podem ser Wiimotes já). É o próximo ajuste, e **ficar bom pra multiplayer**. Além disso, **um modo de
calibração pro Wiimote**: não ligar automático na hora em que estiver jogando Wii; ter uma calibração."

## O que já existe (tarefas N e W, 21–22/11) e o que falta

- **Já tem:** papéis 🧠 Núcleo · 📺 Tela · 🎮 Controle (`domain/arranjo.ts`, máx. 3 aparelhos), arranjos prontos e
  chips no 📡 do menu lateral (`components/BlocoAparelhos.tsx`, `stores/arranjo.ts`), ficha de cada aparelho (canal
  `ficha`), transporte separado (`app-core/transporte.ts`), o celular como Wiimote (`domain/wiimote.ts`,
  `stores/sensores.ts`, mensagem `MOVIMENTO` no `kof-nativo`), a tela 🎮 Jogadores (2 a 4).
- **Falta (o que ele sente):**
  1. **Multijogador:** hoje o arranjo pensa em "um controle"; não dá pra ver e arrumar **quem é o jogador 1, 2, 3, 4**,
     de que aparelho e com que tipo de controle.
  2. **O limite de 3 aparelhos** não serve pra quatro jogadores (núcleo + tela + 4 controles).
  3. **Wiimote liga sozinho:** no 1º movimento do celular a porta liga os sensores (W.6) e fica com eles até fechar o
     jogo; não tem calibração nem um "ligar" explícito.
  4. **"Trazer pra tela" pede vários passos;** ver tudo de uma vez num lugar só.

## O modelo (no `domain`, puro e testado)

- **Mesa** = `{ nucleo: aparelho, tela: aparelho, jogadores: [J1..J4] }`, onde cada jogador =
  `{ aparelho, tipo, calibracao? }` ou vazio.
- **Tipos de controle:** `controle` (físico, no aparelho), `teclado`, `toque` (o controle de toque do celular),
  `wiimote` (celular como Wiimote), `wiimote+nunchuk`, `gamecube`. Quais valem depende do console (`wiimote` só no
  Wii; o resto segue os tipos que o console já tem na tela de teclas).
- **Limites:** 1 núcleo, 1 tela, **até 4 jogadores**; um aparelho pode ser núcleo+tela+jogador (o PC sozinho). O
  `MAX_APARELHOS = 3` vira o máximo de **papéis de imagem** (núcleo e tela) + os jogadores (até 4), sem quebrar os
  arranjos prontos da tarefa N (eles viram "mesas prontas").
- **Regras com motivo em português** (funções puras): o tipo vale pro console; o aparelho está online; o Wiimote só
  entra **calibrado** (ou com "usar sem calibrar" marcado de propósito); o que fazer quando um aparelho cai (o
  lugar do jogador fica **reservado** e volta pra ele quando religar).

## Os passos (pare e mostre ao Marcelo ao fim de cada um; no modo automático, siga e anote)

### M.1 · A Mesa: uma tela pra ver e configurar tudo
Uma tela (e um painel compacto no 📡 do menu lateral e no ☰ do jogo) no formato de **mesa**:
- no alto, os aparelhos da rede como **cartões** (ícone, nome, ficha resumida, online/offline, atraso medido);
- no meio, **🧠 Núcleo** e **📺 Tela**: tocar e escolher o aparelho (ou arrastar o cartão);
- embaixo, **J1 · J2 · J3 · J4**: cada vaga mostra o aparelho e o tipo de controle; tocar troca;
- um botão grande **"📺 Trazer a imagem pra cá"** em **qualquer** aparelho (pede ao núcleo pra virar a tela daqui:
  hoje são vários passos) e **"🎮 Entrar como jogador"** (pega a próxima vaga livre);
- tudo navegável pelo controle; as mesas prontas da tarefa N continuam como atalhos de um toque.
Mostrar um desenho/print **antes** de fechar o visual (no modo automático: o print em `~/kof-medidas/prints/` e
seguir). Testes unit do modelo e e2e com 3–4 páginas ligadas pelo "cabo" de teste (como `rede-papeis.spec.ts`).

### M.2 · Multijogador de verdade
- Até **4 jogadores**, cada um de um aparelho (inclusive vários celulares e o teclado/controle de outro PC).
- **Entrar no meio do jogo** sem pausar quem já está jogando; a vaga escolhida (ou a próxima livre); aviso na tela
  ("Jogador 2: celular X, Wiimote").
- **Cair e voltar:** a vaga fica reservada (cinza, "esperando") e o aparelho volta pro mesmo jogador ao religar.
- **Atraso por jogador** (o ping que já existe) na Mesa, e o pior atraso no F3.
- O núcleo recebe cada jogador na porta certa (`pad` com o número do jogador; conferir PS1/PS2/Wii/GC e os da página).
Teste e2e: 4 "celulares" (páginas) entram, um cai e volta pra mesma vaga, os botões de cada um chegam na porta certa.

### M.3 · Wiimote: integração (o W.7 e o W.9 do ROADMAP)
- Movimento com sequência e hora (descartar o atrasado e o fora de ordem).
- **Nunchuk em outro celular** (dois aparelhos pro mesmo jogador: um é o Wiimote, o outro o Nunchuk), escolhido na
  vaga do jogador.
- **Desligar os sensores quando o celular sai** (hoje a porta fica com eles até fechar o jogo).
- **Até 4 celulares como Wiimote**, cada um na sua porta; atraso e variação medidos (tabela no `WII-LISO.md`).

### M.4 · Modo de calibração do Wiimote (pedido dele)
- **Nada liga sozinho:** o celular só vira Wiimote quando a vaga do jogador é `wiimote` **e** a calibração foi feita
  (ou ele marcou "usar sem calibrar"). Tirar a ligação automática "no 1º movimento" da W.6.
- **Assistente de calibração** (no celular, com a imagem de apoio na tela do jogo ou na tela do celular):
  1. segure o celular **apontando pro meio da tela** e toque em "Aqui é o meio";
  2. aponte pros **quatro cantos** (ou dois opostos) → a área da mira e a sensibilidade;
  3. **zona morta** e suavização (um controle deslizante com a mira de teste se mexendo);
  4. **chacoalhar:** "chacoalhe agora" três vezes → o limite do chacoalhar daquele celular;
  5. **mão** (destro/canhoto) e **posição** (em pé ou deitado / Wiimote de lado);
  6. **testar:** uma mira na tela e um alvo pra acertar, antes de salvar.
- **Guardada por aparelho** (no celular e no PC), com "recalibrar" e **"recentrar" num botão** durante o jogo (sem
  abrir o assistente). A calibração vive no `domain` (contas puras: meio, cantos, zona morta, limite do chacoalhar,
  testadas com movimentos gravados) e o celular aplica antes de mandar.
- Aviso na Mesa quando a vaga é Wiimote sem calibração ("calibrar" leva pro assistente).

### M.5 · Robustez e documentação
- Religar sozinho (o aparelho que cai volta pra vaga; o núcleo que reinicia reencontra a mesa); a mesa lembrada por
  console/jogo (as camadas que a N já usa).
- `docs/CONECTIVIDADE.md` atualizado (a Mesa, os jogadores, a calibração, os canais novos ou mudados, compatível com o
  APK antigo); a fase C e os passos W.7–W.9 no ROADMAP marcados.

**Pronto quando:** na rede de casa, com um jogo de Wii aberto no PC, o Marcelo vê todos os aparelhos na Mesa, manda a
imagem pra outro aparelho com um toque, **dois ou mais celulares entram como Wiimote** (calibrados pelo assistente,
nada ligou sozinho), um sai e volta pra mesma vaga, e ninguém perde o jogo. Testes unit (modelo e calibração), do
`app-core` (transporte falso), e2e com 3–4 páginas e o teste Rust dos sensores por porta.

## Refazer (22/11, depois da 1ª tentativa voltada)

A 1ª versão (branch `agente-m/mesa-v1`, só pra consulta) passou nos e2e simulados e quebrou no celular: o PC ficava
no J1 e o celular caía no J2 (o Wii Sports só ouve o Wiimote 1); "📺 ver o jogo do PC" e "trazer a imagem" pararam
(suspeita: `stores/mesa.ts` reaplicando o arranjo a cada `lista` da rede); o Wiimote só ligava depois de vaga +
calibração (passos demais). **Regras novas:**

1. **Primeiro o teste de verdade**, antes de qualquer código da M: `tools/testar-mesa.mjs`, no molde do
   `tools/testar-aparelhos.mjs`: **dois `kofstation --sem-navegador` reais** (cada um com o seu `XDG_DATA_HOME`; o 2º
   pega a porta TCP seguinte sozinho), as páginas no Chromium, pareando pelo código da tela, com um jogo gerado pelo
   teste aberto em A. O B faz o papel do celular (ver como o app decide "é celular": se precisar, o B finge a ponte do
   APK com `addInitScript`). Confere, **na versão de hoje (sem M)**: o B como controle chega no **J1** e os botões
   andam; "ver o jogo do PC" no B mostra a imagem; "trazer a imagem" leva e volta. Isso é a linha de base: tem que
   continuar passando a cada passo.
2. **Um pedaço por vez**, cada um no teste de verdade e jogado pelo Marcelo antes do próximo:
   a) J1 pra quem chega (o teclado do PC divide o J1); b) a Mesa só **mostra** (sem mandar no arranjo); c) trocar tipo
   e vaga pela Mesa; d) Wiimote: sensores ligam quando a vaga é Wiimote, **com "calibrar agora" oferecido sozinho**
   (não exigido); e) o assistente de calibração; f) multijogador (2º celular no J2, cair e voltar).
3. **Fácil pro usuário final:** contar os toques; o celular que conecta num jogo de Wii já é o Wiimote do J1.

## Relatório

*(o agente preenche: o que fez em cada passo, números (atraso por jogador, variação do Wiimote), prints, o que ficou
de fora, comandos)*
