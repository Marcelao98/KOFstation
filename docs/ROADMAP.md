# Roadmap e como o plano é executado

> Estado de cada etapa: ⬜ não começou · 🟨 em andamento · ✅ fechada (com teste e paridade verificada) · ⏸ esperando o Marcelo.
> Detalhe de cada etapa (o que reaproveita do antigo, linhas do código): [auditoria/PLANO_DETALHADO.md §4](auditoria/PLANO_DETALHADO.md).

## Etapas

| # | Etapa | Estado | Checkpoint do Marcelo |
|---|---|---|---|
| F2 | Documentos da arquitetura, licença, paridade | 🟨 | **aprova a arquitetura** |
| F3 | Ambiente: pnpm + Cargo workspaces, lockfiles, CI Linux/Windows, guia de instalação | ⬜ | instala no Linux dele |
| F4a | Esqueleto React → Rust → React, logs, testes | ⬜ | — |
| F4b | Spike Tauri × Rust + Chromium (decide D2) | ⬜ | **aprova a decisão D2** |
| M1 | Casca: telas, Voltar, 126 temas, Início, foco por controle | ⬜ | — |
| M2 | Engine: núcleo wasm no Worker, WebGL, AudioWorklet, J1 | ⬜ | **joga um jogo no app novo** |
| M3 | Biblioteca + Kof Games + busca + capas | ⬜ | — |
| M4 | Configurações em camadas + importar/exportar `.kofsave` | ⬜ | — |
| M5 | Saves, savestates, automático, modos de jogo | ⬜ | — |
| M6 | Rebobinar | ⬜ | — |
| M7 | Painel de imagem e molduras | ⬜ | confere os filtros |
| M8 | Controles e teclas, jogadores 2–4 | ⬜ | — |
| M9 | Jukebox e músicas | ⬜ | — |
| M10 | Estatísticas, patches, caçador de bugs, desempenho, avisos | ⬜ | — |
| M11 | BIOS, GBA, Neo Geo, PS1, N64 | ⬜ | testa com jogos dele |
| M12 | PS2 nativo (kofnativo supervisionado pelo Rust) | ⬜ | — |
| M13 | Rede, celular como controle, Jogar no PC | ⬜ | testa com o celular |
| M15 | Distribuição: pacotes Linux/Windows, atualizador assinado | ⬜ | **instala a beta** |
| M14 | Celular (casca Java servindo o app novo) | ⬜ | testa no celular |
| — | Troca: o app antigo avisa e leva pro novo | ⬜ | **decide a troca** |

## Como cada etapa é executada

1. **Abrir:** ler o `CLAUDE.md` ("onde parou") e a linha da etapa aqui. Nada de reler o projeto todo.
2. **Estudar o antigo só no trecho da etapa:** as fichas do [FEATURE_INVENTORY](auditoria/FEATURE_INVENTORY.md) dizem os
   arquivos e as linhas em `Marcelao98/kofstation-old`.
3. **Marcar no [PARIDADE.md](PARIDADE.md)** os itens que a etapa cobre.
4. **Implementar** na camada certa (domain → app-core → engine → backend → tela), com testes junto.
5. **Comparar com o antigo:** mesma ROM + estado + botões → mesmos pixels/som; mesmos arquivos lidos e gravados nos dois
   sentidos. Item de paridade só vira ✅ com teste.
6. **Registrar:** decisão nova vai pro [DECISIONS.md](DECISIONS.md); contrato novo pro [API_CONTRACTS.md](API_CONTRACTS.md);
   o que foi feito no `CLAUDE.md` ("onde parou") e aqui.
7. **Enviar:** commit em português, push na branch de trabalho. Juntar na `main` (PR) quando o Marcelo pedir.
8. **Checkpoint:** nas etapas marcadas acima, parar e esperar o Marcelo antes da seguinte.

Economia de tokens: uma etapa por sessão (duas nas grandes), leitura do antigo por trecho, núcleos já publicados (sem
recompilar), só os testes da etapa (a suíte inteira roda no CI), ROMs geradas pelos testes.

## Regras que não mudam (herdadas do projeto antigo)

- **Nunca** commitar, distribuir ou indicar onde baixar ROM, BIOS ou jogo (nem em teste ou doc).
- O repositório antigo (`kofstation-old`) não é alterado por esta migração; ele continua sendo o produto até a troca.
- **Nunca criar um repositório chamado `KOFSnes`**: os atualizadores antigos baixam por esse nome (redireciona pro
  `kofstation-old`).
- Commits em português, sem nome de modelo de IA.
