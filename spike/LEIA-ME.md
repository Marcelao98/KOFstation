# Spike F4b (temporário)

Compara as duas cascas candidatas (D2) com a MESMA página de medição (`web/`), usando os núcleos do kofstation-old.
Some no F4b.5: fica só o relatório `docs/SPIKE_D2.md`.

- `preparar.sh <pasta do kofstation-old>`: copia os núcleos publicados pra `web/nucleos/` (fora do git).
- `tauri/`: casca A (Tauri 2, WebKitGTK no Linux).
- `local/`: casca B (Rust serve a página em 127.0.0.1 com token e abre o Chromium em modo app).
