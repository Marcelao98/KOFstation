//! Modo diagnóstico (M16.3, docs/DIAGNOSTICO.md): grava as sessões de jogo em `<dados>/diagnostico/<sessão>/`, aos
//! pedaços (a página manda lotes a cada 5 s), e exporta um `.zip` pra mandar. Comandos com nome e escopo: a sessão é
//! um nome conferido (letras, números, `_`, `-`) dentro da pasta `diagnostico`, e os arquivos são só os da lista.
use kof_core::KofError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

/// Os arquivos de uma sessão (nenhum outro nome entra).
pub const ARQUIVOS: [&str; 6] = [
    "sessao.json",
    "resumo.txt",
    "quadros.csv",
    "segundos.csv",
    "engasgos.csv",
    "log.txt",
];
/// Tamanho máximo de uma sessão (1 h a 60 fps dá ~10 MB de CSV).
pub const LIMITE_SESSAO: u64 = 20 << 20;
/// Sessões mais velhas que isso são apagadas ao abrir uma nova.
pub const VALIDADE: Duration = Duration::from_secs(30 * 24 * 3600);

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ArgsAbrir {
    /// nome da pasta (`AAAA-MM-DD_HHMM_<jogo>`, montado pelo domain/diagnostico.ts)
    pub nome: String,
    /// o conteúdo do sessao.json (máquina, jogo, núcleo, opções)
    pub sessao: Value,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ArgsAnotar {
    pub sessao: String,
    pub arquivo: String,
    /// true = troca o arquivo inteiro (resumo.txt); false = acrescenta no fim
    #[serde(default)]
    pub trocar: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ArgsExportar {
    pub sessoes: Vec<String>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Sessao {
    pub sessao: String,
    pub bytes: u64,
    /// última vez que foi escrita (ms desde 1970)
    pub quando: u64,
    pub resumo: Option<String>,
}

fn pasta(dados: &Path) -> PathBuf {
    dados.join("diagnostico")
}

fn nome_ok(n: &str) -> bool {
    !n.is_empty()
        && n.len() <= 80
        && !n.starts_with(['.', '-'])
        && n.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn da_sessao(dados: &Path, sessao: &str) -> Result<PathBuf, KofError> {
    if !nome_ok(sessao) {
        return Err(KofError::argumento(
            "sessao",
            format!("nome de sessão inválido: {sessao}"),
        ));
    }
    let p = pasta(dados).join(sessao);
    if !p.is_dir() {
        return Err(KofError::NaoEncontrado(format!("sessão de diagnóstico {sessao}")));
    }
    Ok(p)
}

fn tamanho(p: &Path) -> u64 {
    std::fs::read_dir(p)
        .map(|d| d.filter_map(|e| e.ok()?.metadata().ok()).map(|m| m.len()).sum())
        .unwrap_or(0)
}

fn ms(t: SystemTime) -> u64 {
    t.duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Apaga as sessões mais velhas que a validade. Devolve quantas apagou.
pub fn limpar(dados: &Path, agora: SystemTime) -> usize {
    let Ok(d) = std::fs::read_dir(pasta(dados)) else {
        return 0;
    };
    let mut n = 0;
    for e in d.flatten() {
        let velha = e
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|m| agora.duration_since(m).ok())
            .is_some_and(|idade| idade > VALIDADE);
        let nome = e.file_name();
        if velha && nome.to_str().is_some_and(nome_ok) && e.path().is_dir() {
            match std::fs::remove_dir_all(e.path()) {
                Ok(()) => n += 1,
                Err(err) => tracing::warn!("não apaguei a sessão velha {:?}: {err}", nome),
            }
        }
    }
    n
}

/// Cria a pasta da sessão e grava o sessao.json. Nome repetido (duas no mesmo minuto) ganha `-2`, `-3`…
pub fn abrir(dados: &Path, a: ArgsAbrir) -> Result<String, KofError> {
    if !nome_ok(&a.nome) {
        return Err(KofError::argumento(
            "nome",
            format!("nome de sessão inválido: {}", a.nome),
        ));
    }
    limpar(dados, SystemTime::now());
    let base = pasta(dados);
    std::fs::create_dir_all(&base).map_err(|e| KofError::de_io(base.display(), e))?;
    let mut nome = a.nome.clone();
    for i in 2.. {
        if !base.join(&nome).exists() {
            break;
        }
        nome = format!("{}-{i}", a.nome);
    }
    let p = base.join(&nome);
    std::fs::create_dir(&p).map_err(|e| KofError::de_io(p.display(), e))?;
    let json = serde_json::to_vec_pretty(&a.sessao).map_err(|e| KofError::argumento("sessao", e.to_string()))?;
    std::fs::write(p.join("sessao.json"), json).map_err(|e| KofError::de_io("sessao.json", e))?;
    Ok(nome)
}

/// Acrescenta (ou troca) um arquivo da sessão. Passou do limite: não grava e devolve `true` (cheio).
pub fn anotar(dados: &Path, a: &ArgsAnotar, corpo: &[u8]) -> Result<bool, KofError> {
    if !ARQUIVOS.contains(&a.arquivo.as_str()) || a.arquivo == "sessao.json" {
        return Err(KofError::argumento(
            "arquivo",
            format!("arquivo de diagnóstico desconhecido: {}", a.arquivo),
        ));
    }
    let p = da_sessao(dados, &a.sessao)?;
    let alvo = p.join(&a.arquivo);
    // o resumo sempre entra (é pequeno e é o que importa); o resto para no limite
    if a.arquivo != "resumo.txt" && tamanho(&p) + corpo.len() as u64 > LIMITE_SESSAO {
        return Ok(true);
    }
    let r = if a.trocar {
        std::fs::write(&alvo, corpo)
    } else {
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&alvo)
            .and_then(|mut f| f.write_all(corpo))
    };
    r.map_err(|e| KofError::de_io(&a.arquivo, e))?;
    Ok(false)
}

/// As sessões gravadas, da mais nova pra mais velha, com a 1ª linha do resumo (se já fechou).
pub fn listar(dados: &Path) -> Vec<Sessao> {
    let Ok(d) = std::fs::read_dir(pasta(dados)) else {
        return Vec::new();
    };
    let mut v: Vec<Sessao> = d
        .flatten()
        .filter(|e| e.path().is_dir())
        .filter_map(|e| {
            let sessao = e.file_name().to_str().filter(|n| nome_ok(n))?.to_string();
            let p = e.path();
            let quando = std::fs::read_dir(&p)
                .ok()?
                .flatten()
                .filter_map(|f| f.metadata().ok()?.modified().ok())
                .max()
                .map(ms)
                .unwrap_or(0);
            let resumo = std::fs::read_to_string(p.join("resumo.txt"))
                .ok()
                .map(|t| t.trim_end().to_string());
            Some(Sessao {
                bytes: tamanho(&p),
                sessao,
                quando,
                resumo,
            })
        })
        .collect();
    v.sort_by(|a, b| b.quando.cmp(&a.quando).then_with(|| b.sessao.cmp(&a.sessao)));
    v
}

/// Tira a pasta da casa do usuário dos textos (o relatório não leva caminho pessoal).
fn sem_caminho(texto: &[u8], casa: Option<&Path>) -> Vec<u8> {
    let Some(c) = casa.and_then(|c| c.to_str()).filter(|c| c.len() > 3) else {
        return texto.to_vec();
    };
    let t = String::from_utf8_lossy(texto);
    let mut t = t.replace(c, "~");
    if cfg!(windows) {
        t = t.replace(&c.replace('\\', "/"), "~");
    }
    t.into_bytes()
}

/// O `.zip` com as sessões pedidas (cada uma na pasta dela) e os logs do app das últimas 24 h, sem caminhos pessoais.
pub fn exportar(dados: &Path, a: &ArgsExportar, casa: Option<&Path>) -> Result<Vec<u8>, KofError> {
    if a.sessoes.is_empty() {
        return Err(KofError::argumento("sessoes", "escolha pelo menos uma sessão"));
    }
    let mut itens = Vec::new();
    for s in &a.sessoes {
        let p = da_sessao(dados, s)?;
        for arq in ARQUIVOS {
            if let Ok(b) = std::fs::read(p.join(arq)) {
                itens.push((format!("{s}/{arq}"), sem_caminho(&b, casa)));
            }
        }
    }
    let agora = SystemTime::now();
    if let Ok(d) = std::fs::read_dir(dados.join("logs")) {
        for e in d.flatten() {
            let recente = e
                .metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|m| agora.duration_since(m).ok())
                .is_some_and(|idade| idade < Duration::from_secs(24 * 3600));
            let nome = e.file_name().to_string_lossy().to_string();
            if recente && nome.starts_with("kofstation.log") {
                if let Ok(b) = std::fs::read(e.path()) {
                    itens.push((format!("logs/{nome}"), sem_caminho(&b, casa)));
                }
            }
        }
    }
    kof_files::zip::montar(&itens).map_err(|e| KofError::de_io("relatório de diagnóstico", e))
}

/// A máquina, pro sessao.json: sistema, processador, núcleos e memória. O que não der pra ler vem vazio.
pub fn maquina() -> Value {
    let nucleos = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(0);
    let (processador, memoria_mb) = sistema::processador_e_memoria();
    serde_json::json!({
        "sistema": std::env::consts::OS,
        "arquitetura": std::env::consts::ARCH,
        "versaoDoSistema": sistema::versao(),
        "processador": processador,
        "nucleos": nucleos,
        "memoriaMb": memoria_mb,
    })
}

#[cfg(target_os = "linux")]
mod sistema {
    pub fn processador_e_memoria() -> (Option<String>, Option<u64>) {
        let cpu = std::fs::read_to_string("/proc/cpuinfo").ok().and_then(|t| {
            t.lines()
                .find(|l| l.starts_with("model name"))
                .and_then(|l| l.split_once(':'))
                .map(|(_, v)| v.trim().to_string())
        });
        let mem = std::fs::read_to_string("/proc/meminfo").ok().and_then(|t| {
            t.lines()
                .find(|l| l.starts_with("MemTotal:"))
                .and_then(|l| l.split_whitespace().nth(1)?.parse::<u64>().ok())
                .map(|kb| kb / 1024)
        });
        (cpu, mem)
    }
    pub fn versao() -> Option<String> {
        let t = std::fs::read_to_string("/etc/os-release").ok()?;
        t.lines()
            .find_map(|l| l.strip_prefix("PRETTY_NAME="))
            .map(|v| v.trim_matches('"').to_string())
    }
}

#[cfg(not(target_os = "linux"))]
mod sistema {
    /// No Windows o nome do processador vem da variável que o próprio sistema põe (a memória fica sem: precisaria da
    /// API, e o que pesa no diagnóstico é o processador e a placa de vídeo).
    pub fn processador_e_memoria() -> (Option<String>, Option<u64>) {
        (std::env::var("PROCESSOR_IDENTIFIER").ok(), None)
    }
    pub fn versao() -> Option<String> {
        std::env::var("OS").ok()
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    fn abrir_teste(d: &Path, nome: &str) -> String {
        abrir(
            d,
            ArgsAbrir {
                nome: nome.into(),
                sessao: serde_json::json!({"jogo": {"nome": "Teste"}}),
            },
        )
        .unwrap()
    }

    #[test]
    fn grava_lista_e_exporta() {
        let d = tempfile::tempdir().unwrap();
        let s = abrir_teste(d.path(), "2026-11-08_0905_Teste");
        assert_eq!(s, "2026-11-08_0905_Teste");
        assert_eq!(
            abrir_teste(d.path(), "2026-11-08_0905_Teste"),
            "2026-11-08_0905_Teste-2"
        );
        let a = |arquivo: &str, trocar| ArgsAnotar {
            sessao: s.clone(),
            arquivo: arquivo.into(),
            trocar,
        };
        assert!(!anotar(d.path(), &a("quadros.csv", false), b"t_ms\n").unwrap());
        assert!(!anotar(d.path(), &a("quadros.csv", false), b"1.5\n").unwrap());
        assert!(!anotar(d.path(), &a("resumo.txt", true), b"velho").unwrap());
        assert!(!anotar(d.path(), &a("resumo.txt", true), b"Diag\nmais").unwrap());
        let q = std::fs::read_to_string(d.path().join("diagnostico").join(&s).join("quadros.csv")).unwrap();
        assert_eq!(q, "t_ms\n1.5\n");
        let l = listar(d.path());
        assert_eq!(l.len(), 2);
        let essa = l.iter().find(|x| x.sessao == s).unwrap();
        assert_eq!(essa.resumo.as_deref(), Some("Diag\nmais"));
        // log do dia com caminho pessoal: sai com ~
        std::fs::create_dir_all(d.path().join("logs")).unwrap();
        std::fs::write(
            d.path().join("logs/kofstation.log.2026-11-08"),
            "abri /home/fulano/jogo.iso",
        )
        .unwrap();
        let z = exportar(
            d.path(),
            &ArgsExportar {
                sessoes: vec![s.clone()],
            },
            Some(Path::new("/home/fulano")),
        )
        .unwrap();
        let p = d.path().join("r.zip");
        std::fs::write(&p, &z).unwrap();
        let mut f = std::fs::File::open(&p).unwrap();
        let nomes: Vec<String> = kof_files::zip::itens(&mut f, z.len() as u64)
            .into_iter()
            .map(|i| i.nome)
            .collect();
        assert!(nomes.contains(&"quadros.csv".into()) && nomes.contains(&"sessao.json".into()));
        let log = kof_files::zip::ler_entrada(&p, "kofstation.log.2026-11-08", None).unwrap();
        assert_eq!(String::from_utf8(log).unwrap(), "abri ~/jogo.iso");
    }

    #[test]
    fn so_nomes_e_arquivos_conhecidos() {
        let d = tempfile::tempdir().unwrap();
        for ruim in ["../fora", "a/b", "", ".oculta", "x y"] {
            let r = abrir(
                d.path(),
                ArgsAbrir {
                    nome: ruim.into(),
                    sessao: Value::Null,
                },
            );
            assert_eq!(r.err().map(|e| e.codigo()), Some("INVALID_ARGS"), "{ruim}");
        }
        let s = abrir_teste(d.path(), "ok");
        for arq in ["../x", "sessao.json", "outro.txt"] {
            let r = anotar(
                d.path(),
                &ArgsAnotar {
                    sessao: s.clone(),
                    arquivo: arq.into(),
                    trocar: false,
                },
                b"x",
            );
            assert_eq!(r.err().map(|e| e.codigo()), Some("INVALID_ARGS"), "{arq}");
        }
        let r = anotar(
            d.path(),
            &ArgsAnotar {
                sessao: "nao_existe".into(),
                arquivo: "log.txt".into(),
                trocar: false,
            },
            b"x",
        );
        assert_eq!(r.err().map(|e| e.codigo()), Some("NOT_FOUND"));
        let r = exportar(d.path(), &ArgsExportar { sessoes: vec![] }, None);
        assert_eq!(r.err().map(|e| e.codigo()), Some("INVALID_ARGS"));
    }

    #[test]
    fn limite_de_tamanho_e_limpeza() {
        let d = tempfile::tempdir().unwrap();
        let s = abrir_teste(d.path(), "grande");
        let a = ArgsAnotar {
            sessao: s.clone(),
            arquivo: "quadros.csv".into(),
            trocar: false,
        };
        let pedaco = vec![b'1'; (LIMITE_SESSAO / 2) as usize];
        assert!(!anotar(d.path(), &a, &pedaco).unwrap());
        assert!(anotar(d.path(), &a, &pedaco).unwrap(), "passou do limite: avisa cheio");
        // daqui a 31 dias ela some
        let depois = SystemTime::now() + Duration::from_secs(31 * 24 * 3600);
        assert_eq!(limpar(d.path(), depois), 1);
        assert!(listar(d.path()).is_empty());
    }

    #[test]
    fn maquina_tem_o_basico() {
        let m = maquina();
        assert_eq!(m["sistema"], std::env::consts::OS);
        assert!(m["nucleos"].as_u64().unwrap_or(0) >= 1);
    }
}
