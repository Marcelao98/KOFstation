// Precisa de internet: `KOF_REDE=1 cargo test -p kof-files --test capas`.
#[test]
fn baixa_e_guarda_a_capa() {
    if std::env::var("KOF_REDE").is_err() {
        return;
    }
    let d = tempfile::tempdir().unwrap();
    let acervo = "Nintendo_-_Super_Nintendo_Entertainment_System";
    let nomes = vec!["Nao Existe (USA)".to_string(), "Super Mario World (USA)".to_string()];
    let png = kof_files::capas::buscar(d.path(), acervo, "Super Mario World (USA)", &nomes)
        .unwrap()
        .unwrap();
    assert_eq!(&png[1..4], b"PNG");
    assert!(kof_files::capas::guardada(d.path(), acervo, "Super Mario World (USA)")
        .unwrap()
        .is_some());
    let nada = kof_files::capas::buscar(d.path(), acervo, "x", &["Jogo Inventado Kof (USA)".into()]).unwrap();
    assert!(nada.is_none());
}
