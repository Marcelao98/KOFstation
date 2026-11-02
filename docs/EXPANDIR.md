# Como acrescentar coisas e como achar defeito

Guia curto pra quem (gente ou agente) vai mexer no KOFstation novo. A regra de ouro continua a do
[AGENTS.md](../AGENTS.md): o app antigo é a especificação ([PARIDADE.md](PARIDADE.md)), e cada camada só fala com a de
baixo (o ESLint barra o resto).

```
apps/desktop (telas React, stores Zustand)  →  packages/app-core (casos de uso)  →  domain (puro) / engine (núcleo, som, imagem)
                                                                                 →  Backend (porta)  →  Rust (crates/)
```

---

## 1. Acrescentar

### Um comando novo do Rust

1. **Contrato primeiro:** uma linha na tabela de [API_CONTRACTS.md](API_CONTRACTS.md) (args → data, códigos de erro, etapa).
2. **Lógica num crate** (`crates/kof-files` pra arquivo, `kof-core` pro resto), com teste em `crates/<crate>/tests/`.
   Caminho que vem do app é sempre relativo a um escopo e passa por `kof_files::escopo::resolver` (que recusa `..`,
   caminho absoluto e link simbólico pra fora).
3. **Erro com código:** variante nova em `crates/kof-core/src/erro.rs` (`KofError`), com `codigo()` em
   MAIÚSCULAS_COM_SUBLINHADO. Nada de `unwrap` em coisa que vem de fora.
4. **Despacho:** um `match` em `crates/kof-app/src/api.rs` (`Estado::chamar`). Argumentos numa `struct Args…` com
   `#[serde(deny_unknown_fields)]`. JSON sai com `Saida::Json`, bytes com `Saida::Bin`; bytes que chegam vêm em `corpo`.
5. **Backend de teste:** o mesmo comando, com os mesmos códigos de erro, em
   `apps/desktop/src/platform/teste-comandos.ts` (é o que o `pnpm dev` e o `pnpm e2e` usam).
6. **Caso de uso:** uma função em `packages/app-core/src/` que chama `backend.chamar` / `lerBinario` / `enviarBinario`.
   As telas nunca chamam o backend direto.
7. Mensagem em português pro código novo em `packages/app-core/src/erros.ts`, se a pessoa puder ver.

### Uma tela nova

1. Olhe a marcação dela no `web/pagina.html` do antigo e **use os mesmos ids e classes** (o `estilo.css` do antigo já
   está inteiro em `apps/desktop/src/styles/antigo/`): o visual sai igual sem CSS novo.
2. Componente em `apps/desktop/src/screens/<Nome>/<Nome>.tsx`; estado e ações numa store em `apps/desktop/src/stores/`.
3. Se for uma "janela" da pilha (Voltar, Esc, pausa o jogo), acrescente o id em `TelaId` (`stores/telas.ts`) e mostre no
   `App.tsx`. Se for uma gaveta/diálogo por cima (como o painel de imagem), uma flag na store e o componente no `App.tsx`.
4. As ações do menu (`app/menus.ts`) passam pela função `acao()` em `app/acoes.ts`; tire a etapa do mapa `ETAPA`
   quando a ação passar a existir.
5. Teste de fluxo em `apps/desktop/e2e/<tela>.spec.ts` (Playwright, com o backend de teste e ROMs geradas pelo próprio
   teste em `e2e/roms.ts`).

### Uma configuração nova

- Use **o mesmo nome de chave do antigo** (o `ler('x')`/`guardar('x', …)` do `app.js`): `config().ler('x')` e
  `config().guardar('x', v)` em `apps/desktop/src/stores/config.ts`. Valor sempre texto. Assim ela viaja no `.kofsave`
  dos dois apps. Coisa que não pode viajar (mudo, volume, aparelho) entra no `NAO_LEVAR` (`domain/config.ts`).
- Configuração por console ou por jogo: `chave.<sis>` e `chave.jogo.<jogoId>`; leia com `valorEmCamadas`/
  `objetoEmCamadas`.

### Uma loja de dados nova (o que era uma loja do IndexedDB do antigo)

- Nome na lista `LOJAS` (`crates/kof-files/src/loja.rs`), no tipo `Loja` (`app-core/armazem.ts`) e no backend de teste.
  Use o mesmo formato de registro do antigo (é o que deixa o `.kofsave` passar sem conversão).

### Um sistema novo (núcleo)

1. Núcleo no manifesto `third_party/cores/manifest.json` (SHA-256; nunca no git) e `pnpm nucleos`.
2. `packages/engine/src/nucleos.ts` (`NUCLEOS`: tamanho, opções, proporção, `semRebob` se o estado for grande).
3. Extensões e nome em `packages/domain/src/sistemas.ts`; pasta em `PASTA_SIS` (`domain/deteccao.ts`); acervo de capas
   em `domain/capas.ts`; ações e nomes dos botões em `domain/entrada.ts`.
4. Teste de paridade em `packages/engine/test/` (ROM gerada; com `KOF_ANTIGO=<pasta do kofstation-old>` compara com o
   adaptador do antigo quadro a quadro).

### Filtro de imagem ou moldura

- **Não mexa** em `engine/src/visual/kofvisual.js` nem em `engine/src/molduras/kofmolduras.js`: são cópias do antigo,
  conferidas por SHA-256 (D26). Filtro novo nasce no antigo (ou numa decisão nova, com o Marcelo).

---

## 2. Achar defeito

### Onde olhar primeiro

| O quê | Onde |
|---|---|
| Log do app (Rust + os erros da tela) | `~/.local/share/KOFstation/logs/kofstation.log.<dia>` (Windows: `%LOCALAPPDATA%\KOFstation\logs\`). Linhas da tela têm `target=tela` |
| Mais detalhe no log | rode com `KOF_LOG=debug kofstation` |
| Configurações | `<dados>/config/config.json` (texto, dá pra ler e editar com o app fechado; estragado vira `.estragado`) |
| Saves, estados, jogos | `<dados>/lojas/<loja>/` (um `.json` + um `.bin` por registro) |
| Pasta Kof Games escolhida | `<dados>/config/raiz.json` |
| Capas que falharam | `<dados>/cache/capas/<acervo>/<nome>.falhou` (apague pra tentar de novo antes dos 7 dias) |
| O console do navegador | o KOFstation abre um Chromium com perfil próprio: Ctrl+Shift+I abre o DevTools |

Todo erro mostrado na tela (`avisarErro`), todo `window.onerror` e toda promessa rejeitada vão pro log do Rust pelo
comando `log.write` (`packages/app-core/src/log.ts`). Se o serviço estiver fora, ficam no console do navegador.

### Rodar sem o Rust

`pnpm dev` abre o app no navegador com o backend de teste (tudo em memória). No console, `__kofTeste` mostra a Kof Games
de mentira (`arquivos`, `raiz`), as lojas (`lojas`) e o log (`log`). `?backend=falha` simula o serviço fora do ar.

### Rodar com o Rust, sem abrir janela

```bash
pnpm build && cargo run --release -p kof-app -- --sem-navegador
```

Ele imprime o endereço com o token; abra num Chromium. Pra testar um comando direto (o token é o da linha impressa):

```bash
curl -s -X POST -H 'X-Kof-Token: <token>' -d '{}' http://127.0.0.1:<porta>/api/library.root.get
```

### Comparar com o app antigo

Clone o `Marcelao98/kofstation-old` (só leitura) e rode os testes com `KOF_ANTIGO=<pasta>`:

```bash
KOF_ANTIGO=~/kofstation-old pnpm --filter @kof/engine test
```

```bash
KOF_ANTIGO=~/kofstation-old pnpm --filter @kof/desktop e2e
```

Eles conferem: imagem e som do núcleo, savestates nos dois sentidos, o rebobinar passo a passo, o `.kofsave`
(`guarda.js`), a base de jogos e os pixels das 42 predefinições do painel de imagem contra o `KOFstation.html` publicado.

### Cuidados que já deram problema

- `pkill -f kofstation` derruba o próprio terminal (casa com a linha de comando): use `pgrep -x kofstation` e `kill`.
- `git status` antes de `git add -A` (sobra de pasta local já entrou num commit).
- Teste de fluxo que aperta tecla logo depois do `goto`: espere o `#home` aparecer (o app carrega a configuração antes).
- Num servidor `vite preview` esquecido aberto, o Playwright reaproveita o build velho: feche antes de rodar `pnpm e2e`.
