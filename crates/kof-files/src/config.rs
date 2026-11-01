//! Documentos de configuração em `<dados>/config/<doc>.json`, legíveis por gente: `{"versao": 1, "valores": {...}}`.
//! Os valores usam os mesmos nomes de chave do antigo (`tema`, `volume`, `teclas.snes`, `visual.jogo.<id>`...), o que
//! deixa o `.kofsave` trazer as configurações do app antigo direto.
use kof_core::KofError;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

pub const VERSAO: u64 = 1;
const DOCS: [&str; 1] = ["config"];

fn arquivo(dados: &Path, doc: &str) -> Result<PathBuf, KofError> {
    if !DOCS.contains(&doc) {
        return Err(KofError::argumento("doc", format!("documento desconhecido: {doc}")));
    }
    Ok(dados.join("config").join(format!("{doc}.json")))
}

pub fn ler(dados: &Path, doc: &str) -> Result<Value, KofError> {
    let p = arquivo(dados, doc)?;
    let v: Value = match std::fs::read(&p) {
        Ok(b) => serde_json::from_slice(&b).unwrap_or_else(|e| {
            // arquivo estragado (editado à mão?): guarda uma cópia e começa do zero, sem derrubar o app
            tracing::error!(arquivo = %p.display(), "configuração ilegível ({e}); guardada como .estragado");
            let _ = std::fs::copy(&p, p.with_extension("json.estragado"));
            json!({})
        }),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => json!({}),
        Err(e) => return Err(KofError::de_io(p.display(), e)),
    };
    let versao = v.get("versao").and_then(Value::as_u64).unwrap_or(VERSAO);
    if versao > VERSAO {
        return Err(KofError::EsquemaNovo(format!("{doc} v{versao}")));
    }
    let valores = v.get("valores").cloned().unwrap_or_else(|| json!({}));
    Ok(json!({ "versao": VERSAO, "valores": valores }))
}

pub fn gravar(dados: &Path, doc: &str, data: &Value) -> Result<(), KofError> {
    let p = arquivo(dados, doc)?;
    let versao = data.get("versao").and_then(Value::as_u64).unwrap_or(VERSAO);
    if versao > VERSAO {
        return Err(KofError::EsquemaNovo(format!("{doc} v{versao}")));
    }
    let Some(valores) = data.get("valores").and_then(Value::as_object) else {
        return Err(KofError::argumento("data.valores", "esperava um objeto"));
    };
    if let Some((k, _)) = valores.iter().find(|(_, v)| !v.is_string()) {
        return Err(KofError::argumento(
            "data.valores",
            format!("o valor de {k} tem que ser texto"),
        ));
    }
    if let Some(d) = p.parent() {
        std::fs::create_dir_all(d).map_err(|e| KofError::de_io(d.display(), e))?;
    }
    let texto = serde_json::to_vec_pretty(&json!({ "versao": VERSAO, "valores": valores })).expect("json");
    let tmp = p.with_extension("tmp");
    std::fs::write(&tmp, texto).map_err(|e| KofError::de_io(tmp.display(), e))?;
    std::fs::rename(&tmp, &p).map_err(|e| KofError::de_io(p.display(), e))
}
