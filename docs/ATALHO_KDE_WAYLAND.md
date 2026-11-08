# Atalho do KOFstation no KDE (Wayland): o pin abria um Chrome vazio

Este documento registra **o problema, a causa e a correção** do atalho/pin do KOFstation no KDE Plasma em Wayland,
feita na máquina do Marcelo em 2026-11-08. Ele existe pra um agente (Claude, Codex...) conseguir **reaplicar a correção
depois de uma atualização do app**, sem refazer toda a investigação.

> **Resumo em uma frase:** no Wayland o Chromium ignora `--class=KOFstation` quando abre com `--app=`, e o app_id real
> da janela é `chrome-127.0.0.1__-Default`; o `.desktop` tem que casar com esse ID, e o pin do painel tem que apontar
> para `applications:kofstation.desktop`, não para o executável cru do Chrome.

---

## Sintoma

- O KOFstation abria normalmente pelo menu.
- Depois de fixar (pin) a janela no painel do KDE, clicar no ícone abria **uma janela vazia do Chrome**, não o app.
- O ícone do pin podia ficar separado da janela aberta (KDE não associava a janela ao `.desktop`).

## Causa (o que foi descoberto)

1. O KOFstation é um executável Rust que sobe um servidor em `127.0.0.1` e abre o Chromium em modo app:
   `/opt/google/chrome/chrome --app=http://127.0.0.1:<porta>/?t=... --user-data-dir=<dados>/navegador --class=KOFstation ...`
2. **No Wayland, o Chromium ignora `--class=KOFstation` no modo `--app=`.** O app_id que o KWin recebe é gerado a
   partir da URL e do perfil. Na máquina do Marcelo ele é sempre:
   `chrome-127.0.0.1__-Default`
   (a porta **não** entra; o perfil `Default` é o diretório interno do `--user-data-dir`, não o nome `navegador`).
3. O `.desktop` instalado tinha `StartupWMClass=KOFstation`. O KDE não achava esse valor na janela Wayland, então não
   associava a janela ao atalho.
4. Ao fixar a janela, o KDE gravou no painel o **executável cru do Chrome**
   (`file:///opt/google/chrome/chrome`). Clicar nisso abre um Chrome comum, vazio — não o KOFstation.

### Prova (janela real vista pelo KWin)

O script abaixo foi rodado no KWin e mostrou a janela do app:

```json
{
  "caption": "KOFstation",
  "resourceClass": "chrome-127.0.0.1__-Default",
  "resourceName": "chrome",
  "desktopFileName": "chrome-127.0.0.1__-Default"
}
```

Também foi conferido que o app_id **não muda** com a porta aleatória do servidor e **muda** se o caminho da URL mudar
(ex.: `/foo` vira `chrome-127.0.0.1__foo-Default`).

---

## Correção feita na máquina (Linux, KDE Plasma Wayland)

Arquivos e valores exatos:

### 1. `~/.local/share/applications/kofstation.desktop`

O `StartupWMClass` passou a ser o app_id real do Wayland:

```ini
[Desktop Entry]
Type=Application
Name=KOFstation
GenericName=Emulador de videogame
Comment=Super Nintendo, NES, Game Boy, GBA, Sega, Neo Geo, N64 e PlayStation
Exec="/home/meduardo/Jogos/Kof Games/KOFstation/kofstation"
Icon=/home/meduardo/Jogos/Kof Games/KOFstation/icone.png
Terminal=false
Categories=Game;Emulator;
Keywords=snes;nes;gba;emulador;kof;kofstation;
StartupWMClass=chrome-127.0.0.1__-Default
```

Comandos usados:

```bash
# troca (ou acrescenta) o StartupWMClass
f=~/.local/share/applications/kofstation.desktop
if grep -q '^StartupWMClass=' "$f"; then
  sed -i 's/^StartupWMClass=.*/StartupWMClass=chrome-127.0.0.1__-Default/' "$f"
else
  printf 'StartupWMClass=chrome-127.0.0.1__-Default\n' >> "$f"
fi

desktop-file-validate "$f"
update-desktop-database ~/.local/share/applications
kbuildsycoca6
```

### 2. Pin do painel do KDE

O pin foi trocado do executável cru do Chrome para o `.desktop` do app. No arquivo
`~/.config/plasma-org.kde.plasma.desktop-appletsrc` a linha ficou:

```ini
launchers=applications:kofstation.desktop
```

Foi atualizado por script no Plasma (sem reiniciar a sessão):

```bash
busctl --user call org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell evaluateScript s '
var ps = panels();
for (var i = 0; i < ps.length; i++) {
  var ws = ps[i].widgets();
  for (var j = 0; j < ws.length; j++) {
    if (ws[j].type === "org.kde.plasma.icontasks") {
      ws[j].currentConfigGroup = ["General"];
      ws[j].writeConfig("launchers", "applications:kofstation.desktop");
    }
  }
}'
```

Se o painel não atualizar na hora, reiniciar o plasmashell ou fazer logout/login resolve.

### 3. Erro de “pasta desconhecida” (mesma sessão)

O app também mostrava erro de pasta. O arquivo
`~/.local/share/KOFstation/config/raiz.json` apontava para uma pasta que não existe mais:

```json
{ "path": "/home/meduardo/Programas/Kof Games" }
```

Foi corrigido para a pasta real:

```json
{ "path": "/home/meduardo/Jogos/Kof Games" }
```

---

## Como conferir o app_id no KWin (diagnóstico)

Salve o script e rode pelo D-Bus do KWin:

```bash
cat > /tmp/kwin-list-windows.js <<'EOF'
const ws = workspace;
const list = ws.windowList ? ws.windowList() : ws.clientList();
const out = list.map(function (w) {
  return {
    caption: w.caption,
    resourceClass: w.resourceClass,
    resourceName: w.resourceName,
    desktopFileName: w.desktopFileName,
    pid: w.pid,
    uuid: w.uuid || w.internalId
  };
});
console.info("KOF_WINDOWS " + JSON.stringify(out));
EOF

busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting loadScript s /tmp/kwin-list-windows.js
busctl --user call org.kde.KWin /Scripting org.kde.kwin.Scripting start

# a saída aparece no journal do KWin
journalctl --user -u plasma-kwin_wayland -f | grep KOF_WINDOWS
```

Procure a janela com `"caption":"KOFstation"` e copie `resourceClass` / `desktopFileName`. **É esse valor que vai no
`StartupWMClass`** (ou no nome do arquivo `.desktop`, sem o `.desktop`).

---

## Como testar a correção

1. Feche o KOFstation por completo (janela e processos).
2. Clique no ícone fixado no painel.
3. O esperado: abre o KOFstation (a janela do app), **não** um Chrome vazio.
4. Opcional: rode o script do KWin e confira que a janela aparece com
   `resourceClass = chrome-127.0.0.1__-Default`.
5. Feche e abra de novo pelo pin. Deve continuar funcionando.

Também dá pra testar o `.desktop` sem clicar no painel:

```bash
kioclient exec file:///home/meduardo/.local/share/applications/kofstation.desktop
```

---

## Como reaplicar depois de uma atualização do app

O binário do KOFstation muda a cada atualização; **o app_id não muda** enquanto o app continuar abrindo
`http://127.0.0.1:<porta>/` com o perfil `Default`. Então o `.desktop` corrigido continua valendo. Se algo quebrar:

1. Abra o KOFstation e rode o script do KWin para ver o `resourceClass` atual.
2. Atualize o `StartupWMClass` do `.desktop` para esse valor (ou crie/renomeie um `.desktop` com esse ID).
3. Rode `desktop-file-validate`, `update-desktop-database` e `kbuildsycoca6`.
4. Se o pin estiver apontando para o Chrome cru, troque para `applications:<arquivo>.desktop` (passos acima).

**Quando o app_id pode mudar:** se o app mudar o caminho da URL (hoje é `/`) ou o perfil do Chromium (hoje é
`Default`). A porta não importa. Se mudar, refaça o passo 1.

---

## Atenção: o instalador do repositório (app novo)

O `kofstation --instalar` do repositório grava `~/.local/share/applications/kofstation-novo.desktop` (para conviver com
o app antigo). No `main`, esse arquivo **não** tem `StartupWMClass`. A branch `fix/atalho-janela-na-barra` (commit
`4be2cad`) acrescentou `StartupWMClass=KOFstation`, que funciona no **X11** (por causa do `--class=KOFstation`), mas
**não no Wayland**, pelo mesmo motivo acima.

Se for corrigir o instalador, as opções são:

- **Simples para Wayland:** gerar o `.desktop` com `StartupWMClass=chrome-127.0.0.1__-Default`. Perde a associação no
  X11.
- **Para os dois (recomendado):** manter o `kofstation-novo.desktop` visível com `StartupWMClass=KOFstation` (X11) e
  gravar também um `chrome-127.0.0.1__-Default.desktop` com `NoDisplay=true`, mesmo `Exec`/`Icon`, para o Wayland casar
  pelo ID do arquivo. O `--desinstalar` precisa apagar os dois.
- **Não hardcodar sem conferir:** o app_id pode variar conforme a família do Chromium (Chrome, Chromium, Edge, Brave) e
  conforme a URL/perfil. Rode o script do KWin na máquina antes de fixar o valor.

Nesta branch `opencode` **só entrou documentação**; a correção acima foi feita localmente na máquina do Marcelo.

---

## Armadilhas que custaram tempo

- **Não fixar o executável do Chrome.** O pin precisa ser `applications:...desktop`.
- **Não usar `pkill -f` com um padrão que aparece na própria linha de comando do shell** (isso mata o próprio shell da
  ferramenta). Use `pkill -x kofstation` ou mate PIDs explícitos.
- **Script do KWin pode precisar de uma segunda leitura** logo depois de abrir a janela (timing). Rode o script de novo
  antes de concluir que a janela não existe.
- **O `StartupWMClass` é case-sensitive no Wayland.** Use exatamente o que o KWin reporta.

## Arquivos e referências

- `~/.local/share/applications/kofstation.desktop` — atalho corrigido.
- `~/.config/plasma-org.kde.plasma.desktop-appletsrc` — linha `launchers=applications:kofstation.desktop`.
- `~/.local/share/KOFstation/config/raiz.json` — pasta raiz corrigida.
- `/home/meduardo/Jogos/Kof Games/KOFstation/kofstation` — executável instalado.
- `crates/kof-app/src/navegador.rs` — argumentos do Chromium (`--app`, `--user-data-dir`, `--class`).
- `crates/kof-app/src/main.rs` — servidor local e `abrir_janela`.
- `crates/kof-app/src/instalar.rs` — gera o `.desktop` do `--instalar` (atenção à seção acima).
