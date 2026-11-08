//! Uso de processador por linha (thread) do processo do jogo, como o PCSX2 faz: a cada leitura, o tempo de CPU que a
//! linha gastou desde a anterior ÷ o tempo de relógio. 100% = um núcleo do processador no talo (o gargalo). As linhas
//! com o mesmo nome (tirando o número do fim: `worker-3`) somam juntas. Linux: `/proc/self/task/*/stat`; Windows:
//! `GetThreadTimes`. Em outro sistema, ou se a leitura falhar, vem vazio (o resto do medidor segue).
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Linha {
    pub linha: String,
    /// % de um núcleo do processador
    pub pct: f64,
}

/// Abaixo disto a linha não aparece (sobra de linhas paradas).
const MINIMO_PCT: f64 = 1.0;

pub struct Cpu {
    antes: HashMap<u64, u64>,
    quando: Instant,
}

impl Default for Cpu {
    fn default() -> Self {
        Self::new()
    }
}

/// `worker-3`, `EE Core 1`, `pool#12` → `worker`, `EE Core`, `pool`.
pub fn grupo(nome: &str) -> String {
    let n = nome.trim().trim_end_matches(|c: char| c.is_ascii_digit());
    let n = n.trim_end_matches(['-', '_', '#', ' ', ':', '.']);
    if n.is_empty() {
        nome.trim().to_string()
    } else {
        n.to_string()
    }
}

impl Cpu {
    pub fn new() -> Self {
        let mut c = Cpu {
            antes: HashMap::new(),
            quando: Instant::now(),
        };
        // a 1ª leitura só marca o ponto de partida
        for (id, _, t) in sistema::linhas() {
            c.antes.insert(id, t);
        }
        c
    }

    /// Uso de cada grupo de linhas desde a leitura anterior, do maior pro menor.
    pub fn ler(&mut self) -> Vec<Linha> {
        let relogio_ns = self.quando.elapsed().as_nanos() as f64;
        self.quando = Instant::now();
        let mut agora = HashMap::new();
        let mut soma: HashMap<String, f64> = HashMap::new();
        for (id, nome, t) in sistema::linhas() {
            // linha nova: conta do zero (ela nasceu depois da leitura anterior)
            let delta = t.saturating_sub(self.antes.get(&id).copied().unwrap_or(0));
            agora.insert(id, t);
            *soma.entry(grupo(&nome)).or_default() += delta as f64;
        }
        self.antes = agora;
        if relogio_ns <= 0.0 {
            return Vec::new();
        }
        let mut v: Vec<Linha> = soma
            .into_iter()
            .map(|(linha, ns)| Linha {
                linha,
                pct: (ns / relogio_ns * 1000.0).round() / 10.0,
            })
            .filter(|l| l.pct >= MINIMO_PCT)
            .collect();
        v.sort_by(|a, b| b.pct.total_cmp(&a.pct).then_with(|| a.linha.cmp(&b.linha)));
        v
    }
}

#[cfg(target_os = "linux")]
mod sistema {
    /// O `/proc` conta em "ticks" do USER_HZ, que no Linux é sempre 100 por segundo (é parte da interface do núcleo).
    const NS_POR_TICK: u64 = 10_000_000;

    /// `(id, nome, ns de CPU)` de cada linha do processo.
    pub fn linhas() -> Vec<(u64, String, u64)> {
        let Ok(dir) = std::fs::read_dir("/proc/self/task") else {
            return Vec::new();
        };
        dir.filter_map(|e| {
            let e = e.ok()?;
            let id: u64 = e.file_name().to_str()?.parse().ok()?;
            let stat = std::fs::read_to_string(e.path().join("stat")).ok()?;
            let (nome, ticks) = ler_stat(&stat)?;
            Some((id, nome, ticks * NS_POR_TICK))
        })
        .collect()
    }

    /// `pid (nome) estado ppid … utime stime …`: o nome pode ter espaço e parêntese, então corta no ÚLTIMO `)`.
    pub fn ler_stat(s: &str) -> Option<(String, u64)> {
        let a = s.find('(')?;
        let f = s.rfind(')')?;
        let nome = s.get(a + 1..f)?.to_string();
        let resto: Vec<&str> = s.get(f + 1..)?.split_whitespace().collect();
        // depois do nome: [0] estado, … [11] utime, [12] stime (campos 14 e 15 do proc(5))
        let u: u64 = resto.get(11)?.parse().ok()?;
        let k: u64 = resto.get(12)?.parse().ok()?;
        Some((nome, u + k))
    }
}

#[cfg(windows)]
#[allow(unsafe_code)]
mod sistema {
    use windows_sys::Win32::Foundation::{CloseHandle, LocalFree, FILETIME, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Thread32First, Thread32Next, TH32CS_SNAPTHREAD, THREADENTRY32,
    };
    use windows_sys::Win32::System::Threading::{
        GetCurrentProcessId, GetThreadDescription, GetThreadTimes, OpenThread, THREAD_QUERY_LIMITED_INFORMATION,
    };

    fn ns(f: &FILETIME) -> u64 {
        // FILETIME conta de 100 em 100 ns
        (((f.dwHighDateTime as u64) << 32) | f.dwLowDateTime as u64) * 100
    }

    /// `(id, nome, ns de CPU)` de cada linha do processo.
    pub fn linhas() -> Vec<(u64, String, u64)> {
        let mut v = Vec::new();
        // SAFETY: chamadas do Win32 com estruturas do tamanho certo; cada handle aberto é fechado; o texto do
        // GetThreadDescription é liberado com LocalFree, como a documentação manda.
        unsafe {
            let foto = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
            if foto == INVALID_HANDLE_VALUE {
                return v;
            }
            let eu = GetCurrentProcessId();
            let mut te: THREADENTRY32 = std::mem::zeroed();
            te.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;
            let mut ok = Thread32First(foto, &mut te) != 0;
            while ok {
                if te.th32OwnerProcessID == eu {
                    let h = OpenThread(THREAD_QUERY_LIMITED_INFORMATION, 0, te.th32ThreadID);
                    if !h.is_null() {
                        let z = FILETIME {
                            dwLowDateTime: 0,
                            dwHighDateTime: 0,
                        };
                        let (mut c, mut e, mut k, mut u) = (z, z, z, z);
                        if GetThreadTimes(h, &mut c, &mut e, &mut k, &mut u) != 0 {
                            let mut nome = String::new();
                            let mut p: *mut u16 = std::ptr::null_mut();
                            if GetThreadDescription(h, &mut p) >= 0 && !p.is_null() {
                                let mut n = 0;
                                while *p.add(n) != 0 {
                                    n += 1;
                                }
                                nome = String::from_utf16_lossy(std::slice::from_raw_parts(p, n));
                                LocalFree(p as _);
                            }
                            if nome.is_empty() {
                                nome = "sem nome".into();
                            }
                            v.push((te.th32ThreadID as u64, nome, ns(&k) + ns(&u)));
                        }
                        CloseHandle(h);
                    }
                }
                ok = Thread32Next(foto, &mut te) != 0;
            }
            CloseHandle(foto);
        }
        v
    }
}

#[cfg(not(any(target_os = "linux", windows)))]
mod sistema {
    pub fn linhas() -> Vec<(u64, String, u64)> {
        Vec::new()
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn agrupa_pelo_nome_sem_o_numero() {
        assert_eq!(grupo("worker-3"), "worker");
        assert_eq!(grupo("EE Core 1"), "EE Core");
        assert_eq!(grupo("pool#12"), "pool");
        assert_eq!(grupo("MTGS"), "MTGS");
        assert_eq!(grupo("123"), "123");
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn le_o_stat_do_linux_com_nome_esquisito() {
        let s = "4242 (EE (Core) 1) R 1 2 3 4 5 6 7 8 9 10 250 50 0 0 20 0 1 0";
        assert_eq!(sistema::ler_stat(s), Some(("EE (Core) 1".into(), 300)));
        assert_eq!(sistema::ler_stat("lixo"), None);
    }

    #[test]
    fn mede_uma_linha_ocupada() {
        let mut c = Cpu::new();
        let t = std::thread::Builder::new()
            .name("ocupada-1".into())
            .spawn(|| {
                let fim = Instant::now() + std::time::Duration::from_millis(700);
                let mut x = 0u64;
                while Instant::now() < fim {
                    x = std::hint::black_box(x.wrapping_add(1));
                }
            })
            .expect("linha de teste");
        // lê com a linha ainda viva (a que já acabou some do /proc)
        std::thread::sleep(std::time::Duration::from_millis(400));
        let v = c.ler();
        t.join().expect("linha de teste");
        if cfg!(any(target_os = "linux", windows)) {
            let o = v
                .iter()
                .find(|l| l.linha == "ocupada")
                .expect("a linha ocupada aparece");
            assert!(o.pct > 30.0, "{v:?}");
        }
    }
}
