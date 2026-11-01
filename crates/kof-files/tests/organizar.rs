use kof_files::organizar::{aplicar, guardar, inventario, nome_livre, Movimento};

#[test]
fn inventario_le_o_cue_e_aplica_movendo_com_nome_livre() {
    let d = tempfile::tempdir().unwrap();
    let r = d.path();
    kof_files::raiz::garantir_arvore(r).unwrap();
    std::fs::create_dir_all(r.join("Novos/CD Jogo")).unwrap();
    std::fs::write(r.join("Novos/CD Jogo/Jogo.cue"), "FILE \"Jogo (Track 1).bin\" BINARY\n").unwrap();
    std::fs::write(r.join("Novos/CD Jogo/Jogo (Track 1).bin"), b"x").unwrap();
    std::fs::write(r.join("Novos/Mario.sfc"), b"rom").unwrap();
    std::fs::write(r.join("Games/snes/Mario.sfc"), b"outra").unwrap();
    std::fs::create_dir_all(r.join("Novos/vazia")).unwrap();
    let inv = inventario(r).unwrap();
    let cue = inv.files.iter().find(|f| f.arquivo.path.ends_with(".cue")).unwrap();
    assert_eq!(cue.cue.as_deref(), Some(&["Jogo (Track 1).bin".to_string()][..]));
    assert!(inv.dirs.contains(&"Novos/CD Jogo".to_string()));
    let mv = |from: &str, to: &str| Movimento {
        from: from.into(),
        to: to.into(),
        reason: "novo".into(),
    };
    let res = aplicar(
        r,
        &[
            mv("Novos/Mario.sfc", "Games/snes"),
            mv("Novos/CD Jogo", "Games/psx"),
            mv("Novos/sumiu.sfc", "Games/snes"),
            mv("../fora", "Games"),
        ],
        &["Novos/vazia".into()],
    );
    assert_eq!(res.done.len(), 2);
    assert_eq!(
        res.failed.iter().map(|f| f.code.as_str()).collect::<Vec<_>>(),
        ["NOT_FOUND", "PATH_OUTSIDE_SCOPE"]
    );
    assert_eq!(std::fs::read(r.join("Games/snes/Mario (2).sfc")).unwrap(), b"rom");
    assert!(r.join("Games/psx/CD Jogo/Jogo (Track 1).bin").is_file());
    assert_eq!(res.removed, ["Novos/vazia"]);
    assert_eq!(
        nome_livre(&r.join("Games/snes"), "Mario.sfc"),
        r.join("Games/snes/Mario (3).sfc")
    );
}

#[test]
fn guardar_copia_so_quando_precisa() {
    let d = tempfile::tempdir().unwrap();
    kof_files::raiz::garantir_arvore(d.path()).unwrap();
    assert_eq!(
        guardar(d.path(), "nes", "a.nes", b"123").unwrap().as_deref(),
        Some("Games/nes/a.nes")
    );
    assert_eq!(
        guardar(d.path(), "nes", "a.nes", b"456").unwrap(),
        None,
        "mesmo tamanho: já está lá"
    );
    assert_eq!(
        guardar(d.path(), "../x", "a", b"1").unwrap_err().codigo(),
        "PATH_OUTSIDE_SCOPE"
    );
}
