//! O protocolo do núcleo nativo bate com o do TypeScript: as mesmas fixtures (packages/contracts/fixtures/nativo.json).
use kof_nativo::protocolo::{self, Aviso, Comando};
use kof_nativo::{Entrada, Quadro};
use serde_json::Value;

fn fixture() -> Value {
    let p = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../packages/contracts/fixtures/nativo.json"
    );
    serde_json::from_str(&std::fs::read_to_string(p).unwrap()).unwrap()
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn iguais(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => (x.as_f64().unwrap() - y.as_f64().unwrap()).abs() < 1e-6,
        (Value::Object(x), Value::Object(y)) => {
            x.len() == y.len() && x.iter().all(|(k, v)| y.get(k).is_some_and(|w| iguais(v, w)))
        }
        _ => a == b,
    }
}

#[test]
fn mesmas_fixtures_do_typescript() {
    let f = fixture();
    let b = &f["botoes"];
    let eixos: Vec<i16> = serde_json::from_value(b["eixos"].clone()).unwrap();
    let e = Entrada {
        botoes: b["botoes"].as_u64().unwrap() as u16,
        eixos: eixos.try_into().unwrap(),
    };
    assert_eq!(
        hex(&protocolo::botoes(b["jogador"].as_u64().unwrap() as u8, e)),
        b["hex"]
    );

    let q = &f["quadro"];
    let rgba: Vec<u8> = serde_json::from_value(q["rgba"].clone()).unwrap();
    let quadro = Quadro {
        largura: q["largura"].as_u64().unwrap() as u32,
        altura: q["altura"].as_u64().unwrap() as u32,
        rgba: rgba.clone(),
    };
    let mut saida = Vec::new();
    protocolo::quadro(&quadro, q["numero"].as_u64().unwrap() as u32, &mut saida);
    assert_eq!(hex(&saida[..12]), q["hex"]);
    assert_eq!(&saida[12..], &rgba[..]);

    let bl = &f["bloco"];
    let dados: Vec<u8> = serde_json::from_value(bl["dados"].clone()).unwrap();
    let feito = protocolo::bloco(
        bl["tipo"].as_u64().unwrap() as u8,
        bl["pedido"].as_u64().unwrap() as u32,
        &dados,
    );
    assert_eq!(hex(&feito), bl["hex"]);

    for c in f["comandos"].as_array().unwrap() {
        let cmd: Comando = serde_json::from_value(c.clone()).unwrap_or_else(|e| panic!("{c}: {e}"));
        assert_eq!(&serde_json::to_value(&cmd).unwrap(), c);
    }
    for a in f["avisos"].as_array().unwrap() {
        let av: Aviso = serde_json::from_value(a.clone()).unwrap_or_else(|e| panic!("{a}: {e}"));
        // ida e volta pelo texto (como na WebSocket); números comparados como número (44100 = 44100.0)
        let volta: Value = serde_json::from_str(&serde_json::to_string(&av).unwrap()).unwrap();
        assert!(iguais(&volta, a), "{volta} != {a}");
    }
}
