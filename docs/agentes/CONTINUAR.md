# Continuar daqui (passagem do orquestrador, 08/11 à noite)

> Escrito porque o limite do Marcelo estava acabando. Quem pegar agora (Codex local, outro Claude) é o **orquestrador**
> até o Marcelo trocar: segue este arquivo, depois o [PLANO.md](PLANO.md). Regras: [AGENTS.md](../../AGENTS.md).

## O que o Marcelo quer hoje

**Jogar Shadow of the Colossus liso no app novo.** No app antigo (`kofstation-old`) roda tranquilo. Duas queixas:

1. **Engasgadas no PS2** ("umas engasgadas aqui e ali").
2. **Zone of the Enders 2 crashou por falta de memória** (no antigo não acontece). Ele desconfia de memória e leitura
   de disco.

## Onde está cada coisa

- **Branch do orquestrador:** `claude/busy-ritchie-wrvk8h` (tudo junto e enviado; último commit `eb4980a` + este
  arquivo).
- **Pacote de teste:** branch `teste-binarios` (`65bdcf0`): Linux inclui M16.1–M16.3 e as correções A e C. Os artefatos Windows foram preservados de `4058e25` e não incluem a correção C.
- **Feito nesta sessão:** M16.1 (medidor quadro a quadro, CPU por linha), M16.2 (F3 com gráfico), M16.3 (🩺 modo
  diagnóstico: Ajuda → 🩺, exporta `.zip`). Tarefa **A** (ritmo do WebAssembly) conferida e junta: 0 quadros
  pulados/min, igual ao antigo (`tools/medir-ritmo.mjs`). Detalhes no topo do [JORNAL](../JORNAL.md).

## Agentes que estavam rodando (sessões na nuvem, Sonnet)

| Tarefa | Branch onde vão dar push | O quê |
|---|---|---|
| **C** (urgente) | `agente-c/ritmo-nativo` | [C-ritmo-nativo.md](C-ritmo-nativo.md): engasgadas do PS2 |
| **B** | `agente-b/opcoes-nucleo` | [B-opcoes-nucleo.md](B-opcoes-nucleo.md): catálogo das opções de emulação |

Confira com `git fetch origin && git log --oneline claude/busy-ritchie-wrvk8h..origin/agente-c/ritmo-nativo`. Se a
branch não existir, a sessão não terminou ou falhou: rode a tarefa você mesmo (o arquivo dela tem tudo).

## Engasgadas do PS2: a causa que achei (confirmar com número)

Em `crates/kof-nativo/src/filho.rs`, no `laco`: `while saida.guardado_ms() < ALVO_MS && rodou < 8 { … n.rodar … }`
roda 2–3 quadros seguidos quando a placa de som consome um bloco, e **só depois** manda **uma** imagem
(`if novo { n.com_quadro(…); canal.publicar_quadro(…) }`). Os quadros do meio somem. E a página do nativo
(`packages/engine/src/nativo.ts`) mostra "o último que chegou", o mesmo defeito que o A corrigiu no WebAssembly com a
fila por vsync em `packages/engine/src/jogo.ts`. É a tarefa C. **Contar:** no `porQuadro` de cada segundo, quadro com
`envio == 0` = não foi mandado.

Se depois disso ainda engasgar: o relatório do 🩺 do SotC aponta o culpado (núcleo, leitura da placa, som). A
alavanca grande é desenhar o PS2 numa janela própria, como o antigo fazia por padrão (SDL), sem passar pela página
(decisão D36 deixou isso "só se os números pedirem"): meio dia a um dia.

## Falta de memória do ZoE2: o que já foi descartado

- **O DVD inteiro na RAM: não.** O frontend só lê o arquivo todo se `need_fullpath` for falso; o LRPS2 responde
  `true` (agora garantido em `crates/kof-nativo/tests/lrps2.rs`). O antigo lia o disco pela página via VFS
  (`kofnativo.c` 132–201); o novo deixa o núcleo abrir o arquivo: menos memória, não mais.
- **Opções diferentes do antigo: não.** As mesmas três (`pcsx2_bios`, `pcsx2_renderer=OpenGL`,
  `pcsx2_ee_cycle_skip=Mild Underclock`). O LRPS2 não tem opção de pré-carregar o disco.
- **Imagens acumulando no envio: não.** `canal.rs` guarda só a mais nova; a fila de avisos tem limite de 64.
- **Vazamento na troca de resolução: não.** `gl::preparar` roda uma vez (ao abrir); a página reaproveita as texturas
  (`engine/visual/render.ts`).

**Diferenças do antigo que sobram** (suspeitas, sem prova): o antigo responde `GET_PREFERRED_HW_RENDER` (OpenGL core),
`GET_CAN_DUPE` e `GET_INPUT_BITMASKS` e dá a interface VFS; o novo diz "não tem" (`nucleo.rs`, `cb_environment`). E o
antigo usava janela SDL com contexto normal; o novo, EGL sem janela.

**O que falta pra achar:** qual programa morreu. Pedir ao Marcelo a saída de:

```bash
journalctl -k --since "-6 hours" | grep -iE "out of memory|oom|killed process" | tail -5; free -h; tail -n 40 ~/.local/share/kofstation*/logs/kofstation.log.$(date +%F) 2>/dev/null | grep -iE "erro|error|memória|memory|nativo|fim" | tail -15
```

`kofstation` morto = o processo do PS2 (olhar o núcleo e o `kof-nativo`); o navegador morto = a página.

## Próximos passos, em ordem

1. **Feito:** C revisada e integrada; `pnpm check`, e2e (44 passaram, 1 ignorado), teste `ritmo` (284 quadros, 0 sem envio), build Linux e `tools/testar-ps2.mjs` passaram.
2. **Feito:** pacote Linux atualizado e enviado em `teste-binarios` (`65bdcf0`), commit órfão único. Os binários Windows continuam na versão anterior.
3. O Marcelo joga o SotC com o 🩺 ligado e manda o `.zip`. Com o log do ZoE2, atacar a memória.
4. Juntar o B; depois o M16.4 (tela das opções, tarefa E do PLANO).

Regras de sempre: nunca ROM/BIOS/jogo em lugar nenhum; commits em português, sem nome de modelo de IA; `git status`
antes de `git add -A`; não abrir PR sem o Marcelo pedir.
