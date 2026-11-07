//! O serviço de rede do PC (o `rede/kofservico.c` do antigo em Rust, com o mesmo comportamento):
//! - anuncia o PC na rede de casa (UDP 8650: `KOFR?<app>` → `KOFR!{json}`)
//! - aceita aparelhos (TCP 8650): pareamento por código de 6 números ou QR, e conexão cifrada dos já pareados
//! - conversa com a página em JSON (`pedido` entra, `ligar_pagina` recebe os eventos; ver PROTOCOLO.md)
//! - repassa mensagens por canal entre a página e os aparelhos
//!
//! A conta (chaves, cifra) é o `kofrede.c` do antigo ([`crate::ffi`]); aqui é rede, arquivo e o JSON.
use crate::ffi::{self, Canal, Con as ConKr, Par as ParKr, MAC, MAX};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, Shutdown, SocketAddr, TcpListener, TcpStream, UdpSocket};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU16, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;

pub const APP: &str = "kofstation";
const VERSAO: u8 = 1;
const MAXPARES: usize = 32;

/// Onde e como o serviço abre (o padrão é o do antigo).
#[derive(Debug, Clone)]
pub struct Config {
    /// `identidade.bin`, `pareados.txt`, `config.txt`
    pub pasta: PathBuf,
    /// nome forçado (senão o do `config.txt`, senão "PC <máquina>")
    pub nome: Option<String>,
    pub porta_tcp: u16,
    pub porta_udp: u16,
    /// pra onde o "achar" pergunta (`ip` ou `ip:porta`; nos testes, 127.0.0.1:porta)
    pub alvo_achar: String,
}

impl Config {
    pub fn nova(pasta: PathBuf) -> Self {
        Self {
            pasta,
            nome: None,
            porta_tcp: 8650,
            porta_udp: 8650,
            alvo_achar: "255.255.255.255".into(),
        }
    }
}

fn agora() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn aleatorio<const N: usize>() -> [u8; N] {
    let mut b = [0u8; N];
    getrandom::fill(&mut b).expect("sem números aleatórios do sistema");
    b
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn dehex32(s: &str) -> Option<[u8; 32]> {
    if s.len() != 64 {
        return None;
    }
    let mut o = [0u8; 32];
    for (i, b) in o.iter_mut().enumerate() {
        *b = u8::from_str_radix(s.get(2 * i..2 * i + 2)?, 16).ok()?;
    }
    Some(o)
}

/// Sem tab/linha nova e com no máximo `max` bytes, sem cortar letra no meio (o `limpar` do antigo).
fn limpar(s: &str, max: usize) -> String {
    let mut o: String = s
        .chars()
        .map(|c| if matches!(c, '\t' | '\n' | '\r') { ' ' } else { c })
        .collect();
    if o.len() > max {
        let mut n = max;
        while !o.is_char_boundary(n) {
            n -= 1;
        }
        o.truncate(n);
    }
    o
}

/// Só rede de casa (e a própria máquina, pros testes).
pub fn privado(ip: Ipv4Addr) -> bool {
    let o = ip.octets();
    o[0] == 10
        || o[0] == 127
        || (o[0] == 172 && (o[1] & 0xf0) == 16)
        || (o[0] == 192 && o[1] == 168)
        || (o[0] == 169 && o[1] == 254)
}

/// O endereço que a máquina usaria pra sair (nada é enviado).
pub fn meu_ip() -> String {
    let ip = UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| s.connect("192.168.0.1:53").map(|()| s))
        .and_then(|s| s.local_addr())
        .map(|a| a.ip().to_string());
    ip.unwrap_or_else(|_| "127.0.0.1".into())
}

fn nome_da_maquina() -> String {
    let h = if cfg!(windows) {
        std::env::var("COMPUTERNAME").ok()
    } else {
        std::fs::read_to_string("/proc/sys/kernel/hostname")
            .ok()
            .or_else(|| std::env::var("HOSTNAME").ok())
    };
    format!(
        "PC {}",
        h.map(|h| h.trim().to_string())
            .filter(|h| !h.is_empty())
            .unwrap_or_else(|| "PC".into())
    )
}

// ---------------------------------------------------------------- quadros: u32 (big endian) com o tamanho + corpo
fn ler_quadro(s: &mut TcpStream) -> Option<Vec<u8>> {
    let mut c = [0u8; 4];
    s.read_exact(&mut c).ok()?;
    let n = u32::from_be_bytes(c) as usize;
    if n > MAX + 512 {
        return None;
    }
    let mut d = vec![0u8; n];
    s.read_exact(&mut d).ok()?;
    Some(d)
}

fn mandar_quadro(s: &mut TcpStream, partes: &[&[u8]]) -> bool {
    let n: usize = partes.iter().map(|p| p.len()).sum();
    let mut q = Vec::with_capacity(n + 4);
    q.extend_from_slice(&(n as u32).to_be_bytes());
    for p in partes {
        q.extend_from_slice(p);
    }
    s.write_all(&q).is_ok()
}

fn recusar(s: &mut TcpStream, motivo: &str) {
    mandar_quadro(s, &[b"X", motivo.as_bytes()]);
}

// ---------------------------------------------------------------- aparelhos
/// Uma conexão cifrada viva com um pareado.
struct Con {
    /// o socket e as chaves de envio (o laço de leitura tem as de recebimento)
    escrita: Mutex<(TcpStream, Canal)>,
    sock: TcpStream,
    morta: AtomicBool,
    ultimo: AtomicI64,
}

impl Con {
    /// mensagem cifrada: tamanho do canal (1) | canal | dados
    fn mandar(&self, canal: &str, d: &[u8]) -> bool {
        if canal.len() > 255 || d.len() + canal.len() + 1 > MAX || self.morta.load(Ordering::Relaxed) {
            return false;
        }
        let mut p = Vec::with_capacity(1 + canal.len() + d.len());
        p.push(canal.len() as u8);
        p.extend_from_slice(canal.as_bytes());
        p.extend_from_slice(d);
        let mut e = self.escrita.lock().unwrap_or_else(|e| e.into_inner());
        let q = e.1.cifrar(&p);
        mandar_quadro(&mut e.0, &[&q])
    }

    fn matar(&self) {
        self.morta.store(true, Ordering::Relaxed);
        let _ = self.sock.shutdown(Shutdown::Both); // já fechado: tanto faz
    }
}

struct Par {
    pk: [u8; 32],
    id: String,
    nome: String,
    tipo: String,
    ip: String,
    porta: u16,
    visto: i64,
    con: Option<Arc<Con>>,
    tentando: bool,
}

impl Par {
    fn online(&self) -> bool {
        self.con.as_ref().is_some_and(|c| !c.morta.load(Ordering::Relaxed))
    }
}

struct Janela {
    codigo: String,
    segredo: String,
    ate: i64,
    falhas: u32,
}

struct Estado {
    nome: String,
    visivel: bool,
    pares: Vec<Par>,
    janela: Option<Janela>,
}

type Saida = Box<dyn FnMut(&str) -> bool + Send>;

pub struct Servico {
    cfg: Config,
    sk: [u8; 32],
    pk: [u8; 32],
    id: String,
    porta_tcp: AtomicU16,
    estado: Mutex<Estado>,
    pagina: Mutex<Option<Saida>>,
}

/// O que falhou ao abrir (porta ocupada, pasta sem permissão).
#[derive(Debug)]
pub struct ErroAbrir(pub String);

impl std::fmt::Display for ErroAbrir {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

fn identidade(pasta: &Path) -> Result<[u8; 32], ErroAbrir> {
    let c = pasta.join("identidade.bin");
    if let Ok(b) = std::fs::read(&c) {
        if let Ok(sk) = <[u8; 32]>::try_from(b.as_slice()) {
            return Ok(sk);
        }
    }
    let sk = aleatorio::<32>();
    std::fs::write(&c, sk).map_err(|e| ErroAbrir(format!("não consegui gravar {}: {e}", c.display())))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&c, std::fs::Permissions::from_mode(0o600));
        // só segurança extra
    }
    Ok(sk)
}

fn ler_pares(pasta: &Path) -> Vec<Par> {
    let Ok(t) = std::fs::read_to_string(pasta.join("pareados.txt")) else {
        return Vec::new();
    };
    t.lines()
        .filter_map(|l| {
            let c: Vec<&str> = l.splitn(6, '\t').collect();
            let pk = dehex32(c.first()?)?;
            if c.len() < 3 {
                return None;
            }
            Some(Par {
                pk,
                id: ffi::id(&pk),
                tipo: limpar(c[1], 15),
                nome: limpar(c[2], 63),
                visto: c.get(3).and_then(|v| v.parse().ok()).unwrap_or(0),
                ip: c.get(4).map(|v| v.to_string()).unwrap_or_default(),
                porta: c.get(5).and_then(|v| v.trim().parse().ok()).unwrap_or(0),
                con: None,
                tentando: false,
            })
        })
        .take(MAXPARES)
        .collect()
}

impl Servico {
    /// Abre o serviço: identidade, pareados, TCP, UDP e o relógio, cada um na sua linha.
    pub fn abrir(cfg: Config) -> Result<Arc<Servico>, ErroAbrir> {
        std::fs::create_dir_all(&cfg.pasta)
            .map_err(|e| ErroAbrir(format!("não consegui criar {}: {e}", cfg.pasta.display())))?;
        let mut nome = nome_da_maquina();
        let mut visivel = true;
        if let Ok(t) = std::fs::read_to_string(cfg.pasta.join("config.txt")) {
            for l in t.lines() {
                if let Some(v) = l.strip_prefix("nome=").filter(|v| !v.is_empty()) {
                    nome = v.to_string();
                }
                if let Some(v) = l.strip_prefix("visivel=") {
                    visivel = v.trim().parse::<i32>().unwrap_or(0) != 0;
                }
            }
        }
        if let Some(n) = &cfg.nome {
            nome = n.clone();
        }
        let sk = identidade(&cfg.pasta)?;
        let pk = ffi::publica(&sk);
        let pares = ler_pares(&cfg.pasta);
        // TCP: a porta pedida ou uma das 9 seguintes (como o antigo)
        let mut ouvinte = None;
        for p in cfg.porta_tcp..cfg.porta_tcp.saturating_add(10) {
            if let Ok(l) = TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], p))) {
                ouvinte = Some((l, p));
                break;
            }
        }
        let (ouvinte, porta) =
            ouvinte.ok_or_else(|| ErroAbrir(format!("sem porta TCP livre a partir da {}", cfg.porta_tcp)))?;
        let s = Arc::new(Servico {
            id: ffi::id(&pk),
            sk,
            pk,
            porta_tcp: AtomicU16::new(porta),
            estado: Mutex::new(Estado {
                nome: limpar(&nome, 63),
                visivel,
                pares,
                janela: None,
            }),
            pagina: Mutex::new(None),
            cfg,
        });
        tracing::info!(target: "rede", id = %s.id, porta, pasta = %s.cfg.pasta.display(), "rede aberta");
        let a = s.clone();
        soltar("rede-tcp", move || a.servidor_tcp(ouvinte));
        let a = s.clone();
        soltar("rede-udp", move || a.servidor_udp());
        let a = s.clone();
        soltar("rede-relogio", move || a.relogio());
        Ok(s)
    }

    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn porta_tcp(&self) -> u16 {
        self.porta_tcp.load(Ordering::Relaxed)
    }

    fn trava(&self) -> MutexGuard<'_, Estado> {
        self.estado.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// A página que recebe os eventos (uma só; a nova substitui a velha). `f` devolve false quando a página fechou.
    pub fn ligar_pagina(&self, f: Saida) {
        *self.pagina.lock().unwrap_or_else(|e| e.into_inner()) = Some(f);
    }

    pub fn para_pagina(&self, v: &Value) {
        let mut p = self.pagina.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(f) = p.as_mut() {
            if !f(&v.to_string()) {
                *p = None;
            }
        }
    }

    fn gravar_pares(&self, e: &Estado) {
        let c = self.cfg.pasta.join("pareados.txt");
        let novo = self.cfg.pasta.join("pareados.txt.novo");
        let t: String = e
            .pares
            .iter()
            .map(|p| {
                format!(
                    "{}\t{}\t{}\t{}\t{}\t{}\n",
                    hex(&p.pk),
                    p.tipo,
                    p.nome,
                    p.visto,
                    p.ip,
                    p.porta
                )
            })
            .collect();
        if let Err(err) = std::fs::write(&novo, t).and_then(|()| std::fs::rename(&novo, &c)) {
            tracing::error!(target: "rede", "não consegui gravar {}: {err}", c.display());
        }
    }

    fn gravar_config(&self, e: &Estado) {
        let c = self.cfg.pasta.join("config.txt");
        if let Err(err) = std::fs::write(&c, format!("nome={}\nvisivel={}\n", e.nome, i32::from(e.visivel))) {
            tracing::error!(target: "rede", "não consegui gravar {}: {err}", c.display());
        }
    }

    fn lista(&self) -> Value {
        let e = self.trava();
        let aparelhos: Vec<Value> = e
            .pares
            .iter()
            .map(|p| json!({"id": p.id, "nome": p.nome, "tipo": p.tipo, "online": p.online(), "visto": p.visto, "ip": p.ip}))
            .collect();
        json!({"t": "lista", "eu": {"id": self.id, "nome": e.nome, "visivel": e.visivel}, "aparelhos": aparelhos})
    }

    fn avisar_lista(&self) {
        let l = self.lista();
        self.para_pagina(&l);
    }

    fn erro_pagina(&self, t: &str, texto: &str) {
        self.para_pagina(&json!({"t": t, "texto": texto}));
    }

    // ------------------------------------------------------------ conexão viva
    /// A conexão de um pareado já autenticada: lê até cair. Serve pro lado servidor e pro cliente.
    fn laco(self: &Arc<Self>, id: &str, s: TcpStream, can: Canal) {
        let (Ok(escrita), Ok(sock)) = (s.try_clone(), s.try_clone()) else {
            return;
        };
        let con = Arc::new(Con {
            escrita: Mutex::new((escrita, can)),
            sock,
            morta: AtomicBool::new(false),
            ultimo: AtomicI64::new(agora()),
        });
        let mut rec = can;
        {
            let mut e = self.trava();
            let Some(p) = e.pares.iter_mut().find(|p| p.id == id) else {
                con.matar();
                return;
            };
            if let Some(velha) = p.con.replace(con.clone()) {
                velha.matar();
            }
            p.visto = agora();
            self.gravar_pares(&e);
        }
        tracing::info!(target: "rede", "conectado: {id}");
        self.avisar_lista();
        let mut s = s;
        let _ = s.set_read_timeout(None); // sem prazo: quem derruba quem some é o relógio (45 s sem ouvir nada)
        while let Some(q) = ler_quadro(&mut s) {
            if q.len() < MAC + 1 {
                break;
            }
            let Some(m) = rec.decifrar(&q) else {
                tracing::warn!(target: "rede", "mensagem adulterada de {id}");
                break;
            };
            con.ultimo.store(agora(), Ordering::Relaxed);
            let nc = m[0] as usize;
            if 1 + nc > m.len() {
                break;
            }
            let (canal, d) = (&m[1..1 + nc], &m[1 + nc..]);
            if nc == 0 {
                if d == b"p" {
                    con.mandar("", b"P"); // canal de controle: ping
                }
                continue;
            }
            self.para_pagina(&json!({
                "t": "msg", "de": id,
                "canal": String::from_utf8_lossy(canal), "dados": String::from_utf8_lossy(d),
            }));
        }
        con.matar();
        {
            let mut e = self.trava();
            if let Some(p) = e.pares.iter_mut().find(|p| p.id == id) {
                if p.con.as_ref().is_some_and(|c| Arc::ptr_eq(c, &con)) {
                    p.con = None;
                    p.visto = agora();
                    self.gravar_pares(&e);
                }
            }
        }
        tracing::info!(target: "rede", "desconectado: {id}");
        self.avisar_lista();
    }

    // ------------------------------------------------------------ pareamento (janela aberta pela página)
    fn abrir_janela(&self) {
        let r = aleatorio::<20>();
        let codigo = format!("{:06}", u32::from_le_bytes([r[0], r[1], r[2], r[3]]) % 1_000_000);
        let segredo = hex(&r[4..20]);
        let nome = {
            let mut e = self.trava();
            e.janela = Some(Janela {
                codigo: codigo.clone(),
                segredo: segredo.clone(),
                ate: agora() + 120,
                falhas: 0,
            });
            e.nome.clone()
        };
        let (ip, porta) = (meu_ip(), self.porta_tcp());
        let n: String = nome
            .bytes()
            .map(|c| {
                if c.is_ascii_alphanumeric() || matches!(c, b'-' | b'_' | b'.') {
                    (c as char).to_string()
                } else {
                    format!("%{c:02X}")
                }
            })
            .collect();
        let qr = format!("{APP}://parear?ip={ip}&p={porta}&id={}&s={segredo}&n={n}", self.id);
        self.para_pagina(&json!({"t": "parear", "codigo": codigo, "seg": 120, "ip": ip, "porta": porta, "qr": qr}));
    }

    fn fechar_janela(&self, motivo: Option<&str>) {
        let estava = self.trava().janela.take().is_some();
        if let (true, Some(m)) = (estava, motivo) {
            self.para_pagina(&json!({"t": "parear-fim", "motivo": m}));
        }
    }

    /// O que cada lado conta de si depois de parear: pk(32) | porta(2) | tamanho do tipo(1) | tipo | nome.
    fn minha_ficha(&self, tipo: &str) -> Vec<u8> {
        let nome = self.trava().nome.clone();
        let mut o = vec![3, b'p', b'a', b'r'];
        o.extend_from_slice(&self.pk);
        o.extend_from_slice(&self.porta_tcp().to_be_bytes());
        o.push(tipo.len() as u8);
        o.extend_from_slice(tipo.as_bytes());
        o.extend_from_slice(nome.as_bytes());
        o
    }

    /// Guarda o aparelho da ficha. None = ficha inválida ou lista cheia.
    fn guardar_ficha(&self, f: &[u8], ip: &str) -> Option<String> {
        if f.len() < 35 || 35 + f[34] as usize > f.len() {
            return None;
        }
        let pk: [u8; 32] = f[..32].try_into().ok()?;
        let mut e = self.trava();
        let i = match e.pares.iter().position(|p| p.pk == pk) {
            Some(i) => i,
            None if e.pares.len() >= MAXPARES => return None,
            None => {
                e.pares.push(Par {
                    pk,
                    id: ffi::id(&pk),
                    nome: String::new(),
                    tipo: String::new(),
                    ip: String::new(),
                    porta: 0,
                    visto: 0,
                    con: None,
                    tentando: false,
                });
                e.pares.len() - 1
            }
        };
        let nt = f[34] as usize;
        let p = &mut e.pares[i];
        p.porta = u16::from_be_bytes([f[32], f[33]]);
        p.tipo = limpar(&String::from_utf8_lossy(&f[35..35 + nt]), 15);
        p.nome = limpar(&String::from_utf8_lossy(&f[35 + nt..]), 63);
        p.ip = ip.to_string();
        p.visto = agora();
        let id = p.id.clone();
        self.gravar_pares(&e);
        Some(id)
    }

    fn avisar_pareado(&self, id: &str) {
        let a = {
            let e = self.trava();
            e.pares
                .iter()
                .find(|p| p.id == id)
                .map(|p| json!({"id": p.id, "nome": p.nome, "tipo": p.tipo}))
        };
        if let Some(a) = a {
            self.para_pagina(&json!({"t": "pareado", "aparelho": a}));
        }
        self.avisar_lista();
    }

    // ------------------------------------------------------------ lado servidor (TCP 8650)
    fn servidor_tcp(self: Arc<Self>, ouvinte: TcpListener) {
        for c in ouvinte.incoming() {
            let Ok(c) = c else { continue };
            let ip = match c.peer_addr().map(|a| a.ip()) {
                Ok(IpAddr::V4(v4)) if privado(v4) => v4.to_string(),
                _ => continue, // fora da rede de casa: fecha sem responder
            };
            let a = self.clone();
            soltar("rede-aparelho", move || a.atender(c, &ip));
        }
    }

    fn atender(self: &Arc<Self>, mut s: TcpStream, ip: &str) {
        let _ = s.set_read_timeout(Some(Duration::from_secs(10)));
        let _ = s.set_nodelay(true); // sem Nagle é só latência menor
        let Some(h) = ler_quadro(&mut s) else { return };
        let na = h.get(7).copied().unwrap_or(0) as usize;
        if h.len() < 8 + na || &h[..4] != b"KOFR" || h[4] != VERSAO {
            return;
        }
        if &h[8..8 + na] != APP.as_bytes() {
            return recusar(&mut s, "outro app");
        }
        let corpo = &h[8 + na..];
        match (h[5], corpo.len()) {
            (b'P', 49) => self.atender_par(s, ip, corpo),
            (b'C', 64) => self.atender_con(s, ip, corpo),
            _ => {}
        }
    }

    fn atender_par(self: &Arc<Self>, mut s: TcpStream, ip: &str, corpo: &[u8]) {
        let senha = {
            let e = self.trava();
            match e.janela.as_ref().filter(|j| agora() < j.ate) {
                Some(j) if corpo[0] == b'q' => j.segredo.clone(),
                Some(j) => j.codigo.clone(),
                None => return recusar(&mut s, "o pareamento não está aberto no PC"),
            }
        };
        let m1: [u8; 48] = corpo[1..49].try_into().expect("49 bytes");
        let Some((mut par, m2)) = ParKr::servidor(APP, &senha, &m1, &aleatorio()) else {
            return;
        };
        if !mandar_quadro(&mut s, &[b"R", &m2]) {
            return;
        }
        let can = ler_quadro(&mut s)
            .filter(|q| q.len() == 17 && q[0] == b'F')
            .and_then(|q| par.servidor2(APP, &q[1..17].try_into().expect("16")));
        let Some(mut can) = can else {
            let f = {
                let mut e = self.trava();
                e.janela.as_mut().map(|j| {
                    j.falhas += 1;
                    j.falhas
                })
            };
            tracing::warn!(target: "rede", "pareamento com senha errada ({f:?})");
            if f.is_some_and(|f| f >= 5) {
                self.fechar_janela(Some("muitas tentativas erradas: gere outro código"));
            }
            return;
        };
        // a ficha do aparelho, cifrada
        let ficha = ler_quadro(&mut s)
            .filter(|q| q.len() >= MAC + 36 && q.len() <= 400)
            .and_then(|q| can.decifrar(&q))
            .filter(|f| f[0] == 3 && &f[1..4] == b"par");
        let Some(ficha) = ficha else { return };
        let Some(id) = self.guardar_ficha(&ficha[4..], ip) else {
            return recusar(&mut s, "lista de aparelhos cheia");
        };
        let minha = can.cifrar(&self.minha_ficha("pc"));
        mandar_quadro(&mut s, &[&minha]);
        tracing::info!(target: "rede", "pareado: {id}");
        self.fechar_janela(None);
        self.avisar_pareado(&id);
    }

    fn atender_con(self: &Arc<Self>, mut s: TcpStream, ip: &str, corpo: &[u8]) {
        let pkc: [u8; 32] = corpo[..32].try_into().expect("32");
        let id = self.trava().pares.iter().find(|p| p.pk == pkc).map(|p| p.id.clone());
        let Some(id) = id else {
            return recusar(&mut s, "aparelho não pareado com este PC");
        };
        let m1: [u8; 64] = corpo.try_into().expect("64");
        let Some((mut con, m2, can)) = ConKr::servidor(APP, &self.sk, &m1, &aleatorio()) else {
            return;
        };
        if !mandar_quadro(&mut s, &[b"R", &m2]) {
            return;
        }
        let ok = ler_quadro(&mut s)
            .filter(|q| q.len() == 17 && q[0] == b'F')
            .is_some_and(|q| con.servidor2(&q[1..17].try_into().expect("16")));
        if !ok {
            return;
        }
        if let Some(p) = self.trava().pares.iter_mut().find(|p| p.id == id) {
            p.ip = ip.to_string();
        }
        self.laco(&id, s, can);
    }

    // ------------------------------------------------------------ lado cliente (PC com PC; os testes)
    fn ola(s: &mut TcpStream, modo: u8, corpo: &[u8]) -> bool {
        let mut h = vec![b'K', b'O', b'F', b'R', VERSAO, modo, 0, APP.len() as u8];
        h.extend_from_slice(APP.as_bytes());
        mandar_quadro(s, &[&h, corpo])
    }

    fn conectar_tcp(ip: &str, porta: u16) -> Option<TcpStream> {
        let a: SocketAddr = format!("{ip}:{porta}").parse().ok()?;
        let s = TcpStream::connect_timeout(&a, Duration::from_secs(10)).ok()?;
        let _ = s.set_nodelay(true); // só latência
        let _ = s.set_read_timeout(Some(Duration::from_secs(10)));
        Some(s)
    }

    fn parear_com(self: &Arc<Self>, ip: &str, porta: u16, senha: &str, modo: u8) {
        match self.parear_com_r(ip, porta, senha, modo) {
            Ok(id) => self.avisar_pareado(&id),
            Err(e) => self.erro_pagina("par-erro", &e),
        }
    }

    fn parear_com_r(self: &Arc<Self>, ip: &str, porta: u16, senha: &str, modo: u8) -> Result<String, String> {
        let falar = || "não consegui falar com o aparelho".to_string();
        let errado = || "código errado".to_string();
        let mut s = Self::conectar_tcp(ip, porta).ok_or_else(falar)?;
        let (mut par, m1) = ParKr::cliente(APP, senha, &aleatorio(), &aleatorio());
        if !Self::ola(&mut s, b'P', &[&[modo][..], &m1].concat()) {
            return Err(falar());
        }
        let q = ler_quadro(&mut s).ok_or_else(falar)?;
        if q.first() == Some(&b'X') {
            return Err(String::from_utf8_lossy(&q[1..]).into_owned());
        }
        if q.len() != 49 || q[0] != b'R' {
            return Err(errado());
        }
        let (m3, mut can) = par
            .cliente2(APP, &q[1..49].try_into().expect("48"))
            .ok_or_else(errado)?;
        mandar_quadro(&mut s, &[b"F", &m3]);
        let minha = can.cifrar(&self.minha_ficha("pc"));
        mandar_quadro(&mut s, &[&minha]);
        let ficha = ler_quadro(&mut s)
            .filter(|q| q.len() >= MAC + 36 && q.len() <= 400)
            .and_then(|q| can.decifrar(&q))
            .filter(|f| f[0] == 3)
            .ok_or_else(errado)?;
        self.guardar_ficha(&ficha[4..], ip)
            .ok_or_else(|| "lista de aparelhos cheia".to_string())
    }

    fn conectar_par(self: &Arc<Self>, id: &str) {
        let alvo = {
            let e = self.trava();
            e.pares
                .iter()
                .find(|p| p.id == id)
                .map(|p| (p.ip.clone(), p.porta, p.pk))
        };
        let ligou = alvo.and_then(|(ip, porta, pks)| {
            let mut s = Self::conectar_tcp(&ip, porta)?;
            let (mut con, m1) = ConKr::cliente(&self.sk, &aleatorio());
            if !Self::ola(&mut s, b'C', &m1) {
                return None;
            }
            let q = ler_quadro(&mut s).filter(|q| q.len() == 49 && q[0] == b'R')?;
            let (m3, can) = con.cliente2(APP, &self.sk, &pks, &q[1..49].try_into().expect("48"))?;
            mandar_quadro(&mut s, &[b"F", &m3]).then_some((s, can))
        });
        if let Some(p) = self.trava().pares.iter_mut().find(|p| p.id == id) {
            p.tentando = false;
        }
        if let Some((s, can)) = ligou {
            self.laco(id, s, can);
        }
    }

    // ------------------------------------------------------------ achar na rede (UDP)
    fn servidor_udp(self: Arc<Self>) {
        let s = match UdpSocket::bind(SocketAddr::from(([0, 0, 0, 0], self.cfg.porta_udp))) {
            Ok(s) => s,
            Err(e) => {
                tracing::warn!(target: "rede", "porta UDP {} ocupada ({e}): o PC não vai aparecer sozinho na rede", self.cfg.porta_udp);
                return;
            }
        };
        let pedido = format!("KOFR?{APP}");
        let mut b = [0u8; 600];
        loop {
            let Ok((n, de)) = s.recv_from(&mut b) else { continue };
            let (visivel, nome) = {
                let e = self.trava();
                (e.visivel, e.nome.clone())
            };
            let casa = matches!(de.ip(), IpAddr::V4(v) if privado(v));
            if !visivel || &b[..n] != pedido.as_bytes() || !casa {
                continue;
            }
            let f =
                json!({"app": APP, "v": VERSAO, "id": self.id, "porta": self.porta_tcp(), "tipo": "pc", "nome": nome});
            let _ = s.send_to(format!("KOFR!{f}").as_bytes(), de); // não chegou: quem perguntou pergunta de novo
        }
    }

    /// Pergunta na rede quem está aí (~1,5 s). Atualiza o IP dos pareados. Devolve o evento `achados`.
    fn achar(&self) -> Value {
        let mut lista = Vec::new();
        let r = (|| -> std::io::Result<()> {
            let s = UdpSocket::bind("0.0.0.0:0")?;
            s.set_broadcast(true)?;
            let alvo = if self.cfg.alvo_achar.contains(':') {
                self.cfg.alvo_achar.clone()
            } else {
                format!("{}:{}", self.cfg.alvo_achar, self.cfg.porta_udp)
            };
            s.send_to(format!("KOFR?{APP}").as_bytes(), alvo.as_str())?;
            s.set_read_timeout(Some(Duration::from_millis(300)))?;
            let fim = std::time::Instant::now() + Duration::from_millis(1500);
            let mut vistos: Vec<String> = Vec::new();
            let mut b = [0u8; 600];
            while std::time::Instant::now() < fim {
                let Ok((n, de)) = s.recv_from(&mut b) else { continue };
                let Some(v) = b[..n]
                    .strip_prefix(b"KOFR!")
                    .and_then(|j| serde_json::from_slice::<Value>(j).ok())
                else {
                    continue;
                };
                let id = v["id"].as_str().unwrap_or("").to_string();
                if id.len() != 16 || id == self.id || vistos.contains(&id) || vistos.len() >= 16 {
                    continue;
                }
                vistos.push(id.clone());
                let porta = v["porta"]
                    .as_u64()
                    .or_else(|| v["porta"].as_str()?.parse().ok())
                    .unwrap_or(0) as u16;
                let ip = de.ip().to_string();
                let pareado = {
                    let mut e = self.trava();
                    let p = e.pares.iter_mut().find(|p| p.id == id);
                    let achou = p.is_some();
                    if let Some(p) = p.filter(|_| porta != 0) {
                        p.ip = ip.clone();
                        p.porta = porta;
                    }
                    achou
                };
                lista.push(json!({"id": id, "ip": ip, "porta": porta, "pareado": pareado,
                    "tipo": v["tipo"].as_str().unwrap_or(""), "nome": v["nome"].as_str().unwrap_or("")}));
            }
            Ok(())
        })();
        if let Err(e) = r {
            tracing::warn!(target: "rede", "achar na rede falhou: {e}");
        }
        json!({"t": "achados", "lista": lista})
    }

    // ------------------------------------------------------------ relógio: pareamento que expira, ping, religar
    fn relogio(self: Arc<Self>) {
        let mut ultimo_achar = 0i64;
        for tique in 0u64.. {
            std::thread::sleep(Duration::from_secs(5));
            let expirou = self.trava().janela.as_ref().is_some_and(|j| agora() >= j.ate);
            if expirou {
                self.fechar_janela(Some("tempo esgotado"));
            }
            // ping a cada 15 s; 45 s sem ouvir nada = caiu
            let (cons, faltando) = {
                let e = self.trava();
                let cons: Vec<Arc<Con>> = e.pares.iter().filter_map(|p| p.con.clone()).collect();
                let faltando = e.pares.iter().any(|p| self.religar(p));
                (cons, faltando)
            };
            for c in cons {
                if agora() - c.ultimo.load(Ordering::Relaxed) > 45 {
                    c.matar();
                } else if tique % 3 == 0 {
                    c.mandar("", b"p");
                }
            }
            // outro PC pareado fora do ar: quem tem o id menor liga (assim os dois não ligam ao mesmo tempo)
            if faltando && tique % 6 == 0 {
                if agora() - ultimo_achar > 55 {
                    ultimo_achar = agora();
                    self.achar();
                }
                let ids: Vec<String> = {
                    let mut e = self.trava();
                    let ids: Vec<String> = e
                        .pares
                        .iter()
                        .filter(|p| self.religar(p))
                        .map(|p| p.id.clone())
                        .collect();
                    for p in e.pares.iter_mut().filter(|p| ids.contains(&p.id)) {
                        p.tentando = true;
                    }
                    ids
                };
                for id in ids {
                    let a = self.clone();
                    soltar("rede-religar", move || a.conectar_par(&id));
                }
            }
        }
    }

    fn religar(&self, p: &Par) -> bool {
        !p.online()
            && !p.tentando
            && p.tipo == "pc"
            && p.porta != 0
            && !p.ip.is_empty()
            && self.id.as_str() < p.id.as_str()
    }

    // ------------------------------------------------------------ pedidos da página
    /// Um pedido da página (JSON da API local do PROTOCOLO.md).
    pub fn pedido(self: &Arc<Self>, texto: &str) {
        let Ok(j) = serde_json::from_str::<Value>(texto) else {
            tracing::warn!(target: "rede", "pedido da página ilegível");
            return;
        };
        let txt = |k: &str| -> Option<String> {
            match &j[k] {
                Value::String(s) => Some(s.clone()),
                Value::Null => None,
                v => Some(v.to_string()),
            }
        };
        match j["t"].as_str().unwrap_or("") {
            "eu" | "lista" => self.avisar_lista(),
            "nome" => {
                if let Some(n) = txt("nome").filter(|n| !n.is_empty()) {
                    let mut e = self.trava();
                    e.nome = limpar(&n, 63);
                    self.gravar_config(&e);
                }
                self.avisar_lista();
            }
            "visivel" => {
                {
                    let mut e = self.trava();
                    e.visivel = txt("sim").as_deref() == Some("true");
                    self.gravar_config(&e);
                }
                self.avisar_lista();
            }
            "parear" => self.abrir_janela(),
            "parear-fim" => self.fechar_janela(None),
            "remover" => {
                if let Some(id) = txt("id") {
                    let mut e = self.trava();
                    if let Some(i) = e.pares.iter().position(|p| p.id == id && !p.tentando) {
                        let p = e.pares.swap_remove(i);
                        if let Some(c) = p.con {
                            c.matar();
                        }
                        self.gravar_pares(&e);
                    }
                }
                self.avisar_lista();
            }
            "enviar" => {
                let para = txt("para").unwrap_or_default();
                let canal = txt("canal").unwrap_or_default();
                let dados = txt("dados").unwrap_or_default();
                let con = self
                    .trava()
                    .pares
                    .iter()
                    .find(|p| p.id == para)
                    .and_then(|p| p.con.clone());
                let foi = !canal.is_empty() && con.is_some_and(|c| c.mandar(&canal, dados.as_bytes()));
                if !foi {
                    self.para_pagina(&json!({"t": "nao-enviou", "para": para}));
                }
            }
            "achar" => {
                let a = self.clone();
                soltar("rede-achar", move || {
                    let r = a.achar();
                    a.para_pagina(&r);
                });
            }
            "parear-com" => {
                if let (Some(ip), Some(porta), Some(senha)) = (txt("ip"), txt("porta"), txt("senha")) {
                    let modo = if txt("modo").is_some_and(|m| m.starts_with('q')) {
                        b'q'
                    } else {
                        b'c'
                    };
                    let porta = porta.parse().unwrap_or(0);
                    let a = self.clone();
                    soltar("rede-parear", move || a.parear_com(&ip, porta, &senha, modo));
                }
            }
            "conectar" => {
                if let Some(id) = txt("id") {
                    let ir = {
                        let mut e = self.trava();
                        match e.pares.iter_mut().find(|p| p.id == id) {
                            Some(p) if !p.online() && !p.tentando && p.porta != 0 && !p.ip.is_empty() => {
                                p.tentando = true;
                                true
                            }
                            _ => false,
                        }
                    };
                    if ir {
                        let a = self.clone();
                        soltar("rede-conectar", move || a.conectar_par(&id));
                    }
                }
            }
            outro => tracing::warn!(target: "rede", "pedido desconhecido da página: {outro}"),
        }
    }
}

fn soltar(nome: &str, f: impl FnOnce() + Send + 'static) {
    if let Err(e) = std::thread::Builder::new().name(nome.into()).spawn(f) {
        tracing::error!(target: "rede", "sem linha pra {nome}: {e}");
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn rede_de_casa_e_nomes() {
        for ip in [
            "10.0.0.1",
            "127.0.0.1",
            "172.16.0.1",
            "172.31.9.9",
            "192.168.1.5",
            "169.254.1.1",
        ] {
            assert!(privado(ip.parse().unwrap()), "{ip}");
        }
        for ip in ["8.8.8.8", "172.32.0.1", "192.169.0.1", "100.64.0.1"] {
            assert!(!privado(ip.parse().unwrap()), "{ip}");
        }
        assert_eq!(limpar("a\tb\nc", 63), "a b c");
        assert_eq!(limpar("ãããã", 7), "ããã"); // não corta letra no meio
        assert_eq!(dehex32(&hex(&[7u8; 32])), Some([7u8; 32]));
    }
}
