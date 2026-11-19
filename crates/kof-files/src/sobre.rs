//! A ficha de um jogo (B.3): sinopse e notas da crítica. Acha o jogo no Wikidata (CC0) pelo título exato e o console,
//! e pega o resumo do artigo da Wikipédia (CC BY-SA) em português, ou em inglês quando não tem. Só fala com
//! `query.wikidata.org` e `pt|en.wikipedia.org`; o app manda só o console e os títulos candidatos. Guardado em
//! `<dados>/cache/sobre/<console>/<título>.json`; "não achou" fica lembrado por 30 dias (`.falhou`), erro de rede não.
use kof_core::KofError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

const SPARQL: &str = "https://query.wikidata.org/sparql";
const LEMBRAR_FALHA: Duration = Duration::from_secs(30 * 86400);
const MAX_RESPOSTA: u64 = 2 << 20;
/// Sem nome nem contato de ninguém: só o programa.
const AGENTE: &str = "KOFstation/0.1 (emulador; ficha de jogo)";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Nota {
    /// como veio ("97%", "8.5/10", "87/100")
    pub valor: String,
    /// quem deu (a revista ou o site), quando o Wikidata diz
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub por: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Sobre {
    /// o resumo do artigo (texto puro)
    pub sinopse: String,
    /// "pt" ou "en"
    pub lingua: String,
    /// o artigo (pra dar o crédito: CC BY-SA)
    pub url: String,
    /// o item do Wikidata
    pub wikidata: String,
    pub notas: Vec<Nota>,
}

/// O console no Wikidata (conferido em 19/11/2026 pelo `wbsearchentities`).
fn plataformas(sistema: &str) -> Option<&'static [&'static str]> {
    Some(match sistema {
        "snes" => &["Q183259"],
        "nes" => &["Q172742"],
        "gb" | "gbc" => &["Q186437", "Q203992"],
        "gba" => &["Q188642"],
        "md" => &["Q10676"],
        "sms" => &["Q209868"],
        "gg" => &["Q751719"],
        "neogeo" => &["Q1054350"],
        "ps1" => &["Q10677"],
        "n64" => &["Q184839"],
        "ps2" => &["Q10680"],
        _ => return None,
    })
}

/// Título que pode ir dentro de uma string SPARQL: sem aspas, barra invertida nem quebra de linha.
fn titulo_ok(t: &str) -> bool {
    !t.trim().is_empty() && t.len() <= 200 && !t.contains(['"', '\\', '\n', '\r', '\0'])
}

fn pasta(dados: &Path, sistema: &str) -> PathBuf {
    dados.join("cache").join("sobre").join(sistema)
}

fn nome_arquivo(t: &str) -> String {
    crate::loja::codificar(t).unwrap_or_else(|_| "x".into())
}

fn agente() -> ureq::Agent {
    let tls = ureq::tls::TlsConfig::builder()
        .root_certs(ureq::tls::RootCerts::PlatformVerifier)
        .build();
    ureq::Agent::config_builder()
        .tls_config(tls)
        .timeout_global(Some(Duration::from_secs(20)))
        .http_status_as_error(false)
        .build()
        .into()
}

fn json(r: ureq::http::Response<ureq::Body>) -> Result<Option<Value>, KofError> {
    if r.status() != 200 {
        return Ok(None);
    }
    let corpo = r
        .into_body()
        .with_config()
        .limit(MAX_RESPOSTA)
        .read_to_vec()
        .map_err(|e| KofError::Rede(e.to_string()))?;
    serde_json::from_slice(&corpo)
        .map(Some)
        .map_err(|e| KofError::Rede(format!("resposta que não é JSON: {e}")))
}

/// A consulta: os itens do console com um dos títulos (nome ou apelido em inglês), os artigos pt/en e as notas.
pub fn consulta(sistema: &str, titulos: &[String]) -> Result<String, KofError> {
    let plat = plataformas(sistema).ok_or_else(|| KofError::argumento("sistema", format!("console {sistema}")))?;
    let ts: Vec<&String> = titulos.iter().filter(|t| titulo_ok(t)).take(6).collect();
    if ts.is_empty() {
        return Err(KofError::argumento("titulos", "nenhum título que dê pra procurar"));
    }
    // o nome em inglês ou o "mul" (o nome padrão, igual em toda língua: o Wikidata passou a usar pra muitos jogos)
    let valores: Vec<String> = ts
        .iter()
        .flat_map(|t| [format!("\"{}\"@en", t.trim()), format!("\"{}\"@mul", t.trim())])
        .collect();
    let plats: Vec<String> = plat.iter().map(|q| format!("wd:{q}")).collect();
    // o jogo primeiro (subconsulta: rápido pelo índice do nome), depois os artigos e as notas dele
    Ok(format!(
        "SELECT ?item ?pt ?en ?nota ?porNome WHERE {{ \
         {{ SELECT DISTINCT ?item WHERE {{ VALUES ?l {{ {} }} VALUES ?plat {{ {} }} \
         ?item rdfs:label|skos:altLabel ?l; wdt:P400 ?plat . }} LIMIT 5 }} \
         OPTIONAL {{ ?pt schema:about ?item; schema:isPartOf <https://pt.wikipedia.org/> }} \
         OPTIONAL {{ ?en schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }} \
         OPTIONAL {{ ?item p:P444 ?st . ?st ps:P444 ?nota . \
         OPTIONAL {{ ?st pq:P447 ?por . ?por rdfs:label ?porNome . FILTER(LANG(?porNome) IN (\"en\", \"mul\")) }} }} \
         }} LIMIT 60",
        valores.join(" "),
        plats.join(" ")
    ))
}

/// Do resultado do SPARQL: o item (o que tem artigo em português primeiro), o artigo e as notas dele.
pub fn escolher(r: &Value) -> Option<(String, String, String, Vec<Nota>)> {
    let linhas = r["results"]["bindings"].as_array()?;
    let v = |b: &Value, k: &str| b[k]["value"].as_str().unwrap_or("").to_string();
    let tem_pt = |b: &&Value| !v(b, "pt").is_empty();
    let tem_en = |b: &&Value| !v(b, "en").is_empty();
    let melhor = linhas.iter().find(tem_pt).or_else(|| linhas.iter().find(tem_en))?;
    let item = v(melhor, "item");
    let (lingua, url) = if tem_pt(&melhor) {
        ("pt", v(melhor, "pt"))
    } else {
        ("en", v(melhor, "en"))
    };
    let mut notas: Vec<Nota> = Vec::new();
    for b in linhas.iter().filter(|b| v(b, "item") == item) {
        let valor = v(b, "nota");
        let por = v(b, "porNome");
        // o serviço de nomes devolve o próprio código (Q123) quando não tem nome em inglês
        let por = if por.starts_with('Q') && por[1..].chars().all(|c| c.is_ascii_digit()) {
            String::new()
        } else {
            por
        };
        let n = Nota { valor, por };
        if !n.valor.is_empty() && !notas.contains(&n) {
            notas.push(n);
        }
    }
    Some((item, lingua.to_string(), url, notas))
}

/// O endereço do resumo de um artigo (só pt/en.wikipedia.org).
pub fn url_do_resumo(artigo: &str) -> Option<String> {
    for lingua in ["pt", "en"] {
        let base = format!("https://{lingua}.wikipedia.org/wiki/");
        if let Some(t) = artigo.strip_prefix(&base) {
            if t.is_empty() || t.contains(['?', '#']) {
                return None;
            }
            return Some(format!(
                "https://{lingua}.wikipedia.org/api/rest_v1/page/summary/{}",
                t.replace('/', "%2F")
            ));
        }
    }
    None
}

/// Procura (ou pega do cache). `Ok(None)` = o Wikidata não tem esse jogo com artigo (lembrado por 30 dias).
pub fn buscar(dados: &Path, sistema: &str, titulos: &[String]) -> Result<Option<Sobre>, KofError> {
    let q = consulta(sistema, titulos)?;
    let d = pasta(dados, sistema);
    let chave = nome_arquivo(titulos.first().map(String::as_str).unwrap_or(""));
    let guardado = d.join(format!("{chave}.json"));
    if let Ok(b) = std::fs::read(&guardado) {
        if let Ok(s) = serde_json::from_slice::<Sobre>(&b) {
            return Ok(Some(s));
        }
    }
    let falhou = d.join(format!("{chave}.falhou"));
    if std::fs::metadata(&falhou)
        .and_then(|m| m.modified())
        .is_ok_and(|t| SystemTime::now().duration_since(t).unwrap_or_default() < LEMBRAR_FALHA)
    {
        return Ok(None);
    }
    let ag = agente();
    // POST com formulário (o serviço aceita; a consulta não passa pela URL)
    let r = ag
        .post(SPARQL)
        .header("Accept", "application/sparql-results+json")
        .header("User-Agent", AGENTE)
        .send_form([("query", q.as_str())])
        .map_err(|e| KofError::Rede(e.to_string()))?;
    let achado = json(r)?.as_ref().and_then(escolher);
    std::fs::create_dir_all(&d).map_err(|e| KofError::de_io(d.display(), e))?;
    let Some((item, lingua, url, notas)) = achado else {
        let _ = std::fs::write(&falhou, b""); // lembrar é só pra não perguntar de novo: falhar não muda a resposta
        return Ok(None);
    };
    let resumo = url_do_resumo(&url).ok_or_else(|| KofError::Rede(format!("artigo fora da Wikipédia: {url}")))?;
    let r = ag
        .get(&resumo)
        .header("User-Agent", AGENTE)
        .call()
        .map_err(|e| KofError::Rede(e.to_string()))?;
    let sinopse = json(r)?
        .and_then(|v| v["extract"].as_str().map(str::to_string))
        .unwrap_or_default();
    let s = Sobre {
        sinopse,
        lingua,
        url,
        wikidata: item,
        notas,
    };
    let texto = serde_json::to_vec_pretty(&s).expect("json");
    std::fs::write(&guardado, texto).map_err(|e| KofError::de_io(guardado.display(), e))?;
    Ok(Some(s))
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn consulta_so_com_titulos_limpos_e_console_conhecido() {
        let q = consulta("snes", &["Chrono Trigger".into(), "Mau\"; DROP".into(), String::new()]).unwrap();
        assert!(q.contains("\"Chrono Trigger\"@en") && q.contains("\"Chrono Trigger\"@mul"));
        assert!(!q.contains("DROP"));
        assert!(q.contains("wd:Q183259"));
        assert!(consulta("xbox", &["Halo".into()]).is_err());
        assert!(consulta("snes", &["a\\b".into()]).is_err());
        let gb = consulta("gbc", &["Tetris".into()]).unwrap();
        assert!(gb.contains("wd:Q186437") && gb.contains("wd:Q203992"));
    }

    #[test]
    fn escolhe_o_item_com_artigo_em_portugues_e_junta_as_notas_dele() {
        let r: Value = serde_json::from_str(
            r#"{"results":{"bindings":[
              {"item":{"value":"http://www.wikidata.org/entity/Q1"},"en":{"value":"https://en.wikipedia.org/wiki/Outro"}},
              {"item":{"value":"http://www.wikidata.org/entity/Q2"},"pt":{"value":"https://pt.wikipedia.org/wiki/Jogo"},
               "nota":{"value":"97%"},"porNome":{"value":"Gen4"}},
              {"item":{"value":"http://www.wikidata.org/entity/Q2"},"pt":{"value":"https://pt.wikipedia.org/wiki/Jogo"},
               "nota":{"value":"9/10"},"porNome":{"value":"Q999"}},
              {"item":{"value":"http://www.wikidata.org/entity/Q2"},"pt":{"value":"https://pt.wikipedia.org/wiki/Jogo"},
               "nota":{"value":"97%"},"porNome":{"value":"Gen4"}}
            ]}}"#,
        )
        .unwrap();
        let (item, lingua, url, notas) = escolher(&r).unwrap();
        assert_eq!(item, "http://www.wikidata.org/entity/Q2");
        assert_eq!(
            (lingua.as_str(), url.as_str()),
            ("pt", "https://pt.wikipedia.org/wiki/Jogo")
        );
        assert_eq!(
            notas,
            vec![
                Nota {
                    valor: "97%".into(),
                    por: "Gen4".into()
                },
                Nota {
                    valor: "9/10".into(),
                    por: String::new()
                },
            ]
        );
        let vazio: Value = serde_json::from_str(r#"{"results":{"bindings":[]}}"#).unwrap();
        assert!(escolher(&vazio).is_none());
    }

    #[test]
    fn resumo_so_da_wikipedia() {
        assert_eq!(
            url_do_resumo("https://pt.wikipedia.org/wiki/Chrono_Trigger").as_deref(),
            Some("https://pt.wikipedia.org/api/rest_v1/page/summary/Chrono_Trigger")
        );
        assert_eq!(
            url_do_resumo("https://en.wikipedia.org/wiki/A/B").as_deref(),
            Some("https://en.wikipedia.org/api/rest_v1/page/summary/A%2FB")
        );
        assert!(url_do_resumo("https://mal.exemplo/wiki/X").is_none());
        assert!(url_do_resumo("https://pt.wikipedia.org/wiki/X?y=1").is_none());
    }

    /// Pela internet de verdade (fora do CI): `cargo test -p kof-files --lib sobre -- --ignored`.
    #[test]
    #[ignore = "usa a internet (Wikidata e Wikipédia)"]
    fn de_verdade() {
        let d = tempfile::tempdir().unwrap();
        let s = buscar(d.path(), "snes", &["Chrono Trigger".into()])
            .unwrap()
            .expect("achou");
        assert_eq!(s.lingua, "pt");
        assert!(s.sinopse.contains("Square"), "{}", s.sinopse);
        // a segunda vez vem do cache
        assert_eq!(buscar(d.path(), "snes", &["Chrono Trigger".into()]).unwrap(), Some(s));
        let smw = buscar(d.path(), "snes", &["Super Mario World".into()])
            .unwrap()
            .expect("achou");
        assert!(!smw.notas.is_empty(), "{smw:?}");
        assert!(buscar(d.path(), "snes", &["Jogo Que Nao Existe 12345".into()])
            .unwrap()
            .is_none());
        assert!(d.path().join("cache/sobre/snes").read_dir().unwrap().any(|e| e
            .unwrap()
            .file_name()
            .to_string_lossy()
            .ends_with(".falhou")));
    }
}
