//! Comandos do núcleo nativo (M11b, D32): o núcleo fica na pasta `nativo/` ao lado do executável (D33) e o
//! `kofstation` abre um processo filho (`kofstation --nativo`) por jogo. A página conecta na WebSocket dele com o token devolvido.
//! O jogo é lido pelo próprio processo direto da Kof Games (o CD não passa pela página); o CD zipado é extraído
//! antes numa pasta de cache (`<dados>/nativo/cache/<sistema>/`, um CD por vez).
use kof_core::KofError;
use kof_nativo::ProcessoNativo;
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Sistemas com núcleo nativo na pasta `nativo/` (ou no repositório, rodando do código).
pub fn sistemas() -> Vec<&'static str> {
    ["ps1", "ps2"]
        .into_iter()
        .filter(|s| crate::pastas::nucleo_nativo(s).is_some())
        .collect()
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ArgsAbrir {
    sistema: String,
    /// caminho na Kof Games (o mesmo do `file.read`)
    path: String,
    /// BIOS da loja `bios` que vão pro /sistema do núcleo (chave = nome que o núcleo procura)
    #[serde(default)]
    bios: Vec<String>,
    #[serde(default)]
    opcoes: BTreeMap<String, String>,
    #[serde(default)]
    dispositivo: Option<u32>,
}

impl ArgsAbrir {
    pub fn caminho(&self) -> &str {
        &self.path
    }
}

#[derive(Default)]
pub struct Nativos {
    atual: Mutex<Option<ProcessoNativo>>,
}

/// Nome de arquivo simples (sem pasta, sem `..`): as BIOS vão pro /sistema com o nome da chave.
fn nome_simples(n: &str) -> Result<&str, KofError> {
    let ok = !n.is_empty() && !n.contains(['/', '\\', ':']) && n != "." && n != "..";
    ok.then_some(n)
        .ok_or_else(|| KofError::argumento("bios", format!("nome de BIOS inválido: {n}")))
}

impl Nativos {
    pub fn abrir(
        &self,
        pasta_dados: &Path,
        jogo: PathBuf,
        lojas: &kof_files::loja::Lojas,
        origem: String,
        a: ArgsAbrir,
    ) -> Result<Value, KofError> {
        self.fechar(); // um jogo nativo por vez
        let nucleo = crate::pastas::nucleo_nativo(&a.sistema).ok_or_else(|| {
            KofError::Nucleo(format!(
                "falta o núcleo nativo de {} na pasta nativo/ do KOFstation",
                a.sistema
            ))
        })?;
        let sistema = pasta_dados.join("nativo").join("sistema").join(&a.sistema);
        let saves = pasta_dados.join("nativo").join("saves").join(&a.sistema);
        for d in [&sistema, &saves] {
            std::fs::create_dir_all(d).map_err(|e| KofError::de_io(d.display(), e))?;
        }
        // o PCSX2 procura a BIOS em <sistema>/pcsx2/bios (o nome vai na opção pcsx2_bios)
        let pasta_bios = if a.sistema == "ps2" {
            sistema.join("pcsx2").join("bios")
        } else {
            sistema.clone()
        };
        std::fs::create_dir_all(&pasta_bios).map_err(|e| KofError::de_io(pasta_bios.display(), e))?;
        for b in &a.bios {
            let n = nome_simples(b)?;
            let dados = lojas.pegar("bios", n)?;
            let alvo = pasta_bios.join(n);
            if std::fs::read(&alvo).ok().as_deref() != Some(&dados[..]) {
                std::fs::write(&alvo, &dados).map_err(|e| KofError::de_io(alvo.display(), e))?;
            }
        }
        // CD de PS1 zipado: o núcleo não abre zip; o CD sai numa pasta de cache (um por vez) e o núcleo lê de lá
        let jogo = if jogo.extension().is_some_and(|x| x.eq_ignore_ascii_case("zip")) {
            let cache = pasta_dados.join("nativo").join("cache").join(&a.sistema);
            kof_files::zip::extrair_cd(&jogo, &cache)?
        } else {
            jogo
        };
        let exe =
            std::env::current_exe().map_err(|e| KofError::Nucleo(format!("não achei o próprio executável: {e}")))?;
        let p = ProcessoNativo::abrir(
            &exe,
            &["--nativo"],
            &kof_nativo::Pedido {
                nucleo,
                jogo: Some(jogo),
                sistema,
                saves,
                origem: Some(origem),
                variaveis: a.opcoes,
                sem_som: std::env::var_os("KOF_SEM_SOM").is_some(),
                dispositivo: a.dispositivo,
            },
        )?;
        let r = serde_json::json!({
            "porta": p.porta,
            "token": p.token,
            "nucleo": p.resposta.get("nucleo").cloned().unwrap_or(Value::Null),
            "taxaSaida": p.resposta.get("taxaSaida").cloned().unwrap_or(Value::Null),
        });
        *self.atual.lock().unwrap_or_else(|e| e.into_inner()) = Some(p);
        Ok(r)
    }

    pub fn fechar(&self) {
        if let Some(p) = self.atual.lock().unwrap_or_else(|e| e.into_inner()).take() {
            let s = p.fechar();
            tracing::info!(?s, "jogo nativo fechado");
        }
    }

    /// Últimas linhas do log do processo e se ele ainda está vivo (o caçador de bugs manda junto quando cai).
    pub fn log(&self) -> Value {
        let mut g = self.atual.lock().unwrap_or_else(|e| e.into_inner());
        match g.as_mut() {
            Some(p) => {
                let saiu = p.saiu().map(|s| s.to_string());
                serde_json::json!({"vivo": saiu.is_none(), "saida": saiu, "linhas": p.log()})
            }
            None => serde_json::json!({"vivo": false, "saida": null, "linhas": []}),
        }
    }
}

#[cfg(test)]
mod testes {
    use super::nome_simples;

    #[test]
    fn bios_so_com_nome_simples() {
        assert!(nome_simples("scph5501.bin").is_ok());
        for ruim in ["", "..", "../x", "a/b", "c:\\x", "a\\b"] {
            assert!(nome_simples(ruim).is_err(), "{ruim}");
        }
    }
}
