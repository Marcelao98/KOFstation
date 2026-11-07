//! O atualizador ligado ao app (M15.1): aplica a versão baixada na abertura e procura uma nova quando a página pede
//! (sozinha uns 15 s depois de abrir, ou pelo menu "🔄 Procurar atualização"). O trabalho de verdade (assinatura,
//! SHA-256, troca) está no crate `kof-atualiza`; aqui é a pasta, a chave, o HTTPS e o estado que a página consulta.
//!
//! Só liga num pacote (a pasta do executável tem `versao.txt` com `plataforma=`). Como no antigo: um arquivo
//! `nao-atualizar` do lado do executável desliga, e um `fonte.txt` troca de onde baixa (o endereço inteiro do manifesto,
//! pra testar sem o GitHub).
use kof_core::KofError;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// A chave pública (Ed25519, 32 bytes em hex) que assina o manifesto. Vazia: atualizador desligado. O teste de ponta a
/// ponta (`tools/testar-atualizacao.mjs`) compila com outra pela variável `KOF_CHAVE_PUBLICA_TESTE`.
const CHAVE: &str = match option_env!("KOF_CHAVE_PUBLICA_TESTE") {
    Some(c) => c,
    None => include_str!("../chave-atualizacao.txt"),
};
/// Onde o workflow `versao.yml` publica: a Release mais nova.
pub const URL_PADRAO: &str = "https://github.com/Marcelao98/KOFstation/releases/latest/download/manifesto.json";
/// Maior arquivo que o atualizador aceita (o executável tem ~8 MB, o maior núcleo ~5 MB).
const MAX_ARQUIVO: u64 = 256 << 20;

/// O que a página vê (`app.atualizacao`).
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Situacao {
    /// a versão desta pasta (`versao=` do `versao.txt`); vazia rodando do código
    pub versao: String,
    pub commit: String,
    pub ligado: bool,
    /// por que está desligado
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motivo: Option<String>,
    /// parado · procurando · emDia · pronta · erro
    pub situacao: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nova: Option<String>,
    pub baixados: usize,
    pub bytes: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub erro: Option<kof_core::contrato::ContractError>,
}

pub struct Atualizador {
    /// a pasta do pacote (None = desligado)
    pasta: Option<PathBuf>,
    url: String,
    estado: Arc<Mutex<Situacao>>,
}

/// O nome do executável na pasta (`kofstation` ou `KOFstation.exe`).
pub fn nome_do_executavel() -> Option<String> {
    Some(
        std::env::current_exe()
            .ok()?
            .file_name()?
            .to_string_lossy()
            .into_owned(),
    )
}

/// A pasta do pacote: a do executável, se tiver `versao.txt` com `plataforma=` (rodando do código não tem).
pub fn pasta_do_pacote(exe_dir: Option<&Path>) -> Option<PathBuf> {
    let d = exe_dir?;
    let t = std::fs::read_to_string(d.join("versao.txt")).ok()?;
    t.lines().any(|l| l.starts_with("plataforma=")).then(|| d.to_path_buf())
}

fn linha(app: &Path, chave: &str) -> String {
    std::fs::read_to_string(app.join("versao.txt"))
        .unwrap_or_default()
        .lines()
        .find_map(|l| l.strip_prefix(chave).map(|v| v.trim().to_string()))
        .unwrap_or_default()
}

/// Na abertura, antes de tudo: troca o que ficou baixado. Devolve true se trocou o executável e já abriu o novo (quem
/// chamou sai).
pub fn aplicar_na_abertura() -> bool {
    let Some(pasta) = pasta_do_pacote(crate::pastas::do_executavel().as_deref()) else {
        return false;
    };
    let Some(exe) = nome_do_executavel() else {
        return false;
    };
    match kof_atualiza::aplicar(&pasta, &exe) {
        Ok(Some(a)) if a.trocou_executavel => {
            let novo = pasta.join(&exe);
            let args: Vec<String> = std::env::args().skip(1).collect();
            match std::process::Command::new(&novo).args(&args).spawn() {
                Ok(_) => {
                    kof_atualiza::anotar(&pasta, &format!("abrindo a versão {} (executável novo)", a.versao));
                    true
                }
                Err(e) => {
                    // o novo está no lugar: na próxima abertura ele roda; agora segue o velho (já carregado)
                    kof_atualiza::anotar(&pasta, &format!("não consegui abrir o executável novo: {e}"));
                    false
                }
            }
        }
        Ok(_) => false,
        Err(e) => {
            kof_atualiza::anotar(&pasta, &format!("erro ao aplicar a atualização [{}]: {e}", e.codigo()));
            false
        }
    }
}

impl Atualizador {
    pub fn novo(exe_dir: Option<&Path>) -> Self {
        Self::com(pasta_do_pacote(exe_dir), CHAVE)
    }

    fn com(pasta: Option<PathBuf>, chave: &str) -> Self {
        let motivo = match &pasta {
            None => Some("rodando do código (sem versao.txt do pacote)".to_string()),
            Some(p) if p.join("nao-atualizar").exists() => Some("tem um arquivo nao-atualizar na pasta".into()),
            Some(_) if chave.trim().is_empty() => Some("esta versão foi compilada sem a chave do atualizador".into()),
            Some(_) => None,
        };
        let url = pasta
            .as_ref()
            .and_then(|p| std::fs::read_to_string(p.join("fonte.txt")).ok())
            .map(|t| t.trim().to_string())
            .filter(|t| t.starts_with("https://") || t.starts_with("http://127.0.0.1"))
            .unwrap_or_else(|| URL_PADRAO.to_string());
        let estado = Situacao {
            versao: pasta.as_deref().map(|p| linha(p, "versao=")).unwrap_or_default(),
            commit: pasta.as_deref().map(|p| linha(p, "commit=")).unwrap_or_default(),
            ligado: motivo.is_none(),
            motivo,
            situacao: "parado",
            nova: None,
            baixados: 0,
            bytes: 0,
            erro: None,
        };
        Self {
            pasta,
            url,
            estado: Arc::new(Mutex::new(estado)),
        }
    }

    /// A versão desta pasta, se for um pacote.
    pub fn versao(&self) -> Option<String> {
        let v = self.situacao().versao;
        (!v.is_empty()).then_some(v)
    }

    pub fn situacao(&self) -> Situacao {
        self.estado.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    /// Começa a procurar (numa linha separada; a página consulta a `situacao`). Já procurando: só devolve.
    pub fn procurar(&self) -> Situacao {
        let mut s = self.estado.lock().unwrap_or_else(|e| e.into_inner());
        let Some(pasta) = self.pasta.clone().filter(|_| s.ligado) else {
            return s.clone();
        };
        if s.situacao == "procurando" {
            return s.clone();
        }
        s.situacao = "procurando";
        s.erro = None;
        let volta = s.clone();
        drop(s);
        let (estado, url) = (self.estado.clone(), self.url.clone());
        std::thread::spawn(move || {
            let r = kof_atualiza::procurar(&pasta, crate::pastas::plataforma(), CHAVE.trim(), &url, &baixar);
            let mut s = estado.lock().unwrap_or_else(|e| e.into_inner());
            match r {
                Ok(kof_atualiza::Resultado::EmDia { .. }) => s.situacao = "emDia",
                Ok(kof_atualiza::Resultado::Pronta {
                    versao,
                    baixados,
                    bytes,
                }) => {
                    s.situacao = "pronta";
                    s.nova = Some(versao);
                    s.baixados = baixados;
                    s.bytes = bytes;
                }
                Err(e) => {
                    kof_atualiza::anotar(&pasta, &format!("erro ao procurar [{}]: {e}", e.codigo()));
                    s.situacao = "erro";
                    s.erro = Some(kof_core::contrato::ContractError::from(&e));
                }
            }
        });
        volta
    }
}

fn agente() -> ureq::Agent {
    let tls = ureq::tls::TlsConfig::builder()
        .root_certs(ureq::tls::RootCerts::PlatformVerifier)
        .build();
    ureq::Agent::config_builder()
        .tls_config(tls)
        .timeout_connect(Some(Duration::from_secs(15)))
        .timeout_global(Some(Duration::from_secs(600)))
        .http_status_as_error(false)
        .build()
        .into()
}

/// HTTPS com o certificado do sistema (o mesmo das capas).
fn baixar(url: &str) -> Result<Vec<u8>, KofError> {
    let r = agente()
        .get(url)
        .call()
        .map_err(|e| KofError::Rede(format!("{url}: {e}")))?;
    if r.status() != 200 {
        return Err(KofError::Rede(format!("{url}: o servidor respondeu {}", r.status())));
    }
    r.into_body()
        .with_config()
        .limit(MAX_ARQUIVO)
        .read_to_vec()
        .map_err(|e| KofError::Rede(format!("{url}: {e}")))
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn so_liga_num_pacote_com_chave_e_sem_nao_atualizar() {
        let a = Atualizador::com(None, "ab");
        assert!(!a.situacao().ligado);
        assert_eq!(a.procurar().situacao, "parado");

        let t = tempfile::tempdir().unwrap();
        std::fs::write(
            t.path().join("versao.txt"),
            "versao=202611071200\ncommit=abc\nplataforma=linux-x64\n",
        )
        .unwrap();
        let p = pasta_do_pacote(Some(t.path()));
        assert_eq!(p.as_deref(), Some(t.path()));
        let a = Atualizador::com(p.clone(), "");
        let s = a.situacao();
        assert!(!s.ligado && s.motivo.unwrap().contains("chave"));
        assert_eq!(s.versao, "202611071200");
        assert_eq!(a.versao().as_deref(), Some("202611071200"));
        assert!(Atualizador::com(p.clone(), "ab").situacao().ligado);
        std::fs::write(t.path().join("nao-atualizar"), "").unwrap();
        assert!(!Atualizador::com(p.clone(), "ab").situacao().ligado);
        // fonte.txt troca de onde baixa (só https ou o próprio computador)
        std::fs::write(t.path().join("fonte.txt"), "http://127.0.0.1:8000/manifesto.json\n").unwrap();
        assert_eq!(
            Atualizador::com(p.clone(), "ab").url,
            "http://127.0.0.1:8000/manifesto.json"
        );
        std::fs::write(t.path().join("fonte.txt"), "http://malicioso/m.json").unwrap();
        assert_eq!(Atualizador::com(p, "ab").url, URL_PADRAO);
        // sem plataforma= não é pacote
        std::fs::write(t.path().join("versao.txt"), "versao=1\n").unwrap();
        assert!(pasta_do_pacote(Some(t.path())).is_none());
    }
}
