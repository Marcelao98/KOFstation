# O que fazer agora (plano do Marcelo de 21/11) — pro Claude Code local

Três tarefas, **nesta ordem**, cada uma na sua branch (a seguinte parte da anterior, que já tem tudo). Pare e mostre
ao Marcelo ao fim de cada passo; no fim de cada tarefa, preencha o Relatório dela, atualize o ROADMAP e o JORNAL e
faça push da branch. Não abra PR (ele pede ao orquestrador).

| # | Tarefa | Branch | Por quê | Obrigatório? |
|---|---|---|---|---|
| 1 | [N · Rede com papéis (Núcleo, Tela, Controle), até 3 aparelhos, menu lateral tipo Switch](N-rede-papeis.md) | `agente-n/rede` (da `claude/busy-ritchie-wrvk8h`) | "configurar aparelhos, fácil, no menu lateral tipo Switch" | **sim** |
| 2 | [P · Rebobinar no PS1 liso](P-rebobinar-ps1-liso.md) | `agente-p/rebob-ps1` (da `agente-n/rede`) | "rebobinar no PS1 rodando liso" | **sim** |
| 3 | [W · Wii e GameCube com o núcleo do RetroArch, com tudo o que o PS2 ensinou](W-wii-gamecube.md) | `agente-w/wii` (da `agente-p/rebob-ps1`) | "aí, Wii!" | o grande objetivo |

Antes de começar: leia o [AGENTS.md](../../AGENTS.md), o [LEIA-ME](LEIA-ME.md) e o
[NUCLEO-NATIVO-PESADO.md](../NUCLEO-NATIVO-PESADO.md) (vale pras tarefas P e W). Regras que mais pesam aqui:
- **Nome de jogo nunca no repositório** (commit, doc, código, teste, log): "jogo de teste PS1 A", "jogo de teste Wii A".
  Jogos, BIOS e estados salvos só em variável de ambiente / fora do repo (`~/kof-medidas/`).
- **Tudo no `kof-nativo` passa pelo banco do PS2** (`tools/medir-ps2.mjs`) antes de ir pra frente: o PS2 divide o mesmo
  processo.
- **Controles só com o Marcelo** (combine antes de fixar).
- Antes de cada push: `pnpm check`, `pnpm check:rust` (se mexeu no Rust), `cargo test --workspace --no-fail-fast` e
  `pnpm e2e` (se mexeu em tela ou jogo). Commits em português, sem nome de modelo de IA.

## Texto pro Marcelo colar no Claude Code local

```bash
git fetch origin && git checkout claude/busy-ritchie-wrvk8h && git pull
```

> Leia `docs/agentes/PROXIMO.md` e siga: faça as tarefas N, P e W nessa ordem, cada uma na sua branch como está lá.
> Comece pela N. Me mostre ao fim de cada passo. Jogos de teste: PS1 A = (caminho), Wii A = (caminho), PS2 A =
> (caminho, só pra conferir que o PS2 continua igual). Nunca escreva nome de jogo no repositório.
