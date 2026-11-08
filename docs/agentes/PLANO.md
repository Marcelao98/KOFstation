# Plano do resto do roadmap em tarefas (orquestração)

> Combinado em 08/11: o Marcelo usa um agente como **orquestrador** (este plano, as decisões, a revisão e a junção das
> branches, o JORNAL/ROADMAP/SITUACAO, os pacotes da `teste-binarios`) e outros agentes nas **tarefas** abaixo. Cada
> tarefa vira um arquivo `docs/agentes/<letra>-<nome>.md` **na hora de começar** (escrito antes, o contexto envelhece).
> Regras pra quem faz tarefa: [LEIA-ME.md](LEIA-ME.md).

## Como ler

- **Depende de:** o que tem que estar pronto (e junto na branch do orquestrador) antes de começar.
- **Mexe em:** a área. Duas tarefas que mexem no mesmo arquivo "quente" **não rodam juntas**.
- **Tamanho** (pro agente da tarefa): P até ~150 mil tokens, M ~150–400 mil, G mais que isso (divida se puder).
- **⏸ Marcelo:** precisa dele (jogar, gravar, instalar, decidir).

Arquivos quentes (uma tarefa por vez): `apps/desktop/src/stores/jogo.ts`, `packages/contracts/*`,
`crates/kof-nativo/src/{nucleo,filho}.rs`, `crates/kof-app/src/api.rs`, `packages/engine/src/worker.ts`.

## Ondas

### Onda 1: agora (independentes entre si)

| Tarefa | O quê | Depende de | Mexe em | Tamanho | Estado |
|---|---|---|---|---|---|
| **A** | Ritmo dos quadros no WebAssembly (o "antigo mais liso"): medir antigo × novo, corrigir | — | `engine/worker.ts`, `tempo.ts`, `useTelaDoJogo.ts` | M | [aberta](A-ritmo-wasm.md) |
| **B** | Catálogo das opções de emulação (PS2, PS1), conferido contra o núcleo de verdade | — | `domain/opcoes-nucleo.ts`, `kof-nativo/nucleo.rs` (só guardar as declaradas) | M | [aberta](B-opcoes-nucleo.md) |
| **C** | **T.1 Paridade:** fechar os itens não verificados do `PARIDADE.md`, com teste automático onde der (pixels, som, arquivos contra o antigo) | — | `docs/PARIDADE.md`, testes novos, `tools/` | M | a escrever |
| **D** | **M14.2 Controle de toque e layout do celular** (os 6 modelos do `android.js`/`android.css` do antigo), feito e testado no navegador com tela de celular, antes da casca Java | — | `apps/desktop/src/components/` (novos), CSS, `stores/entrada.ts` | M | a escrever |

### Onda 2: depois do que a onda 1 entregar

| Tarefa | O quê | Depende de | Mexe em | Tamanho |
|---|---|---|---|---|
| **E** | **M16.4 Tela das opções de emulação:** perfis, Avançado, por jogo (camadas D19), "vale na hora" (`Comando::Variavel`) ou "ao reabrir" | B | `screens/Estados/OpcoesEmu.tsx`, `stores/jogo.ts`, `engine/nucleos.ts` | M |
| **F** | **M16.5a Memória do Zone of the Enders 2** | ⏸ Marcelo manda o `.zip` e o erro | `kof-nativo`, `kof-app/nativo.rs` | P–M |
| **G** | **M16.5b PS2 pelos relatórios:** o culpado que o diagnóstico do SotC apontar (shader na 1ª vez, EE, som, leitura) | ⏸ relatório do SotC; F (mesmos arquivos) | `kof-nativo` | M |
| **H** | **M14.1 A casca Java do APK atual serve o app novo** (adaptador `android` em `apps/desktop/src/platform/`) | — (pode já, se tiver o Android SDK no ambiente do agente) | `platform/android.ts` (novo), casca Java | M–G |

### Onda 3: celular, em cima do H

| Tarefa | O quê | Depende de | Mexe em | Tamanho |
|---|---|---|---|---|
| **I** | **M14.3 Pasta de ROMs e biblioteca no celular** | H | casca Java, `platform/android.ts` | M |
| **J** | **M14.4 PS1 e N64 nativos no celular** (`kofnativo.c` do antigo, `Ps1Jogo.java`/`N64Jogo.java`) | H | casca Java, `engine/` (adaptador do nativo do celular) | G |
| **K** | **M14.5 Atualizador do APK** | H | casca Java | P–M |

### Sempre que aparecer

- **Correções dos testes do Marcelo** (M9–M13, M15, PS2): cada bug vira uma tarefa P com o passo a passo dele, o
  `.zip` do diagnóstico ou o pacote do F9 (`pnpm bug`). O orquestrador separa as que mexem em arquivo quente.

### Fica com o orquestrador

- Escrever cada tarefa na hora, revisar a branch (diff, testes, CI Linux e Windows), trazer pra branch dele e
  resolver conflito.
- Decisões (`DECISIONS.md`), JORNAL, ROADMAP, SITUACAO e README; pacote da `teste-binarios` a cada onda.
- **T.2** (o antigo publica a última versão que leva pro novo): por último, quando o Marcelo decidir.

## Custo estimado pro orquestrador

Por tarefa: escrever ~10–25 mil tokens, revisar e juntar ~20–60 mil. As 11 tarefas: ~350–900 mil, contra ~2–3,5
milhões se ele mesmo escrevesse tudo.
