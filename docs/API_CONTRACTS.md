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
| `log.write` | `{level: error\|warn\|info\|debug, target, message, fields?}` → `null` (texto cortado em 8 KB; vai pro log do dia com `target=tela`) | `INVALID_LEVEL`, `INVALID_ARGS` | ✅ M3 (pendente do F4a) |
| `dialog.pick` | `{kind: file\|files\|dir, filters?}` → `{token, names[]}` \| `null` | — | M2 |
| `file.read` | `{scope, path, offset?, length?}` → binário | `NOT_FOUND`, `OUT_OF_RANGE`, `PATH_OUTSIDE_SCOPE` | M2 |
| `library.root.get` / `.set` | `{token?}` → `{path, ok, missing[]}` | `NOT_A_DIRECTORY`, `PERMISSION_DENIED` | M3 |
| `library.scan` | `{}` → `{files: RomFile[]}` + eventos `library.scan.progress` | `ROOT_MISSING` | M3 |
| `library.organize.plan` | `{}` → `{moves: Move[]}` | `ROOT_MISSING` | M3 |
| `library.organize.apply` | `{moves}` → `{done, failed: {move, code}[]}` | `CONFLICT` | M3 |
| `library.import` | `{token}` → `{stored: RomFile[]}` | `UNKNOWN_SYSTEM`, `CONFLICT` | M3 |
| `config.read` / `config.write` | `{doc}` → JSON / `{doc, data, version}` → — | `INVALID_VALUE`, `SCHEMA_TOO_NEW` | M4 |
| `backup.import` / `backup.export` | `{token}` → resumo / `{options}` → `{token}` | `NOT_A_KOFSAVE`, `CORRUPT` | M4 |
| `saves.read` / `saves.write` / `saves.list` | `{key}` → binário + `{when}` | `NOT_FOUND` | M5 |
| `states.list` / `.save` / `.load` / `.delete` | `{game, slot?}` | `NOT_FOUND`, `DISK_FULL` | M5 |
| `bios.list` / `bios.import` | `{token}` → `BiosInfo[]` | `UNKNOWN_BIOS` | M11 |
| `native.ps2.start` / `.stop` | `{}` → `{session}` | `SIDECAR_MISSING`, `SIDECAR_CRASHED` | M12 |
| `native.ps2.send` | um dos comandos tipados do protocolo kofnativo | `NOT_RUNNING` | M12 |
| `net.*` | os pedidos da API local de `rede/PROTOCOLO.md` (`eu`, `lista`, `parear`, `conectar`, `enviar`...) | os do protocolo, enumerados | M13 |
| `update.check` / `update.apply` | — → `UpdateInfo` | `SIGNATURE_INVALID`, `NETWORK` | M15 |

Eventos previstos: `library.scan.progress`, `native.ps2.state`, `native.ps2.frame` (binário), `native.ps2.read`
(pedido de pedaço de disco), `net.*` (os do PROTOCOLO.md), `update.progress`, `backend.error` (erro sem pedido).

## 4. Tipos base (rascunho)

```ts
type SystemId = 'snes' | 'gb' | 'nes' | 'md' | 'sms' | 'gg' | 'gba' | 'neogeo' | 'ps1' | 'n64' | 'ps2';
interface RomFile { path: string; size: number; system: SystemId | null; modified: number }
interface Move { from: string; to: string; reason: 'novo' | 'solto' | 'pasta-errada' | 'faixa-do-cd' }
interface BiosInfo { system: SystemId; file: string; sha256: string; size: number; ok: boolean }
interface ContractError { code: string; message: string; details?: Record<string, unknown> }
```

## 5. Contratos que continuam iguais ao antigo (compatibilidade)

- `rede/PROTOCOLO.md` v1 (entre aparelhos): **igual**, pra parear com o APK atual.
- Protocolo do kofnativo (cabeçalho de `pc-nativo/kofnativo.c`): igual por dentro; muda só quem conversa com ele (o
  Rust, com token) — D11.
- Formatos de arquivo: `.kofsave` (`KOFSAVE1`), `.kofvisual`, `.spc`, `kofbug-*.json.gz`, savestates: **iguais**.
