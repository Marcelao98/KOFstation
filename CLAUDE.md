# KOFstation (novo) — contexto pra próxima sessão

## ⏩ ONDE PAROU
- **F2 (arquitetura) feita, esperando o Marcelo aprovar** (31/10/2026). Próximo: F3 (ambiente). Ver `docs/ROADMAP.md`.
- O repositório antigo é `Marcelao98/kofstation-old` (o produto atual; NÃO mexer nele nesta migração).

## Como trabalhar aqui
- Dono: Marcelo (Marcelao98). Português do Brasil, informal, direto. Ele escreve por voz (erros de digitação).
- Ele se preocupa com tokens: **uma etapa por sessão**, ler o antigo só no trecho da etapa (linhas em
  `docs/auditoria/FEATURE_INVENTORY.md`), rodar só os testes da etapa.
- Processo de cada etapa: `docs/ROADMAP.md` ("Como cada etapa é executada"). Checkpoints marcados lá: parar e esperar.
- **Paridade total**: todas as funcionalidades do antigo são intocáveis (`docs/PARIDADE.md`).
- Decisão nova → `docs/DECISIONS.md`. Contrato novo → `docs/API_CONTRACTS.md`.

## Regras que não mudam
- **Nunca** commitar, distribuir ou indicar onde baixar ROM/BIOS/jogo (nem em teste ou doc). ROMs de teste: geradas.
- **Nunca criar repositório chamado `KOFSnes`** (os atualizadores antigos baixam por esse nome).
- O núcleo Kof é da Mel: fora deste repositório até ela definir a licença.
- Commits em português, sem nome de modelo de IA, com as linhas de co-autoria/sessão que o sistema indicar.
  `git status` antes de commitar. Não abrir PR sem ele pedir.
- Linux e Windows com a mesma prioridade (ele usa Linux).
