# Instalar o ambiente de desenvolvimento

> **Som dos núcleos nativos (M11b):** no Linux o Rust precisa dos cabeçalhos do ALSA pra compilar (`alsa-lib-devel` no
> Fedora, `libasound2-dev` no Ubuntu; já estão nos comandos abaixo). Quem só usa o executável pronto não precisa: a
> `libasound.so.2` já vem em qualquer Linux com som (PipeWire e PulseAudio passam por ela).

Versões travadas: Node 22+, pnpm 10.28.0 (vem pelo `packageManager` do `package.json`), Rust 1.97.0 (pelo
`rust-toolchain.toml`, o `rustup` baixa sozinho). As dependências do projeto ficam no `pnpm-lock.yaml` e no
`Cargo.lock`.

## Fedora

```bash
sudo dnf install -y nodejs git gcc gcc-c++ make alsa-lib-devel pkgconf-pkg-config
```

```bash
corepack enable
```

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Se for usar o Tauri (decidido no passo F4b), também:

```bash
sudo dnf install -y webkit2gtk4.1-devel gtk3-devel librsvg2-devel openssl-devel libappindicator-gtk3-devel
```

## Ubuntu / Debian

```bash
sudo apt install -y nodejs npm git build-essential curl libasound2-dev pkg-config
```

```bash
sudo npm install -g corepack && corepack enable
```

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Se for usar o Tauri:

```bash
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libssl-dev libayatana-appindicator3-dev
```

(Se a versão do Node do sistema for menor que 22, instale pelo nodesource ou pelo `fnm`.)

## Windows

1. Node.js 22 LTS (instalador do nodejs.org) e Git for Windows.
2. No PowerShell: `corepack enable`.
3. Rust: `rustup-init.exe` do rustup.rs (com as "C++ build tools" do Visual Studio que ele pede).
4. Tauri no Windows usa o WebView2, que já vem no Windows 10/11.

## Rodar

Na pasta do repositório:

```bash
pnpm install
```

```bash
pnpm check:tudo
```

`check:tudo` confere formato, lint (inclusive as regras de camada), tipos e testes do TypeScript e formato, clippy e
testes do Rust. É o mesmo que o CI roda no GitHub a cada envio.

Pra abrir o app no navegador (com o backend de teste, sem Rust):

```bash
pnpm dev
```

## Gerar o app (um executável só, com o front dentro)

```bash
pnpm build && cargo build --release -p kof-app
```

Sai em `target/release/kofstation`. Pro Windows, daqui do Linux (precisa do `mingw-w64` e do alvo do Rust):

```bash
rustup target add x86_64-pc-windows-gnu && cargo build --release -p kof-app --target x86_64-pc-windows-gnu
```

Sai em `target/x86_64-pc-windows-gnu/release/kofstation.exe`. Pra testar sem abrir navegador:
`kofstation --sem-navegador` (mostra o endereço com o token).
