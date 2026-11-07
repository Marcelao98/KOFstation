//! O ciclo inteiro do atualizador com uma chave gerada aqui: manifesto assinado, baixar o que mudou, aplicar na abertura.
//! E o que tem que ser recusado: assinatura de outra chave, manifesto mexido, arquivo que veio diferente.
use kof_atualiza::{aplicar, hex, procurar, sha256_hex, Arquivo, Manifesto, Resultado};
use kof_core::KofError;
use ring::rand::SystemRandom;
use ring::signature::{Ed25519KeyPair, KeyPair};
use std::collections::{BTreeMap, HashMap};
use std::path::Path;

const URL: &str = "https://exemplo.invalid/latest/manifesto.json";

struct Servidor {
    arquivos: HashMap<String, Vec<u8>>,
}

impl Servidor {
    fn baixar(&self, url: &str) -> Result<Vec<u8>, KofError> {
        self.arquivos
            .get(url)
            .cloned()
            .ok_or_else(|| KofError::Rede(format!("404 {url}")))
    }
}

fn chave() -> Ed25519KeyPair {
    let pkcs8 = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).expect("gerar chave");
    Ed25519KeyPair::from_pkcs8(pkcs8.as_ref()).expect("ler chave")
}

/// Publica a versão: cada arquivo na sua URL, o manifesto e a assinatura.
fn publicar(srv: &mut Servidor, par: &Ed25519KeyPair, versao: &str, arquivos: &[(&str, &[u8])]) -> Vec<u8> {
    let mut lista = BTreeMap::new();
    for (rel, dados) in arquivos {
        let url = format!("https://exemplo.invalid/{versao}/{}", rel.replace('/', "_"));
        srv.arquivos.insert(url.clone(), dados.to_vec());
        lista.insert(
            rel.to_string(),
            Arquivo {
                tamanho: dados.len() as u64,
                sha256: sha256_hex(dados),
                url,
            },
        );
    }
    let mut plataformas = BTreeMap::new();
    plataformas.insert("linux-x64".to_string(), lista);
    let m = serde_json::to_vec(&Manifesto {
        versao: versao.into(),
        commit: "abc1234".into(),
        plataformas,
    })
    .unwrap();
    srv.arquivos.insert(URL.into(), m.clone());
    srv.arquivos
        .insert(format!("{URL}.sig"), hex(par.sign(&m).as_ref()).into_bytes());
    m
}

fn escrever(app: &Path, rel: &str, d: &[u8]) {
    let p = app.join(rel);
    std::fs::create_dir_all(p.parent().unwrap()).unwrap();
    std::fs::write(p, d).unwrap();
}

fn pasta_v1() -> tempfile::TempDir {
    let t = tempfile::tempdir().unwrap();
    escrever(t.path(), "kofstation", b"executavel v1");
    escrever(t.path(), "nucleos/snes9x-aaaa.js", b"snes v1");
    escrever(t.path(), "nucleos/velho-bbbb.js", b"nucleo que saiu");
    escrever(t.path(), "nucleos/lista.json", b"{}");
    escrever(
        t.path(),
        "versao.txt",
        b"versao=1\ncommit=0000000\nplataforma=linux-x64\n",
    );
    t
}

#[test]
fn troca_o_que_mudou_e_apaga_o_nucleo_que_saiu() {
    let app = pasta_v1();
    let par = chave();
    let pubhex = hex(par.public_key().as_ref());
    let mut srv = Servidor {
        arquivos: HashMap::new(),
    };
    let lista_nova = br#"{"snes9x.js":"snes9x-aaaa.js","gba.js":"gba-cccc.js"}"#;
    publicar(
        &mut srv,
        &par,
        "2",
        &[
            ("kofstation", b"executavel v2"),
            ("nucleos/snes9x-aaaa.js", b"snes v1"), // igual: não baixa
            ("nucleos/gba-cccc.js", b"gba novo"),
            ("nucleos/lista.json", lista_nova),
        ],
    );
    let r = procurar(app.path(), "linux-x64", &pubhex, URL, &|u| srv.baixar(u)).unwrap();
    assert_eq!(
        r,
        Resultado::Pronta {
            versao: "2".into(),
            baixados: 3,
            bytes: (13 + 8 + lista_nova.len()) as u64
        }
    );
    // nada mudou na pasta ainda (vale na próxima abertura)
    assert_eq!(std::fs::read(app.path().join("kofstation")).unwrap(), b"executavel v1");
    // procurar de novo não baixa outra vez
    let r = procurar(app.path(), "linux-x64", &pubhex, URL, &|u| srv.baixar(u)).unwrap();
    assert!(matches!(r, Resultado::Pronta { baixados: 0, .. }));

    let a = aplicar(app.path(), "kofstation")
        .unwrap()
        .expect("tinha versão esperando");
    assert_eq!(a.versao, "2");
    assert!(a.trocou_executavel);
    let ler = |rel: &str| std::fs::read(app.path().join(rel)).ok();
    assert_eq!(ler("kofstation").unwrap(), b"executavel v2");
    assert_eq!(ler("kofstation.velho").unwrap(), b"executavel v1");
    assert_eq!(ler("nucleos/gba-cccc.js").unwrap(), b"gba novo");
    assert!(
        ler("nucleos/velho-bbbb.js").is_none(),
        "o núcleo que saiu da lista é apagado"
    );
    let v = String::from_utf8(ler("versao.txt").unwrap()).unwrap();
    assert!(v.contains("versao=2\n") && v.contains("commit=abc1234") && v.contains("plataforma=linux-x64"));
    assert!(!app.path().join(".atualizacao").exists());
    assert!(String::from_utf8(ler("atualizacao.log").unwrap())
        .unwrap()
        .contains("atualizado pra versão 2"));

    // a abertura seguinte limpa o .velho e não tem nada pra aplicar
    assert_eq!(aplicar(app.path(), "kofstation").unwrap(), None);
    assert!(ler("kofstation.velho").is_none());
    // e a procura diz que está em dia
    let r = procurar(app.path(), "linux-x64", &pubhex, URL, &|u| srv.baixar(u)).unwrap();
    assert_eq!(r, Resultado::EmDia { versao: "2".into() });
}

#[test]
fn assinatura_de_outra_chave_e_recusada() {
    let app = pasta_v1();
    let mut srv = Servidor {
        arquivos: HashMap::new(),
    };
    publicar(&mut srv, &chave(), "2", &[("kofstation", b"malicioso")]);
    let outra = hex(chave().public_key().as_ref());
    let e = procurar(app.path(), "linux-x64", &outra, URL, &|u| srv.baixar(u)).unwrap_err();
    assert!(e.to_string().contains("assinatura"), "{e}");
    assert!(!app.path().join(".atualizacao").exists());
}

#[test]
fn manifesto_mexido_depois_de_assinado_e_recusado() {
    let app = pasta_v1();
    let par = chave();
    let mut srv = Servidor {
        arquivos: HashMap::new(),
    };
    let m = publicar(&mut srv, &par, "2", &[("kofstation", b"bom")]);
    let mexido = String::from_utf8(m).unwrap().replace("\"2\"", "\"3\"");
    srv.arquivos.insert(URL.into(), mexido.into_bytes());
    let e = procurar(app.path(), "linux-x64", &hex(par.public_key().as_ref()), URL, &|u| {
        srv.baixar(u)
    })
    .unwrap_err();
    assert!(e.to_string().contains("assinatura"), "{e}");
}

#[test]
fn arquivo_alterado_no_caminho_e_recusado_e_nada_fica_pela_metade() {
    let app = pasta_v1();
    let par = chave();
    let mut srv = Servidor {
        arquivos: HashMap::new(),
    };
    publicar(
        &mut srv,
        &par,
        "2",
        &[("nucleos/gba-cccc.js", b"gba novo"), ("kofstation", b"executavel v2")],
    );
    // alguém trocou o executável no caminho (mesmo tamanho, outro conteúdo)
    srv.arquivos
        .insert("https://exemplo.invalid/2/kofstation".into(), b"executavel XX".to_vec());
    let e = procurar(app.path(), "linux-x64", &hex(par.public_key().as_ref()), URL, &|u| {
        srv.baixar(u)
    })
    .unwrap_err();
    assert!(e.to_string().contains("veio diferente"), "{e}");
    assert!(!app.path().join(".atualizacao").exists(), "nada pela metade");
    assert_eq!(aplicar(app.path(), "kofstation").unwrap(), None);
    assert_eq!(std::fs::read(app.path().join("kofstation")).unwrap(), b"executavel v1");
}

#[test]
fn caminho_fora_da_pasta_no_manifesto_e_recusado() {
    let app = pasta_v1();
    let par = chave();
    let mut srv = Servidor {
        arquivos: HashMap::new(),
    };
    publicar(&mut srv, &par, "2", &[("../fora", b"x")]);
    let e = procurar(app.path(), "linux-x64", &hex(par.public_key().as_ref()), URL, &|u| {
        srv.baixar(u)
    })
    .unwrap_err();
    assert_eq!(e.codigo(), "PATH_OUTSIDE_SCOPE");
    assert!(!app.path().parent().unwrap().join("fora").exists());
}
