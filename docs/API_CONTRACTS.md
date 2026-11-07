# Contratos entre o app e o backend (v0)

> Rascunho da F2. Vira código em `packages/contracts` (TS) e nos crates (serde) a partir da F4a; cada comando entra
> no contrato **na etapa que precisa dele**, com fixture testada dos dois lados. Princípio: nenhum comando genérico de
> shell ou de arquivo; todo caminho é relativo a um escopo conhecido.

## 1. Envelope

```jsonc
// pedido
{ "id": 17, "cmd": "library.scan", "args": { "root": "kof-games" } }
// resposta certa
{ "id": 17, "ok": true, "data": { "files": 2847 } }
// resposta com erro
{ "id": 17, "ok": false, "error": { "code": "ROOT_MISSING", "message": "A pasta Kof Games não foi encontrada.", "details": { "path": "/home/marcelo/Kof Games" } } }
// evento (backend → app, sem id)
{ "event": "library.scan.progress", "data": { "seen": 1200 } }
```

- `id`: inteiro crescente por conexão. Resposta sempre com o mesmo `id`.
- `error.code`: MAIÚSCULAS_COM_SUBLINHADO, estável (o app traduz pela tabela de mensagens). `message` é só pra log.
- Binário (pedaço de arquivo, save, savestate): **casca local (D2 = B), implementado:** `POST /api/<cmd>` com corpo
  `application/octet-stream` e os argumentos em JSON no cabeçalho `X-Kof-Args` (percent-encoding); resposta binária
  vem como `application/octet-stream`. Nunca base64 em JSON. No TS: `Backend.lerBinario` / `Backend.enviarBinario`.
- Na casca local o envelope é o próprio HTTP: corpo = `args`, resposta 200 = `data`, resposta de erro = `ContractError`
  (o status HTTP é só informativo; o app olha o `code`).
- Versão: `app.info` devolve `contractVersion`; app e backend recusam versões incompatíveis com `CONTRACT_MISMATCH`.

## 2. Escopos de caminho

| Escopo | Significa |
|---|---|
| `kof-games` | a raiz escolhida pelo usuário (Kof Games) |
| `app-data` | pasta de dados do app (`~/.local/share/KOFstation`, `%LOCALAPPDATA%\KOFstation`) |
| `picked:<token>` | arquivo/pasta que o usuário escolheu no diálogo (token de uso único dado pelo backend) |

Todo `path` nos comandos é **relativo** ao escopo; `..`, caminho absoluto e link simbólico pra fora do escopo dão
`PATH_OUTSIDE_SCOPE`.

## 3. Comandos (planejados; etapa em que entram)

| Comando | Args → Data | Erros | Etapa |
|---|---|---|---|
| `app.info` | — → `{version, contractVersion, os, arch, dataDir}` | — | F4a |
| `app.vivo` | — → `null` (a página manda a cada 5 s; sem sinal por 30 s, o `kofstation` encerra) | — | ✅ correção pós-M8 |
| `log.write` | `{level: error\|warn\|info\|debug, target, message, fields?}` → `null` (texto cortado em 8 KB; vai pro log do dia com `target=tela`) | `INVALID_LEVEL`, `INVALID_ARGS` | ✅ M3 (pendente do F4a) |
| `dialog.pick` | (adiado: no navegador em modo app não há diálogo nativo de pasta com caminho; a pasta é digitada/colada, ver D23) | — | — |
| `library.root.get` | — → `{path: string\|null, ok, missing[], sugestao}` (sem escolha: a raiz pela posição do executável em `<Kof Games>/KOFstation/`) | — | ✅ M3.2 |
| `library.root.set` | `{path}` (caminho completo; criada se o pai existe) → igual ao `get`; cria a árvore | `INVALID_ARGS`, `INNER_FOLDER`, `NOT_A_DIRECTORY`, `NOT_FOUND`, `PERMISSION_DENIED` | ✅ M3.2 |
| `library.scan` | `{exts[]}` → `{root, files: RomFile[]}` (Games até 2 níveis; `.zip` traz o diretório; `.bin/.img/.iso` trazem `cd`) | `ROOT_MISSING` | ✅ M3.2 (sem eventos de progresso: a varredura não lê os arquivos inteiros) |
| `library.crc` | `{items: {path, sistema}[]}` → `{crcs: {path: crc}}` (No-Intro; cache em `<dados>/cache/crc.json`) | `ROOT_MISSING`, `PATH_OUTSIDE_SCOPE` | ✅ M3.2 |
| `file.read` | `{scope: "kof-games", path, offset?, length?}` → binário | `NOT_FOUND`, `INVALID_ARGS`, `PATH_OUTSIDE_SCOPE` | ✅ M3.2 |
| `file.stat` | `{scope: "kof-games", path}` → `{size, dir}` (o tamanho dos .bin de um .cue sem ler) | `NOT_FOUND`, `PATH_OUTSIDE_SCOPE` | ✅ correção 07/11 |
| `file.zip.list` | `{scope: "kof-games", path}` → `{size, itens: {nome, tamanho, crc}[]}` (o diretório do zip, sem descompactar) | `NOT_FOUND`, `PATH_OUTSIDE_SCOPE` | ✅ correção 07/11 |
| `file.zip.read` | `{scope: "kof-games", path, entrada, length?}` → binário (os primeiros `length` bytes de uma entrada, descompactados; guardado ou deflate) | `NOT_FOUND`, `BAD_ZIP`, `PATH_OUTSIDE_SCOPE` | ✅ correção 07/11 |
| `library.inventory` | — → `{files: (RomFile & {cue?: string[]})[], dirs[]}` (tudo de Games e Novos, até 6 níveis) | `ROOT_MISSING` | ✅ M3.3 |
| `library.organize.plan` | **no TS** (`domain/organizar.ts` `planejarOrganizacao`, sobre o `library.inventory`): `{moves: Move[], limpar[]}` | — | ✅ M3.3 |
| `library.organize.apply` | `{moves, limpar?}` → `{done, failed: {move, code, message}[], removed[]}` (nome repetido vira "nome (2).ext"; pasta inteira junta com a que já existe) | por movimento: `NOT_FOUND`, `PATH_OUTSIDE_SCOPE`, `IO_ERROR` | ✅ M3.3 |
| `library.import` | `{pasta, nome}` + binário → `{stored: path\|null}` (null = já estava lá com o mesmo tamanho) | `ROOT_MISSING`, `PATH_OUTSIDE_SCOPE` | ✅ M3.3 |
| `store.list` | `{store, prefix?}` → `{key, meta, size}[]` (lojas: jogos, saves, estados, autos, stats, musicas, capas, visual, roms) | `INVALID_ARGS` | ✅ M3.4 |
| `store.get` / `store.meta` | `{store, key}` → binário / JSON | `NOT_FOUND` | ✅ M3.4 |
| `store.put` | `{store, key, meta}` + binário (pode ser vazio) → `null` (gravação atômica) | `DISK_FULL`, `IO_ERROR` | ✅ M3.4 |
| `store.delete` / `store.space` | `{store, key}` → `null` / — → `{store, bytes, items}[]` | — | ✅ M3.4 |
| `cover.get` | `{acervo, chave, nomes[], guardada?}` → PNG (só de `raw.githubusercontent.com/libretro-thumbnails/`; cache em `<dados>/cache/capas`, falha lembrada 7 dias) | `NOT_FOUND`, `NETWORK` | ✅ M3.6 |
| `config.read` | `{doc: "config"}` → `{versao: 1, valores: {chave: texto}}` (arquivo ilegível vira `.estragado` e começa do zero) | `SCHEMA_TOO_NEW`, `INVALID_ARGS` | ✅ M4.1 |
| `config.write` | `{doc, data: {versao, valores}}` → `null` (valores só texto; gravação atômica, JSON indentado) | `SCHEMA_TOO_NEW`, `INVALID_ARGS` | ✅ M4.1 |
| `backup.import` / `backup.export` | **no TS** (`app-core/backup.ts`, formato em `domain/guarda.ts`), sobre `store.*` e `config.*`: o `.kofsave` é lido/montado no app (o arquivo vem do seletor/arrastar e sai como download) | `NOT_A_KOFSAVE` (mensagem) | ✅ M4.2/M4.3 |
| `saves.read` / `saves.write` / `saves.list` | `{key}` → binário + `{when}` | `NOT_FOUND` | M5 |
| `states.list` / `.save` / `.load` / `.delete` | `{game, slot?}` | `NOT_FOUND`, `DISK_FULL` | M5 |
| `bios.list` / `bios.import` | `{token}` → `BiosInfo[]` | `UNKNOWN_BIOS` | M11 |
| `native.ps2.start` / `.stop` | `{}` → `{session}` | `SIDECAR_MISSING`, `SIDECAR_CRASHED` | M12 |
| `native.ps2.send` | um dos comandos tipados do protocolo kofnativo | `NOT_RUNNING` | M12 |
| `net.*` | os pedidos da API local de `rede/PROTOCOLO.md` (`eu`, `lista`, `parear`, `conectar`, `enviar`...) | os do protocolo, enumerados | M13 |
| `app.atualizacao` | `{procurar?: bool}` → `{versao, commit, ligado, motivo?, situacao: parado\|procurando\|emDia\|pronta\|erro, nova?, baixados, bytes, erro?}`. `procurar: true` começa a procurar numa linha separada (a página pergunta de novo até sair de `procurando`); a versão baixada entra na **próxima abertura** (`kof-atualiza::aplicar` no começo do `main`). Desligado rodando do código, sem a chave compilada ou com `nao-atualizar` na pasta. Num pacote, o `app.info.version` é a do `versao.txt` | no `erro`: `NETWORK` (inclui assinatura que não confere e arquivo diferente do manifesto), `PATH_OUTSIDE_SCOPE`, `IO_ERROR` | ✅ M15.1 (D34) |

Eventos previstos: `library.scan.progress`, `native.ps2.state`, `native.ps2.frame` (binário), `native.ps2.read`
(pedido de pedaço de disco), `net.*` (os do PROTOCOLO.md), `update.progress`, `backend.error` (erro sem pedido).

## 4. Tipos base (rascunho)

```ts
type SystemId = 'snes' | 'gb' | 'nes' | 'md' | 'sms' | 'gg' | 'gba' | 'neogeo' | 'ps1' | 'n64' | 'ps2';
interface RomFile { path: string; size: number; modified: number; zip?: {nome, tamanho, crc}[]; cd?: 'ps1' | 'ps2' | null }
// o sistema NÃO vem do Rust: o TS decide pelos fatos (domain/deteccao.ts `sistemaDoArquivo`)
interface Move { from: string; to: string /* pasta de destino */; reason: 'novo' | 'solto' | 'pasta-errada' | 'faixa-do-cd' | 'cd' }
interface BiosInfo { system: SystemId; file: string; sha256: string; size: number; ok: boolean }
interface ContractError { code: string; message: string; details?: Record<string, unknown> }
```

## 5. Núcleo nativo (M11b, D32; `crates/kof-nativo`, `packages/contracts/src/nativo.ts`)

O `kofstation` abre `kofstation --nativo` (um processo por jogo). **stdin:** uma linha JSON
`{nucleo, jogo?, sistema, saves, token, origem?, variaveis?, sem_som?}`; fechar o stdin = fechar o jogo. **stdout:** uma
linha, `{porta, nucleo: {nome, versao, extensoes, caminho_inteiro}, taxaSaida}` ou `{erro: {codigo, mensagem}}`
(`CORE_FAILED`, `INVALID_ARGS`). **stderr:** log (o supervisor guarda as últimas 300 linhas).

A página conecta em `ws://127.0.0.1:<porta>/?t=<token>` (sem token, token errado ou `Origin` diferente da do app = HTTP
403). Uma página por vez: a nova derruba a anterior e recebe `pronto` de novo.

| Direção | Mensagem |
|---|---|
| página → | texto `{cmd: pausar\|continuar\|reiniciar\|fechar}`, `{cmd: volume, valor 0–1}`, `{cmd: turbo, fator 1–8}`, `{cmd: variavel, chave, valor}`, `{cmd: salvarEstado\|lerBateria, pedido}` |
| página → | binário `[2, jogador, botões u16, eixos 4×i16]` (máscara do libretro); `[4\|6, 0,0,0, pedido u32, tamanho u32] + bytes` (carregar estado / gravar bateria) |
| → página | texto `{tipo: pronto, nucleo, versao, largura, altura, proporcao, fps, taxa, taxaSaida}`, `geometria`, `desempenho {quadros, amostras, atrasoMs, faltas}` (1/s), `ok {pedido}`, `erro {pedido, codigo, mensagem}`, `fim {motivo}` |
| → página | binário `[1, 0,0,0, largura u16, altura u16, número u32] + RGBA` (só o mais novo); `[3\|5, 0,0,0, pedido u32, tamanho u32] + bytes` (estado / bateria) |

Números em little-endian. Exemplos testados dos dois lados: `packages/contracts/fixtures/nativo.json`.

## 6. Contratos que continuam iguais ao antigo (compatibilidade)

- `rede/PROTOCOLO.md` v1 (entre aparelhos): **igual**, pra parear com o APK atual.
- Protocolo do kofnativo (cabeçalho de `pc-nativo/kofnativo.c`): igual por dentro; muda só quem conversa com ele (o
  Rust, com token) — D11.
- Formatos de arquivo: `.kofsave` (`KOFSAVE1`), `.kofvisual`, `.spc`, `kofbug-*.json.gz`, savestates: **iguais**.
