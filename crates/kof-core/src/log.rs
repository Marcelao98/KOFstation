//! Log estruturado em arquivo (`<pasta de dados>/logs/kofstation.log.<dia>`), um por dia. Substitui os
//! `atualizacao.log`/`kofnativo.log` soltos do app antigo.
use crate::erro::KofError;
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
