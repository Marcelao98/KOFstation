# Spike D2: Tauri × Rust local + Chromium (31/10/2026)

A mesma página de medição (`spike/web/`) rodou nas duas cascas, no Linux do container (Ubuntu 24.04, Xvfb, sem placa
de vídeo), com os **núcleos de verdade do kofstation-old** e ROMs geradas na hora.

| Critério | A: Tauri 2 (WebKitGTK 2.52) | B: Rust local + Chromium 153 |
|---|---|---|
| Ponte app → Rust → app (`app.info`) | ✅ 14 ms | ✅ 68 ms (3 chamadas HTTP) |
| Erro do backend chega com código (`UNKNOWN_COMMAND`) | ✅ | ✅ |
| Acesso sem token recusado | — (IPC interno) | ✅ 403 `FORBIDDEN` |
| Núcleos do antigo num Web Worker | ✅ | ✅ |
| Snes9x (quadros/s, sem limite) | 1010 | 1267 |
| Genesis Plus GX | 1201 | 1220 |
| FCEUmm (NES) | 2892 | 3167 |
| PCSX-ReARMed (PS1, interpretador) | 153 | 148 |
| WebGL2 | ✅ (33 ms/quadro com o filtro, renderização por software) | ✅ (0,2 ms; outro renderizador por software, não dá pra comparar) |
| Isolamento (`crossOriginIsolated`) | ❌ **não**, mesmo com COOP/COEP chegando na página | ✅ |
| `SharedArrayBuffer` | ❌ | ✅ |
| Som por AudioWorklet alimentado por anel | ❌ (precisa do SharedArrayBuffer) | ✅ 0 amostras faltando em 3 s, latência 10 ms |
| WebRTC | ❌ **não existe** (`RTCPeerConnection` ausente, mesmo ligando `enable-webrtc`) | ✅ canal de dados (eco 3,9 ms) e vídeo H.264 (153 quadros) |
| Gamepad API | ✅ existe | ✅ existe |

## Conclusão

No Linux, o Tauri **falha em dois critérios que não têm contorno sem perder funcionalidade**:

1. **WebRTC**: o WebKitGTK das distribuições é compilado sem WebRTC. Sem ele, o "Jogar no PC", o Modo Switch e o
   "Levar pro celular" deixam de existir no Linux (viola D0: paridade total).
2. **SharedArrayBuffer**: sem isolamento, o som por AudioWorklet precisaria de outro caminho (dá pra contornar com
   mensagens), mas o PS2 em wasm (Play!) depende de threads e não roda.

No Windows o Tauri usaria o WebView2 (Chromium) e passaria, mas aí seriam **duas cascas diferentes** pra manter, com o
Linux (a prioridade igual, D0) ficando pior.

**Recomendação: opção B em todas as plataformas de PC.** O backend Rust serve o app em `127.0.0.1` com token
aleatório e COOP/COEP, e abre o Chromium/Chrome/Edge/Brave instalado em modo app (`--app=`), com perfil próprio. É o
mesmo motor que o app antigo usa hoje, mas **sem `file://` e sem as flags frágeis** (`SharedArrayBuffer` e isolamento
vêm dos cabeçalhos). Os crates do backend não mudam (não dependem de casca).

O que fica pro Marcelo conferir na máquina dele (checkpoint F4b.4/F4b.5):
- rodar a bancada nas duas cascas (comandos abaixo) com o controle ligado e a placa de vídeo de verdade;
- confirmar se o WebKitGTK do Fedora também vem sem WebRTC (esperado).

## Os protótipos

Apagados no F4b.5 (31/10, D2 aprovada pelo Marcelo). O código deles está no histórico do git (commit `2cb036e`, pasta
`spike/`). A casca B de verdade é o `crates/kof-app`.

## Achados que valem pras próximas etapas

- Os núcleos do antigo rodam num Web Worker **sem recompilar**: basta o Worker se passar por página
  (`self.window = self`), porque foram compilados com `ENVIRONMENT=web,node`.
- O N64 (Mupen64) cria um `<canvas>` no documento pra desenhar com WebGL: num Worker vai precisar de `OffscreenCanvas`
  ou ficar na linha principal (decidir no M11).
