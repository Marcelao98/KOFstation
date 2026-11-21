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
KOF_APP=$PWD/target/release/kofstation node tools/medir-ps2.mjs --sistema wii --jogo A --rodadas 3 --aquecer 60 --segundos 60
```

O jogo precisa estar em `<Kof Games>/Games/wii/`. Pra comparar o engasgo de shader da 1ª vez:
`--opcao dolphin_shader_compilation_mode=2` (ubershaders sem esperar).

## Medidas

| Data | Jogo | Opções | fps | p99 | engasgos/min | faltas de som | memória | Nota |
|---|---|---|---|---|---|---|---|---|
| 21/11 | `.dol` de laço (fumaça) | ⚖ | 59,5 | 25,0 ms | 30 | 0 | 351 MB | só o caminho: abre pela biblioteca, roda, não desenha |
