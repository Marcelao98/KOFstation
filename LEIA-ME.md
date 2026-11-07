# Binários de teste do KOFstation novo (temporário)

Versão M11b + correção do PS1 (o CD não passa mais pela página: não estoura a memória) e a pasta igual à do antigo.

O pacote é a pasta `KOFstation/`: o executável, `nucleos/` (núcleos com o hash no nome e a `lista.json`), `nativo/`
(PlayStation nativo) e `versao.txt`. Ponha ela dentro da sua pasta **Kof Games** (a de cima vira a Kof Games).

Linux:

```bash
mkdir -p ~/Programas/"Kof Games" && curl -fL https://raw.githubusercontent.com/Marcelao98/KOFstation/teste-binarios/KOFstation-linux.tar.gz | tar -xz -C ~/Programas/"Kof Games" && ~/Programas/"Kof Games"/KOFstation/kofstation
```

Windows: `KOFstation-windows.zip`, descompactado dentro da pasta Kof Games; abra `KOFstation\KOFstation.exe`.

Esta branch tem um commit só e é substituída a cada versão.
