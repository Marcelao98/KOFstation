# Wii e GameCube lisos (diário da fase W)

> O jeito de medir e os números do Dolphin no KOFstation, como o [PS2-LISO.md](PS2-LISO.md). Nome de jogo nunca aqui:
> "jogo de teste Wii A". Os resultados completos ficam fora do repositório, em `~/kof-medidas/resultados/`.

## Como roda (21/11)

- **Núcleo:** o `dolphin_libretro` pronto do buildbot do libretro (o do RetroArch), `dolphin-emu 2609.0.168+0863ee3700`,
  copiado pra Release `nucleos-dolphin-0863ee37` (D40). Os arquivos de sistema (`dolphin-emu/Sys`, ajustes por jogo)
  vêm no `dolphin-sys.zip` ao lado do núcleo e são extraídos uma vez.
- **Processo:** o mesmo `kof-nativo` do PS2: OpenGL Core sem janela (o Dolphin pede pelo `GET_PREFERRED_HW_RENDER`),
  disco lido do disco pelo processo, imagem pra página pela WebSocket.
- **Estado:** ~85 MB (medido no `.dol` de teste): nasce sem rebobinar (`FOTO_MAXIMA` de 24 MB) e com o estado fora da
  página, como o PS2.
- **Saves:** `<dados>/nativo/saves/dolphin/User` (NAND do Wii em `Wii/`, cartões do GameCube em `GC/<região>/`, cache
  de shaders em `Cache/Shaders`, que fica de uma vez pra outra).
- **Controles (W.4, a proposta):** Wiimote com Nunchuk; o mouse sobre a imagem é o ponteiro (`dolphin_ir_mode` = 2, a
  página manda `PONTEIRO`, o processo responde `RETRO_DEVICE_POINTER`), clique esquerdo = A, direito = B, do meio =
  chacoalhar; no teclado setas = Nunchuk, X = A, Z = B, S = C, A = Z, R = chacoalhar, Enter = 1, Shift = 2, Q = −,
  W = +. GameCube como o console (W = Z, E/R = L/R, I J K L = C-stick).

## Como medir

```bash
source ~/kof-medidas/ambiente.sh
KOF_APP=$PWD/target/release/kofstation node tools/medir-ps2.mjs --sistema wii --rodadas 1 --aquecer 40 --segundos 60 --sem-cdp
```

**Sempre com `--sem-cdp`**: a depuração do Chrome guarda cada quadro que passa pela WebSocket (1,35 MB no Wii) e
estoura a RAM em menos de um minuto (o sistema chegou a matar o app duas vezes em 21/11). Com `--sem-cdp` o ritmo vem
do 🩺 diagnóstico que o próprio app grava (linha "ritmo"). **Feche o Firefox** antes (7,2 GB de RAM não comportam os
dois) e deixe a tela sem bloquear (com a tela bloqueada o Chrome para de desenhar).

O jogo precisa estar em `<Kof Games>/Games/wii/`. Pra comparar o engasgo de shader da 1ª vez:
`--opcao dolphin_shader_compilation_mode=2` (ubershaders sem esperar).

## Medidas

| Data | Jogo | Opções | fps | p99 | engasgos/min | faltas de som | memória | Nota |
|---|---|---|---|---|---|---|---|---|
| 21/11 | `.dol` de laço (fumaça) | ⚖ | 59,5 | 25,0 ms | 30 | 0 | 351 MB | só o caminho: abre pela biblioteca, roda, não desenha |
| 21/11 | Wii A, núcleo sozinho (`dolphin.rs`) | ⚖ | — | 3–7,5 ms por quadro | — | — | estado 110 MB | 226–288 imagens novas a cada 300 quadros |
| 21/11 | Wii A, Firefox aberto, com CDP | ⚖ | 57 | 42 ms | 335 | 181 | jogo 560 MB, **386 MB em swap** | a máquina sem RAM; ainda tentava a foto do rebobinar (105 MB) |
| 21/11 | Wii A, Firefox aberto, com CDP | ubershaders assíncronos (`=2`) | 54,8 | 56 ms | 356 | 283 | — | pior: ubershader pesa no vídeo integrado |
| 21/11 | Wii A, sem Firefox, com CDP | — | — | — | — | — | — | o sistema matou o Chrome (OOM): o CDP guardando os quadros |
| 21/11 | **Wii A, sem Firefox, `--sem-cdp`** | ⚖ | **59,9** | **25,2 ms** | **46** | **0** | jogo ~710 MB, Chrome ~1,2 GB estável | **liso, no nível do PS2** |
| 21/11 | **Wii A, idem (confirmação)** | ⚖ | **59,9** | **24,7 ms** | **27** | **0** | idem | núcleo p50/p99 5,1/7,7 ms |

**Conclusão de 21/11:** o caminho do PS2 já deixa o Wii liso; nenhuma opção precisou mudar. O que travava era a
memória (Firefox + a depuração do medidor) e o rebobinar tentando a foto de 105 MB (corrigido: `SEM_REBOBINAR` com
`gc` e `wii`). Pra jogar: Firefox fechado ajuda, como no PS2.
