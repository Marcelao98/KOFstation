# Para agentes de IA (Claude, Codex, etc.)

Você está no **KOFstation**: o app reconstruído em React + TypeScript + Rust a partir do `Marcelao98/kofstation-old`.
**A migração está completa (17/11/2026)** e o novo é o produto; o plano agora é melhorar o que temos antes de crescer
([docs/ROADMAP.md](docs/ROADMAP.md); a migração está em [docs/ROADMAP-MIGRACAO.md](docs/ROADMAP-MIGRACAO.md)).

> **Continuando a sessão de 08/11 à noite?** Comece por [docs/agentes/CONTINUAR.md](docs/agentes/CONTINUAR.md).
>
> **Recebeu uma tarefa de [docs/agentes/](docs/agentes/LEIA-ME.md)?** Então você não é o orquestrador: leia este
> arquivo (as regras valem pra todos), o [LEIA-ME de lá](docs/agentes/LEIA-ME.md) e **só a sua tarefa**. A lista
> abaixo é pro orquestrador.

## Antes de mexer em qualquer coisa, leia nesta ordem

1. **[docs/JORNAL.md](docs/JORNAL.md) — só a primeira entrada** (a mais nova): o que aconteceu por último e **onde parou**.
2. **[docs/ROADMAP.md](docs/ROADMAP.md)** — a fase atual, os passos e os checkpoints (⏸ = esperando o Marcelo); "Como cada
   passo é feito" de lá vale pra tudo (medir antes e depois, uma mudança por vez).
3. **[README.md](README.md)** — a arquitetura como está hoje (diagramas). Pra humano: [docs/SITUACAO.md](docs/SITUACAO.md)
   é o retrato da situação; atualize quando uma etapa for aprovada ou a ordem mudar.
4. Só quando a etapa pedir: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/FRONTEND.md](docs/FRONTEND.md),
   [docs/DECISIONS.md](docs/DECISIONS.md), [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md), e a ficha da funcionalidade
   em [docs/auditoria/FEATURE_INVENTORY.md](docs/auditoria/FEATURE_INVENTORY.md) (diz os arquivos e linhas do antigo).

Não leia o `app.js` do antigo inteiro (308 KB): vá direto às linhas que a ficha indica.

## Como trabalhar

- **Uma etapa por sessão** (o Marcelo se preocupa com tokens). Siga "Como cada etapa é executada" no ROADMAP.
- **O novo é o produto** (D38, 17/11): o antigo foi a especificação da migração ([docs/PARIDADE.md](docs/PARIDADE.md))
  e virou arquivo. Os testes que comparam com o antigo continuam (protegem contra regressão), mas melhorar e mudar é
  permitido. O repositório antigo **não** pode ser apagado: o novo ainda baixa núcleos e as `.so` do celular de lá.
- **Camadas** (conferidas pelo ESLint): `domain` puro; `engine` sem React; telas não falam com a engine nem com o
  backend direto (passam por `app-core`/stores). O Rust só expõe comandos com nome e escopo (nada de shell genérico).
- **Nada de erro escondido**: erro tem código e mensagem em português; `catch` vazio só com comentário dizendo por quê.
- **Nos checkpoints, pare** e mostre (print, números, comando pra ele rodar). Ele aprova em lote às vezes ("segue até…").
- **Ao terminar a sessão:** escreva a entrada no JORNAL (modelo no topo dele), atualize o ROADMAP e, se mudou, o
  README (diagramas e a tabela "o que já existe").

## Comandos

`pnpm install` · `pnpm nucleos` (núcleos do antigo, conferidos por SHA-256) · `pnpm dev` · `pnpm check` ·
`pnpm check:rust` · `pnpm e2e` · `pnpm build && cargo build --release -p kof-app`. Antes de enviar: `pnpm check` e,
se mexeu no Rust, `pnpm check:rust`; se mexeu em tela ou jogo, `pnpm e2e`.

## O dono e o jeito de falar

Marcelo (Marcelao98). Português do Brasil, informal, direto; ele escreve por voz (muitos erros de digitação: entenda a
intenção). Linux é o computador dele (mesma prioridade que o Windows). A Mel é a criadora da linguagem Kof e dona do
núcleo Kof do SNES.

## Regras que não mudam

- **Nunca** commitar, distribuir ou indicar onde baixar ROM, BIOS ou jogo (nem em teste ou doc). ROMs de teste são
  geradas pelos próprios testes.
- **Não mexer no `kofstation-old`** (só leitura; nem apagar). **Nunca criar um repositório chamado `KOFSnes`** (os atualizadores
  do app antigo baixam por esse nome, que redireciona pro `kofstation-old`).
- O núcleo Kof é da Mel: fora deste repositório até ela definir a licença.
- Commits em português, **sem nome de modelo de IA**, com as linhas de co-autoria/sessão que o sistema indicar.
  `git status` antes de `git add -A` (sobras locais já entraram por engano uma vez). Não abrir PR sem ele pedir.
- Binário grande não vai pro histórico: núcleos por manifesto; binários de teste só na branch órfã `teste-binarios`
  (um commit, substituído a cada versão).
