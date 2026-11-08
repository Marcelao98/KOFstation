# Tarefa B · Catálogo das opções de emulação (dados do M16.4)

**Branch:** `agente-b/opcoes-nucleo` (a partir da `claude/busy-ritchie-wrvk8h`). Leia antes o [LEIA-ME](LEIA-ME.md).

## O contexto

O M16 é "rodar bem, não só rodar". O passo **M16.4** dá ao Marcelo opções de emulação por console (do PS1 em diante),
com perfis **⚡ Rápido / ⚖ Equilibrado / 🎯 Fiel**, uma parte **Avançado** e ajuste por jogo (o Shadow of the Colossus
pode ter o dele). A arquitetura está em [../DIAGNOSTICO.md](../DIAGNOSTICO.md), seção "4. Opções de emulação".

**Sua parte são os dados: o catálogo, puro e testado.** A tela, as camadas (geral → console → jogo) e o "vale na
hora" ficam com o orquestrador, que usa o que você entregar.

O que o app passa hoje pros núcleos (`packages/engine/src/nucleos.ts`):

- PS2 (só nativo, LRPS2 = PCSX2 do libretro, commit `38d3a83f` de `github.com/libretro/ps2`):
  `pcsx2_renderer: 'OpenGL'`, `pcsx2_ee_cycle_skip: 'Mild Underclock'`, `pcsx2_bios: 'bios-ps2.bin'`.
- PS1 (PCSX-ReARMed, commit `c8816799`, nativo com recompilador e WebAssembly de reserva):
  `pcsx_rearmed_frameskip_type`, `pcsx_rearmed_frameskip_interval`, e `pcsx_rearmed_drc: 'enabled'` no nativo.
- N64 (Mupen64Plus em WebAssembly, `mupen64` no `nucleos.ts`): as opções que ele já recebe estão lá.

Os núcleos nativos declaram as opções pelo `SET_VARIABLES` do libretro (`"Descrição; padrão|valor2|valor3"`): o
`kof-nativo` recusa as opções v1/v2 de propósito (`crates/kof-nativo/src/nucleo.rs`, `cb_environment`), então o núcleo
cai nesse formato. Hoje o `nucleo.rs` só guarda o **padrão** de cada uma.

## O que fazer

1. **`packages/domain/src/opcoes-nucleo.ts`** (puro: sem DOM, sem rede, sem importar outro pacote), exportado no
   `index.ts` do domain:

   ```ts
   export type Perfil = 'rapido' | 'equilibrado' | 'fiel';
   export interface ValorDeOpcao { valor: string; nome: string }        // valor EXATO que o núcleo aceita
   export interface OpcaoDeNucleo {
     chave: string;                     // ex.: 'pcsx2_ee_cycle_skip'
     nome: string;                      // em português, curto
     dica: string;                      // português do Brasil, 1 frase: o que muda e quando usar
     grupo: 'imagem' | 'velocidade' | 'som' | 'precisao' | 'outros';
     valores: ValorDeOpcao[];
     padrao: string;                    // o padrão do núcleo
     naHora: boolean;                   // o núcleo relê sem reabrir o jogo (GET_VARIABLE_UPDATE)?
     perfis: Record<Perfil, string>;    // valor em cada perfil
     avancada?: boolean;                // só aparece no Avançado
   }
   export const OPCOES_DE_NUCLEO: Partial<Record<SistemaId, OpcaoDeNucleo[]>>;
   export function valoresDoPerfil(sistema: SistemaId, perfil: Perfil): Record<string, string>;
   export function conferirOpcoes(sistema: SistemaId, v: Record<string, string>): { ok: boolean; erros: string[] };
   ```

   Pelo menos **PS2** (resolução interna, EE cycle skip/rate, MTVU, filtro de textura, mipmap, pré-carregar texturas,
   cache de shaders, o que houver de ritmo/vsync/som) e **PS1** (recompilador, frameskip, resolução/Neon, dithering);
   N64 se der. Use as chaves e os valores **do commit fixado** de cada núcleo (o `libretro_core_options.h` ou o
   `SET_VARIABLES` do código). O **Equilibrado** do PS2 tem que bater com o que o app usa hoje (o
   `Mild Underclock`, que deixou o Shadow of the Colossus em 60 fps num Ryzen 5 4600H). `pcsx2_bios` e
   `pcsx2_renderer` não entram no catálogo: são do app, fixos.
2. **Teste** (`opcoes-nucleo.test.ts`): todo `padrao` e todo valor de perfil existe em `valores`; nenhuma chave
   repetida; `valoresDoPerfil('ps2','equilibrado')` inclui o `pcsx2_ee_cycle_skip` de hoje; `conferirOpcoes` recusa
   chave e valor desconhecidos, com mensagem em português.
3. **Conferir com o núcleo de verdade.** No `crates/kof-nativo/src/nucleo.rs`, guarde também a lista completa que o
   núcleo declara no `SET_VARIABLES` (chave → descrição e valores) e exponha num método (ex.:
   `Nucleo::opcoes_declaradas()`). Escreva `crates/kof-nativo/tests/opcoes.rs`, que carrega o `.so` de
   `third_party/cores/nativos/linux-x64/` e confere que **cada chave e cada valor do catálogo existe no núcleo**. Pra
   o Rust ler o catálogo, gere um JSON de fixture a partir dele (por um teste do domain que falha se o JSON estiver
   desatualizado, como o `packages/contracts/fixtures`). Se o `.so` não estiver na pasta, o teste diz por que e passa.
   Se o núcleo só declara as opções depois de abrir um jogo, diga isso no relatório e confira o que der.

## Pode mexer

`packages/domain/src/opcoes-nucleo.ts` e o teste (novos), `packages/domain/src/index.ts` (uma linha),
`crates/kof-nativo/src/nucleo.rs` (só guardar e expor as opções declaradas), `crates/kof-nativo/tests/opcoes.rs`
(novo), a fixture JSON (onde fizer sentido, ex.: `packages/contracts/fixtures/opcoes-nucleo.json`).

**Não mexa:** a tela (`apps/`), `engine/nucleos.ts` (o orquestrador liga o catálogo depois), `filho.rs`, o contrato do
nativo.

## Pronto quando

- O catálogo do PS2 e do PS1 com dicas em português, perfis e testes.
- O teste Rust confere o catálogo contra o `.so` de verdade (ou o relatório diz claramente o que não deu e por quê).
- `pnpm check` e `pnpm check:rust` verdes.

## Relatório

**Feito.** Branch `agente-b/opcoes-nucleo`.

**O que entrou**
- `packages/domain/src/opcoes-nucleo.ts` (exportado no `index.ts`): tipos `Perfil`, `ValorDeOpcao`, `OpcaoDeNucleo`
  (+ `PERFIS`, `GrupoDeOpcao`), `OPCOES_DE_NUCLEO`, `valoresDoPerfil`, `conferirOpcoes`. **PS2: 23 opções; PS1: 15.**
  N64 ficou de fora (o Mupen64Plus é só WebAssembly e não há `.so` pra conferir).
- PS2: resolução interna, EE cycle skip/rate, MTVU, VU1 instantâneo, DVD rápido, filtro de textura, trilinear,
  anisotrópico, precisão das transparências, dithering, download da imagem, deinterlace, FPU/VU exatos, fast boot,
  widescreen/no-interlacing hint, cache de shaders, preload frame data, LOD0 (sem mipmap). Fora: `pcsx2_bios`,
  `pcsx2_renderer` (do app) e as `pcsx2_pgs_*` (do renderizador paraLLEl; o app usa OpenGL).
- PS1: recompilador, frameskip (tipo, intervalo, limite), desenho e som em thread, interpolação e reverb do som,
  Enhanced Resolution, dithering, icache, exceções, sem stalls, CD turbo, região.
- **Equilibrado = o que o app usa hoje**: PS2 = padrões do núcleo + `pcsx2_ee_cycle_skip: 'Mild Underclock'`;
  PS1 = `frameskip_type: auto`, `frameskip_interval: 3`, `drc: enabled` (teste garante).
- `packages/domain/src/opcoes-nucleo.test.ts`: padrões/perfis existem nos valores, sem chave repetida, dicas
  preenchidas, Equilibrado bate com o app, `conferirOpcoes` (chave/valor/sistema desconhecidos, mensagens em
  português) e a **fixture** `packages/contracts/fixtures/opcoes-nucleo.json` (falha se desatualizada;
  `KOF_ATUALIZAR_FIXTURES=1 pnpm --filter @kof/domain test` reescreve). Adicionei a fixture ao `.prettierignore`
  (o JSON é gerado por `JSON.stringify`, não pelo prettier).
- `crates/kof-nativo/src/nucleo.rs`: o `SET_VARIABLES` agora guarda o texto completo de cada opção;
  `Nucleo::opcoes_declaradas() -> Vec<OpcaoDeclarada>` (`chave`, `descricao`, `valores`, o 1º é o padrão) e
  `analisar_opcao()`.
- `crates/kof-nativo/tests/opcoes.rs`: abre os dois `.so` de verdade (PS1 com PS-X EXE de um laço; PS2 com BIOS
  falsa + ISO do genisoimage, como o `lrps2.rs`) e confere chave, valores, perfis, padrão = 1º valor do núcleo e
  "vale na hora" ≠ "(Restart)" na descrição. Sem o `.so`, avisa e passa.

**O que o núcleo de verdade declarou:** PS1 (PCSX-ReARMed) **53** opções, PS2 (o `.so` do manifesto, que se
apresenta como *ParaLLEl PS2*) **82**. Os dois declaram tudo já na abertura do jogo (não aceitam abrir sem jogo, daí
o jogo mínimo). Nenhuma divergência entre o catálogo e o `.so`.

**Fonte das chaves:** o próprio `.so` do commit fixado (`pnpm nucleos`), lido pelo teste; não consultei o
`libretro_core_options.h` do GitHub.

**Ressalvas pro orquestrador**
- `naHora`: eu só consigo confirmar o lado "(Restart)" (o núcleo marca na descrição). As outras estão como `true`
  (ou `false` por palpite onde o núcleo não diz, ex.: `pcsx2_mtvu`, `pcsx2_instant_vu1`, `pcsx_rearmed_spu_thread`);
  vale testar com `variavel` ao vivo antes de prometer "vale na hora" na tela.
- Os valores dos perfis Rápido/Fiel são uma proposta (só o Equilibrado é medido); ajuste com o jogo na mão.
- A fixture traz também `perfis` (o Rust confere que cada valor de perfil existe no núcleo).

**Conferir**
```bash
pnpm --filter @kof/domain test
cargo test -p kof-nativo --test opcoes -- --nocapture   # precisa do KOF_NATIVOS=todas pnpm nucleos e do genisoimage
pnpm check && pnpm check:rust   # no container, o pcsx.rs morre com SIGILL (sabido); cargo test --workspace --no-fail-fast: o resto passa
```
