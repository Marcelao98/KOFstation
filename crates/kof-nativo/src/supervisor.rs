//! O lado do `kofstation`: abre o processo filho, espera ele dizer a porta, guarda as últimas linhas do log dele e
//! fecha junto. Se o núcleo quebrar (falha de segmentação, abort), só o filho morre: o app continua e mostra o log.
use crate::filho::Config;
use kof_core::KofError;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, ExitStatus, Stdio};
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};

/// Linhas de log guardadas (as últimas).
const LINHAS: usize = 300;
/// Quanto esperar o núcleo abrir o jogo.
const PRAZO_ABRIR: Duration = Duration::from_secs(30);

/// Configuração sem o token (o supervisor sorteia um por abertura).
#[derive(Clone, Debug, Default)]
pub struct Pedido {
    pub nucleo: PathBuf,
    pub jogo: Option<PathBuf>,
    pub sistema: PathBuf,
    pub saves: PathBuf,
    pub origem: Option<String>,
    pub variaveis: std::collections::BTreeMap<String, String>,
    pub sem_som: bool,
}

pub struct ProcessoNativo {
    filho: Child,
    stdin: Option<ChildStdin>,
    pub porta: u16,
    pub token: String,
    /// o que o filho respondeu ao abrir (núcleo, taxa da placa)
    pub resposta: serde_json::Value,
    log: Arc<Mutex<VecDeque<String>>>,
}

fn sortear_token() -> Result<String, KofError> {
    let mut b = [0u8; 16];
    getrandom::fill(&mut b).map_err(|e| KofError::Nucleo(format!("sem números aleatórios: {e}")))?;
    Ok(b.iter().map(|x| format!("{x:02x}")).collect())
}

impl ProcessoNativo {
    /// Abre `programa args…` (o `kofstation --nativo`, ou o `kof-nativo` nos testes) e espera ficar pronto.
    pub fn abrir(programa: &Path, args: &[&str], p: &Pedido) -> Result<ProcessoNativo, KofError> {
        let token = sortear_token()?;
        let cfg = Config {
            nucleo: p.nucleo.clone(),
            jogo: p.jogo.clone(),
            sistema: p.sistema.clone(),
            saves: p.saves.clone(),
            token: token.clone(),
            origem: p.origem.clone(),
            variaveis: p.variaveis.clone(),
            sem_som: p.sem_som,
        };
        let mut filho = Command::new(programa)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| KofError::Nucleo(format!("não abri o processo nativo {}: {e}", programa.display())))?;
        let log = Arc::new(Mutex::new(VecDeque::new()));
        if let Some(err) = filho.stderr.take() {
            let l = log.clone();
            std::thread::spawn(move || {
                for linha in BufReader::new(err).lines() {
                    let Ok(linha) = linha else { break };
                    tracing::info!(target: "nativo", "{linha}");
                    let mut g = l.lock().unwrap_or_else(|e| e.into_inner());
                    if g.len() >= LINHAS {
                        g.pop_front();
                    }
                    g.push_back(linha);
                }
            });
        }
        let mut stdin = filho.stdin.take();
        let mut texto = serde_json::to_string(&cfg).map_err(|e| KofError::Nucleo(e.to_string()))?;
        texto.push('\n');
        if let Some(s) = stdin.as_mut() {
            s.write_all(texto.as_bytes())
                .and_then(|_| s.flush())
                .map_err(|e| KofError::Nucleo(format!("o processo nativo não recebeu a configuração: {e}")))?;
        }
        let (tx, rx) = mpsc::channel();
        if let Some(out) = filho.stdout.take() {
            std::thread::spawn(move || {
                let mut r = BufReader::new(out);
                let mut l = String::new();
                let _ = tx.send(r.read_line(&mut l).map(|_| l)); // quem esperava pode ter desistido (prazo)
                                                                 // o resto do stdout (não deveria ter) é descartado pra o filho nunca travar escrevendo
                let mut lixo = String::new();
                while matches!(r.read_line(&mut lixo), Ok(n) if n > 0) {
                    lixo.clear();
                }
            });
        }
        let mut proc = ProcessoNativo {
            filho,
            stdin,
            porta: 0,
            token,
            resposta: serde_json::Value::Null,
            log,
        };
        let linha = match rx.recv_timeout(PRAZO_ABRIR) {
            Ok(Ok(l)) if !l.trim().is_empty() => l,
            Ok(Ok(_)) | Ok(Err(_)) | Err(mpsc::RecvTimeoutError::Disconnected) => {
                let status = proc.esperar(Duration::from_secs(2));
                return Err(KofError::Nucleo(format!(
                    "o processo nativo fechou sem responder ({}). Log: {}",
                    status.map(|s| s.to_string()).unwrap_or_else(|| "ainda aberto".into()),
                    proc.log().join(" | ")
                )));
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                return Err(KofError::Nucleo("o processo nativo não respondeu em 30 s".into()));
            }
        };
        let v: serde_json::Value = serde_json::from_str(linha.trim())
            .map_err(|e| KofError::Nucleo(format!("resposta estranha do processo nativo: {e}")))?;
        if let Some(e) = v.get("erro") {
            let msg = e.get("mensagem").and_then(|m| m.as_str()).unwrap_or("sem mensagem");
            return Err(KofError::Nucleo(msg.to_string()));
        }
        proc.porta = v
            .get("porta")
            .and_then(|p| p.as_u64())
            .and_then(|p| u16::try_from(p).ok())
            .ok_or_else(|| KofError::Nucleo("o processo nativo não disse a porta".into()))?;
        proc.resposta = v;
        Ok(proc)
    }

    /// `None` = ainda rodando; senão como terminou.
    pub fn saiu(&mut self) -> Option<ExitStatus> {
        self.filho.try_wait().ok().flatten()
    }

    /// As últimas linhas do log do processo (o núcleo escreve aí).
    pub fn log(&self) -> Vec<String> {
        self.log
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .iter()
            .cloned()
            .collect()
    }

    fn esperar(&mut self, prazo: Duration) -> Option<ExitStatus> {
        let inicio = Instant::now();
        loop {
            if let Some(s) = self.saiu() {
                return Some(s);
            }
            if inicio.elapsed() >= prazo {
                return None;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
    }

    /// Fecha: o filho vê o stdin fechar e sai (salvando o que tiver); se não sair em 3 s, é encerrado à força.
    pub fn fechar(mut self) -> Option<ExitStatus> {
        self.encerrar()
    }

    fn encerrar(&mut self) -> Option<ExitStatus> {
        self.stdin.take();
        if let Some(s) = self.esperar(Duration::from_secs(3)) {
            return Some(s);
        }
        tracing::warn!("o processo nativo não fechou sozinho: encerrando");
        let _ = self.filho.kill(); // pode ter saído entre a espera e aqui
        self.filho.wait().ok()
    }
}

impl Drop for ProcessoNativo {
    fn drop(&mut self) {
        if self.saiu().is_none() {
            self.encerrar();
        }
    }
}
