//! Log estruturado em arquivo (`<pasta de dados>/logs/kofstation.log.<dia>`), um por dia. Substitui os
//! `atualizacao.log`/`kofnativo.log` soltos do app antigo. Os erros da tela chegam pelo comando `log.write`.
use crate::erro::KofError;
use serde::Deserialize;
use std::path::Path;
use tracing_appender::non_blocking::WorkerGuard;

/// Liga o log. Guarde o `WorkerGuard` até o fim do programa (soltar = gravar o que falta e parar).
pub fn ligar(pasta_de_dados: &Path) -> Result<WorkerGuard, KofError> {
    let pasta = pasta_de_dados.join("logs");
    std::fs::create_dir_all(&pasta).map_err(|fonte| KofError::PastaDeDados {
        caminho: pasta.clone(),
        fonte,
    })?;
    let arquivo = tracing_appender::rolling::daily(&pasta, "kofstation.log");
    let (escritor, guarda) = tracing_appender::non_blocking(arquivo);
    let filtro = tracing_subscriber::EnvFilter::try_from_env("KOF_LOG")
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .with_writer(escritor)
        .with_ansi(false)
        .with_env_filter(filtro)
        .try_init()
        .map_err(|e| KofError::Log(e.to_string()))?;
    Ok(guarda)
}

/// Uma linha de log vinda da tela (`log.write`).
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LinhaDaTela {
    pub level: String,
    pub target: String,
    pub message: String,
    #[serde(default)]
    pub fields: Option<serde_json::Map<String, serde_json::Value>>,
}

const MAX: usize = 8 * 1024;

fn cortar(s: &str) -> &str {
    if s.len() <= MAX {
        return s;
    }
    let mut i = MAX;
    while !s.is_char_boundary(i) {
        i -= 1;
    }
    &s[..i]
}

/// Grava no log do Rust uma linha que veio da tela. A origem fica marcada (`tela`), e o texto é cortado em 8 KB pra
/// uma tela com defeito não encher o disco.
pub fn escrever(l: &LinhaDaTela) -> Result<(), KofError> {
    let alvo = cortar(&l.target);
    let msg = cortar(&l.message);
    let campos = l
        .fields
        .as_ref()
        .map(|f| cortar(&serde_json::Value::Object(f.clone()).to_string()).to_string())
        .unwrap_or_default();
    match l.level.as_str() {
        "error" => tracing::error!(target: "tela", alvo, campos, "{msg}"),
        "warn" => tracing::warn!(target: "tela", alvo, campos, "{msg}"),
        "info" => tracing::info!(target: "tela", alvo, campos, "{msg}"),
        "debug" => tracing::debug!(target: "tela", alvo, campos, "{msg}"),
        outro => return Err(KofError::NivelInvalido(outro.to_string())),
    }
    Ok(())
}
