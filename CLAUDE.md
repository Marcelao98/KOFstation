# KOFstation (novo) — contexto pra próxima sessão

## ⏩ ONDE PAROU
- **31/10: F3, F4a, F4b e M1 feitos** (ele pediu "segue até o M1, depois a gente testa"): ⏸ esperando o Marcelo
  testar no Linux dele e aprovar a D2 = **opção B** (Rust local + Chromium; o Tauri no Linux não tem WebRTC nem
  SharedArrayBuffer: `docs/SPIKE_D2.md`). Depois: apagar o protótipo que perdeu (F4b.5) e seguir pro **M2**.
- **App de verdade (opção B):** `crates/kof-app` = executável `kofstation` (serve o `apps/desktop/dist` embutido em
  127.0.0.1 com token, abre o Chromium em modo app, fecha junto). Pacotes M1 entregues ao Marcelo em 31/10.
- Rodar: `pnpm install`, `pnpm dev` (app no navegador com backend de teste), `pnpm check:tudo`, `pnpm e2e`.
- Telas que ainda não existem estão em `screens/Pendente` e as ações avisam a etapa (`app/acoes.ts`, `ETAPA`).
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
