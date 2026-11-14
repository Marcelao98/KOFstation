# Binários de teste do KOFstation novo (temporário)

Versão de **14/11** (`52c7cf7`) (M16.4, T.1 e M14.1–M14.2): opções de emulação por console, comparações com o antigo, **o APK do
celular** (`KOFstation-novo.apk`) e o controle de toque e o PS1/N64 nativos no APK (as .so do antigo) , **som do celular**, **pasta de ROMs, rede, controle e atualizador no APK**. Sem as tentativas de otimização do PS2 (pausadas; ficam na branch
`rascunho/ps2-liso`, que não foi juntada).

## Linux

```bash
mkdir -p ~/Programas/"Kof Games" && curl -fL https://raw.githubusercontent.com/Marcelao98/KOFstation/teste-binarios/KOFstation-linux.tar.gz | tar -xz -C ~/Programas/"Kof Games" && ~/Programas/"Kof Games"/KOFstation/kofstation --instalar && ~/Programas/"Kof Games"/KOFstation/kofstation
```

## Windows

`KOFstation-instalar.exe` (sem administrador) ou `KOFstation-windows.zip`.

## Celular (Android)

`KOFstation-novo.apk`: instala ao lado do APK antigo (outro `applicationId`). Com cabo: `adb install -r KOFstation-novo.apk`.

## O que testar

Passo a passo de cada teste na seção **"Pra você testar"** do `docs/SITUACAO.md` (T-M16.4, T-CELULAR, T-JOGO, T-OUVIR, T-NEOGEO,
T-PS2, T-REDE, T-INSTALAR, T-DIAG).

Esta branch tem um commit só e é substituída a cada versão.
