//! As contas do som ao rebobinar no Rust batem com as do TypeScript: os mesmos vetores
//! (packages/contracts/fixtures/som-rebobinar.json, gerados por tools/som-rebobinar-fixture.mjs).
use kof_nativo::rebobinar::som;
use serde_json::Value;

fn fixture() -> Value {
    let p = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../packages/contracts/fixtures/som-rebobinar.json"
    );
    serde_json::from_str(&std::fs::read_to_string(p).unwrap()).unwrap()
}

fn f32s(v: &Value) -> Vec<f32> {
    v.as_array()
        .unwrap()
        .iter()
        .map(|x| x.as_f64().unwrap() as f32)
        .collect()
}
fn f64s(v: &Value) -> Vec<f64> {
    v.as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect()
}
fn perto(nome: &str, a: &[f64], b: &[f64]) {
    assert_eq!(a.len(), b.len(), "{nome}: tamanhos");
    for (i, (x, y)) in a.iter().zip(b).enumerate() {
        assert!((x - y).abs() < 1e-5, "{nome}[{i}]: {x} != {y}");
    }
}
fn d(v: &[f32]) -> Vec<f64> {
    v.iter().map(|&x| x as f64).collect()
}
fn u(c: &Value, k: &str) -> usize {
    c[k].as_u64().unwrap() as usize
}

#[test]
fn mesmos_vetores_do_typescript() {
    let f = fixture();
    let k = &f["constantes"];
    assert_eq!(k["entradaMs"].as_f64().unwrap(), som::ENTRADA_MS);
    assert_eq!(k["saidaMs"].as_f64().unwrap(), som::SAIDA_MS);
    assert_eq!(k["fitaHz"].as_f64().unwrap(), som::FITA_HZ);
    assert_eq!(k["velocidade"].as_u64().unwrap() as usize, som::VELOCIDADE);
    let casos = f["casos"].as_array().unwrap();
    for c in casos {
        let nome = c["funcao"].as_str().unwrap();
        let saida = f64s(&c["saida"]);
        match nome {
            "inverter" => perto(nome, &d(&som::inverter(&f32s(&c["entrada"]))), &saida),
            "acelerar" => perto(
                nome,
                &d(&som::acelerar(&f32s(&c["entrada"]), c["fator"].as_f64().unwrap())),
                &saida,
            ),
            "ganhoEntrada" => {
                let t = u(c, "total");
                let g: Vec<f64> = (0..saida.len()).map(|i| som::ganho_entrada(i, t)).collect();
                perto(nome, &g, &saida);
            }
            "aplicarEntrada" => {
                let mut e = f32s(&c["entrada"]);
                som::aplicar_entrada(&mut e, u(c, "inicio"), u(c, "total"));
                perto(nome, &d(&e), &saida);
            }
            "coefFita" => perto(
                nome,
                &[som::coef_fita(c["hz"].as_f64().unwrap(), c["taxa"].as_f64().unwrap())],
                &saida,
            ),
            "filtrarFita" | "trechoPraTras" => {
                let a = som::coef_fita(c["hz"].as_f64().unwrap(), c["taxa"].as_f64().unwrap());
                let m = f64s(&c["memoria"]);
                let mut mem = [m[0], m[1]];
                let r = if nome == "filtrarFita" {
                    let mut e = f32s(&c["entrada"]);
                    som::filtrar_fita(&mut e, a, &mut mem);
                    e
                } else {
                    som::trecho_pra_tras(&f32s(&c["entrada"]), a, &mut mem, c["velocidade"].as_f64().unwrap())
                };
                perto(nome, &d(&r), &saida);
                perto(nome, &mem, &f64s(&c["memoriaDepois"]));
            }
            "ganhosCruzados" => {
                let t = u(c, "total");
                let g: Vec<f64> = (0..saida.len() / 2)
                    .flat_map(|i| {
                        let (a, b) = som::ganhos_cruzados(i, t);
                        [a, b]
                    })
                    .collect();
                perto(nome, &g, &saida);
            }
            "cruzar" => {
                let mut n = f32s(&c["novo"]);
                som::cruzar(&mut n, &f32s(&c["velho"]), u(c, "inicio"), u(c, "total"));
                perto(nome, &d(&n), &saida);
            }
            outro => panic!("caso desconhecido no fixture: {outro}"),
        }
    }
    assert!(casos.len() >= 10);
}
