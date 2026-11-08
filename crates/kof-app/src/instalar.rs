//! `kofstation --instalar` / `--desinstalar` (M15.2): põe e tira o KOFstation do menu de aplicativos do Linux (KDE,
//! GNOME, XFCE...), como o `kofnes.sh --instalar` do antigo. A pasta continua onde a pessoa extraiu; o menu aponta pra
//! ela. No Windows quem faz isso é o instalador (atalhos no Menu Iniciar e na área de trabalho).
use std::path::{Path, PathBuf};

/// O nome do arquivo no menu. Diferente do `kofnes.desktop` do antigo: os dois ficam lado a lado (M15.4).
pub const ARQUIVO: &str = "kofstation-novo.desktop";

/// `~/.local/share/applications` (ou `$XDG_DATA_HOME/applications`).
pub fn pasta_do_menu(var: impl Fn(&str) -> Option<String>) -> Option<PathBuf> {
    if let Some(x) = var("XDG_DATA_HOME").filter(|x| !x.is_empty()) {
        return Some(PathBuf::from(x).join("applications"));
    }
    var("HOME").map(|h| PathBuf::from(h).join(".local/share/applications"))
}

/// O conteúdo do `.desktop` pra o executável e o ícone desta pasta.
pub fn entrada(exe: &Path, icone: &Path) -> String {
    // no Exec, aspas protegem espaço no caminho; o % e as aspas de dentro precisam de escape (especificação do .desktop)
    let exec = exe
        .display()
        .to_string()
        .replace('\\', "\\\\\\\\")
        .replace('"', "\\\\\"")
        .replace('`', "\\\\`")
        .replace('$', "\\\\$")
        .replace('%', "%%");
    format!(
        "[Desktop Entry]\nType=Application\nName=KOFstation novo\nGenericName=Emulador de videogame\n\
         Comment=Super Nintendo, NES, Game Boy, GBA, Sega, Neo Geo, N64 e PlayStation (versão nova)\n\
         Exec=\"{exec}\"\nIcon={}\nTerminal=false\nCategories=Game;Emulator;\nKeywords=snes;nes;gba;emulador;kof;\n\
         StartupWMClass=KOFstation\n",
        icone.display()
    )
}

pub fn instalar(menu: &Path, exe: &Path) -> Result<PathBuf, String> {
    let pasta = exe.parent().ok_or("o executável não tem pasta")?;
    let icone = pasta.join("icone.png");
    std::fs::create_dir_all(menu).map_err(|e| format!("não consegui criar {}: {e}", menu.display()))?;
    let p = menu.join(ARQUIVO);
    std::fs::write(&p, entrada(exe, &icone)).map_err(|e| format!("não consegui gravar {}: {e}", p.display()))?;
    atualizar_menu(menu);
    Ok(p)
}

pub fn desinstalar(menu: &Path) -> Result<(), String> {
    let p = menu.join(ARQUIVO);
    match std::fs::remove_file(&p) {
        Ok(()) => {}
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(format!("não consegui apagar {}: {e}", p.display())),
    }
    atualizar_menu(menu);
    Ok(())
}

fn atualizar_menu(menu: &Path) {
    // nem todo sistema tem: o menu acha o arquivo sozinho de qualquer jeito
    let _ = std::process::Command::new("update-desktop-database")
        .arg(menu)
        .stderr(std::process::Stdio::null())
        .status();
}

/// O que o `main` chama. Devolve o código de saída.
pub fn rodar(tirar: bool) -> i32 {
    if cfg!(windows) {
        eprintln!("No Windows, use o instalador (KOFstation-instalar.exe): ele põe os atalhos.");
        return 1;
    }
    let Some(menu) = pasta_do_menu(|k| std::env::var(k).ok()) else {
        eprintln!("KOFstation: sem HOME, não sei onde fica o menu de aplicativos");
        return 1;
    };
    let r = if tirar {
        desinstalar(&menu).map(|()| "KOFstation novo tirado do menu de aplicativos.".to_string())
    } else {
        std::env::current_exe()
            .map_err(|e| format!("não achei o próprio executável: {e}"))
            .and_then(|exe| instalar(&menu, &exe))
            .map(|p| format!("KOFstation novo instalado no menu de aplicativos ({}).", p.display()))
    };
    match r {
        Ok(m) => {
            println!("{m}");
            0
        }
        Err(e) => {
            eprintln!("KOFstation: {e}");
            1
        }
    }
}

#[cfg(all(test, unix))] // o .desktop é coisa do Linux (no Windows quem põe os atalhos é o instalador)
mod testes {
    use super::*;

    #[test]
    fn instala_e_desinstala_no_menu() {
        let t = tempfile::tempdir().unwrap();
        let menu = pasta_do_menu(|k| (k == "HOME").then(|| t.path().display().to_string())).unwrap();
        assert!(menu.ends_with(".local/share/applications"));
        let exe = t.path().join("Meus Jogos/KOFstation/kofstation");
        let p = instalar(&menu, &exe).unwrap();
        let d = std::fs::read_to_string(&p).unwrap();
        assert!(d.contains(&format!("Exec=\"{}\"", exe.display())), "{d}");
        assert!(d.contains(&format!(
            "Icon={}",
            t.path().join("Meus Jogos/KOFstation/icone.png").display()
        )));
        assert!(d.contains("Name=KOFstation novo"));
        // a janela abre com --class=KOFstation: sem isso o KDE/GNOME mostra um Chromium à parte na barra
        assert!(d.contains("StartupWMClass=KOFstation"), "{d}");
        desinstalar(&menu).unwrap();
        assert!(!p.exists());
        desinstalar(&menu).unwrap(); // de novo: não é erro
    }

    #[test]
    fn caracteres_especiais_no_exec() {
        let e = entrada(Path::new("/a/100%/b$c"), Path::new("/i.png"));
        assert!(e.contains("Exec=\"/a/100%%/b\\\\$c\""), "{e}");
    }
}
