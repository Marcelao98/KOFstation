# Agentes com tarefa (orquestração)

> Desde 08/11 o Marcelo usa um agente como **orquestrador** (segue o ROADMAP, revisa e junta) e outros agentes
> (Codex, outro Claude…) com **uma tarefa cada**, em paralelo. Este arquivo vale pra quem recebeu uma tarefa daqui.

## Se você recebeu uma tarefa

1. Leia o [AGENTS.md](../../AGENTS.md) (regras que não mudam) e **só o arquivo da sua tarefa** nesta pasta. Ele traz
   o contexto que você precisa; não precisa ler o JORNAL nem o ROADMAP inteiros.
2. **Branch:** parta da `claude/busy-ritchie-wrvk8h` (a mais nova do orquestrador) e crie a sua com o nome que a
   tarefa diz. Trabalhe e faça push **só nela**. Não abra PR, não faça merge, não mexa na `main` nem na
   `teste-binarios`.
3. **Só os arquivos da tarefa.** Cada tarefa tem a lista do que pode mexer. Precisou de outro? Mexa o mínimo e diga
   no relatório por quê (o orquestrador junta tudo e conflito custa caro).
4. **Não edite** `docs/JORNAL.md`, `docs/ROADMAP.md`, `docs/SITUACAO.md`, `README.md` nem `AGENTS.md`: quem atualiza é
   o orquestrador, a partir do seu relatório.
5. **Antes de cada push:** `pnpm check`; se mexeu no Rust, `pnpm check:rust`; se mexeu em tela ou jogo, `pnpm e2e`.
   No container, o teste `kof-nativo --test pcsx` pode morrer com SIGILL (CPU): é sabido; rode
   `cargo test --workspace --no-fail-fast` pra ver o resto.
6. **Ao terminar:** preencha a seção **Relatório** no fim do arquivo da sua tarefa (o que fez, números, o que ficou de
   fora, comandos pra conferir) e faça o último push. O orquestrador revisa a branch e traz pra dele.

## Montar o ambiente

```bash
pnpm install
```

```bash
KOF_NATIVOS=todas pnpm nucleos
```

```bash
sudo apt-get install -y libasound2-dev genisoimage libegl1 libegl-mesa0 libgl1-mesa-dri
```

(se o `apt-get install` não achar os pacotes, rode `sudo apt-get update` antes.) O app antigo, pra comparar (só
leitura, nunca mexa nele): `git clone https://github.com/Marcelao98/kofstation-old`.

## Tarefas abertas

| Tarefa | Arquivo | Branch | Situação |
|---|---|---|---|
| A · Ritmo dos quadros no WebAssembly (o "antigo mais liso") | [A-ritmo-wasm.md](A-ritmo-wasm.md) | `agente-a/ritmo-wasm` | aberta |
| B · Catálogo das opções de emulação (dados do M16.4) | [B-opcoes-nucleo.md](B-opcoes-nucleo.md) | `agente-b/opcoes-nucleo` | aberta |
