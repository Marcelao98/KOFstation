# O que fazer agora — pro Claude Code local

## Agora (22/11): tarefa M

| Tarefa | Branch | Por quê |
|---|---|---|
| [M · Mesa de aparelhos: ver, configurar e trocar tudo num lugar só; multijogador até 4; Wiimote com calibração](M-mesa-de-aparelhos.md) | `agente-m/mesa` (da `claude/busy-ritchie-wrvk8h`, que já tem N, P e W) | "controlar dispositivos como uma rede, fácil; core, tela e o resto controles (que podem ser Wiimotes); bom pra multiplayer; e um modo de calibração pro Wiimote, sem ligar automático" |

Pare e mostre ao Marcelo ao fim de cada passo (ou siga no modo automático, abaixo); no fim, preencha o Relatório da
tarefa, atualize o ROADMAP e o JORNAL e faça push da branch. Não abra PR (ele pede ao orquestrador).

## Feitas antes (21–22/11)

N (rede com papéis, `agente-n/rede`) → P (rebobinar do PS1 liso, `agente-p/rebob-ps1`) → W (Wii e GameCube,
`agente-w/wii`), em modo automático; o que ele ainda confere está no JORNAL de 21–22/11.

Antes de começar: leia o [AGENTS.md](../../AGENTS.md), o [LEIA-ME](LEIA-ME.md) e o
[NUCLEO-NATIVO-PESADO.md](../NUCLEO-NATIVO-PESADO.md) (vale pra tudo que mexe no processo nativo). Regras que mais pesam aqui:
- **Nome de jogo nunca no repositório** (commit, doc, código, teste, log): "jogo de teste PS1 A", "jogo de teste Wii A".
  Jogos, BIOS e estados salvos só em variável de ambiente / fora do repo (`~/kof-medidas/`).
- **Tudo no `kof-nativo` passa pelo banco do PS2** (`tools/medir-ps2.mjs`) antes de ir pra frente: o PS2 divide o mesmo
  processo.
- **Controles só com o Marcelo** (combine antes de fixar; no modo automático, a proposta da tarefa W.4, sem mexer nos outros consoles).
- Antes de cada push: `pnpm check`, `pnpm check:rust` (se mexeu no Rust), `cargo test --workspace --no-fail-fast` e
  `pnpm e2e` (se mexeu em tela ou jogo). Commits em português, sem nome de modelo de IA.

## Modo automático (o Marcelo saiu e quer voltar com tudo feito)

Quando ele disser "modo automático": **não pare nos checkpoints**, faça a tarefa da vez até o fim e deixe tudo anotado
pra ele ver na volta. O que muda:

- **Checkpoint que precisa dele** (jogar, olhar, aprovar): marque ⏸ no ROADMAP com o que ele tem que conferir, e
  **siga pro próximo passo**. No fim, uma lista "Pra você conferir" no topo do JORNAL, com o passo a passo de cada.
- **Decisões que eram com ele**, tome a do texto da tarefa e anote no JORNAL ("decidi X porque Y; pra mudar: Z"):
  - menu lateral tipo Switch (N.4): siga o desenho da tarefa; tire um print e deixe em `~/kof-medidas/` pra ele ver;
  - tranco do rebobinar do PS1 (P): sem resposta dele, meça nos quatro momentos (logo ao apertar, correndo, depois de
    morrer, ao soltar) com o `medir-rebob.mjs`;
  - controles do Wii/GameCube (W.4): a proposta da tarefa (ponteiro no mouse, chacoalhar num botão fácil, Nunchuk no
    analógico esquerdo, GameCube como o console); **não mexa nos controles dos outros consoles**.
- **Travou de verdade** (núcleo não roda, teste que não passa depois de várias tentativas): anote o que tentou e o erro
  no JORNAL, deixe aquele passo ⏸ e siga pro próximo que não dependa dele. Nada de esconder teste que falha nem
  desligar teste pra passar.
- **Push ao fim de cada passo** (não só de cada tarefa): se a máquina desligar, nada se perde.
- **Ele está fora:** pode abrir janelas e jogos pra medir; feche tudo o que abriu ao terminar. Nunca use os dados de
  verdade dele (saves, configuração do app instalado) pra medir: use o app de medição em `~/kof-medidas/`.
- **No fim:** o Wii tem que abrir e rodar o jogo de teste Wii A pelo KOFstation, com o ponteiro no mouse. Deixe no topo
  do JORNAL: o que ficou pronto, os números, o que ele precisa conferir e o comando pra abrir o app.

- **Na tarefa M:** o visual da Mesa segue o desenho da tarefa (print em `~/kof-medidas/prints/`); os tipos de controle
  e a calibração do Wiimote como estão lá; **não mude os controles de nenhum console** além do que a tarefa pede.
- **No fim:** deixe no topo do JORNAL o que ficou pronto, os números, o que ele precisa conferir e o comando pra abrir
  o app.

## Texto pro Marcelo colar no Claude Code local

```bash
git fetch origin && git checkout claude/busy-ritchie-wrvk8h && git pull
```

Pra acompanhar passo a passo:

> Leia `docs/agentes/PROXIMO.md` e faça a tarefa da vez (a M) na branch que está lá. Me mostre ao fim de cada passo.
> Jogo de teste Wii A = (caminho); PS2 A = (caminho, só pra conferir que o PS2 continua igual). Nunca escreva nome de
> jogo no repositório.

Pra sair e voltar com tudo feito:

> Leia `docs/agentes/PROXIMO.md` e faça a tarefa da vez (a M) em **modo automático** (a seção de lá): não pare pra me
> perguntar, siga até o fim, push a cada passo, e deixe no topo do JORNAL o que eu tenho que conferir. Jogo de teste
> Wii A = (caminho); PS2 A = (caminho, só pra conferir que o PS2 continua igual). Nunca escreva nome de jogo no
> repositório.
