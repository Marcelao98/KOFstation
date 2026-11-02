//! Som nativo. A placa de som consome no relógio dela e o laço roda quadros enquanto faltar som guardado (D22: o som
//! dita o ritmo, igual ao AudioWorklet do wasm). Sem placa (ou nos testes), um relógio imita o consumo.
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

/// Pra onde vai o som do núcleo.
pub trait Saida {
    /// Taxa da saída (0 = relógio, sem placa).
    fn taxa(&self) -> u32;
    /// Recebe o som do núcleo (estéreo intercalado na taxa do núcleo).
    fn tocar(&mut self, amostras: &[i16], taxa_nucleo: f64);
    /// Quanto som está guardado esperando a placa (ms).
    fn guardado_ms(&self) -> f64;
    /// Vezes que a placa pediu som e não tinha.
    fn faltas(&self) -> u64;
    fn volume(&mut self, v: f32);
    /// Pausa: para de consumir (o relógio também).
    fn pausar(&mut self, pausado: bool);
}

/// Reamostrador linear estéreo (taxa do núcleo → taxa da placa), contínuo entre chamadas.
#[derive(Default)]
pub struct Reamostrador {
    pos: f64,
    ultimo: [f32; 2],
}

impl Reamostrador {
    pub fn reamostrar(&mut self, entrada: &[i16], de: f64, para: f64, saida: &mut Vec<f32>) {
        if de <= 0.0 || para <= 0.0 {
            return;
        }
        let passo = de / para;
        let n = entrada.len() / 2;
        let amostra = |i: isize, c: usize, ultimo: &[f32; 2]| -> f32 {
            if i < 0 {
                ultimo[c]
            } else {
                entrada[i as usize * 2 + c] as f32 / 32768.0
            }
        };
        // `pos` é relativo à amostra -1 (a última da chamada anterior)
        while self.pos < n as f64 {
            let i = self.pos.floor();
            let f = (self.pos - i) as f32;
            let i = i as isize - 1;
            for c in 0..2 {
                let a = amostra(i, c, &self.ultimo);
                let b = amostra(i + 1, c, &self.ultimo);
                saida.push(a + (b - a) * f);
            }
            self.pos += passo;
        }
        self.pos -= n as f64;
        if n > 0 {
            self.ultimo = [
                entrada[(n - 1) * 2] as f32 / 32768.0,
                entrada[(n - 1) * 2 + 1] as f32 / 32768.0,
            ];
        }
    }
}

/// Sem placa: um relógio consome no tempo real.
pub struct Relogio {
    guardado_s: f64,
    desde: Instant,
    pausado: bool,
    faltas: u64,
}

impl Default for Relogio {
    fn default() -> Self {
        Self {
            guardado_s: 0.0,
            desde: Instant::now(),
            pausado: false,
            faltas: 0,
        }
    }
}

impl Relogio {
    fn andar(&mut self) -> f64 {
        let agora = Instant::now();
        if !self.pausado {
            let passou = agora.duration_since(self.desde).as_secs_f64();
            if passou > self.guardado_s && self.guardado_s > 0.0 {
                self.faltas += 1;
            }
            self.guardado_s = (self.guardado_s - passou).max(0.0);
        }
        self.desde = agora;
        self.guardado_s
    }
}

impl Saida for Relogio {
    fn taxa(&self) -> u32 {
        0
    }
    fn tocar(&mut self, amostras: &[i16], taxa_nucleo: f64) {
        self.andar();
        if taxa_nucleo > 0.0 {
            self.guardado_s += (amostras.len() / 2) as f64 / taxa_nucleo;
        }
    }
    fn guardado_ms(&self) -> f64 {
        let passou = if self.pausado {
            0.0
        } else {
            self.desde.elapsed().as_secs_f64()
        };
        (self.guardado_s - passou).max(0.0) * 1000.0
    }
    fn faltas(&self) -> u64 {
        self.faltas
    }
    fn volume(&mut self, _v: f32) {}
    fn pausar(&mut self, p: bool) {
        self.andar();
        self.pausado = p;
    }
}

struct Fila {
    amostras: VecDeque<f32>,
    pausado: bool,
}

/// A placa de som de verdade (cpal: ALSA/PulseAudio/PipeWire no Linux, WASAPI no Windows).
pub struct Placa {
    _stream: cpal::Stream,
    fila: Arc<Mutex<Fila>>,
    taxa: u32,
    volume: Arc<AtomicU32>,
    faltas: Arc<AtomicU64>,
    reamostrador: Reamostrador,
    tmp: Vec<f32>,
}

impl Placa {
    pub fn abrir() -> Result<Placa, String> {
        let host = cpal::default_host();
        let dev = host
            .default_output_device()
            .ok_or_else(|| "nenhuma saída de som".to_string())?;
        let cfg = dev.default_output_config().map_err(|e| e.to_string())?;
        let taxa = cfg.sample_rate();
        let canais = cfg.channels() as usize;
        let fila = Arc::new(Mutex::new(Fila {
            amostras: VecDeque::with_capacity(taxa as usize),
            pausado: false,
        }));
        let volume = Arc::new(AtomicU32::new(1f32.to_bits()));
        let faltas = Arc::new(AtomicU64::new(0));
        let (f2, v2, fa2) = (fila.clone(), volume.clone(), faltas.clone());
        let erro = |e: cpal::Error| tracing::warn!("som: {e}");
        let config: cpal::StreamConfig = cfg.config();
        macro_rules! fluxo {
            ($t:ty, $conv:expr) => {
                dev.build_output_stream(
                    config.clone(),
                    move |saida: &mut [$t], _: &cpal::OutputCallbackInfo| {
                        let vol = f32::from_bits(v2.load(Ordering::Relaxed));
                        let mut f = f2.lock().unwrap_or_else(|e| e.into_inner());
                        let mut faltou = false;
                        for quadro in saida.chunks_mut(canais) {
                            let (l, r) = if f.pausado {
                                (0.0, 0.0)
                            } else {
                                match (f.amostras.pop_front(), f.amostras.pop_front()) {
                                    (Some(l), Some(r)) => (l * vol, r * vol),
                                    _ => {
                                        faltou = true;
                                        (0.0, 0.0)
                                    }
                                }
                            };
                            for (c, s) in quadro.iter_mut().enumerate() {
                                let v: f32 = match (canais, c) {
                                    (1, _) => (l + r) * 0.5,
                                    (_, 0) => l,
                                    (_, 1) => r,
                                    _ => 0.0,
                                };
                                *s = $conv(v);
                            }
                        }
                        if faltou && !f.pausado {
                            fa2.fetch_add(1, Ordering::Relaxed);
                        }
                    },
                    erro,
                    None,
                )
            };
        }
        let stream = match cfg.sample_format() {
            cpal::SampleFormat::F32 => fluxo!(f32, |v: f32| v),
            cpal::SampleFormat::I16 => fluxo!(i16, |v: f32| (v.clamp(-1.0, 1.0) * 32767.0) as i16),
            cpal::SampleFormat::U16 => fluxo!(u16, |v: f32| ((v.clamp(-1.0, 1.0) + 1.0) * 32767.5) as u16),
            outro => return Err(format!("formato de som não suportado: {outro:?}")),
        }
        .map_err(|e| e.to_string())?;
        stream.play().map_err(|e| e.to_string())?;
        Ok(Placa {
            _stream: stream,
            fila,
            taxa,
            volume,
            faltas,
            reamostrador: Reamostrador::default(),
            tmp: Vec::new(),
        })
    }
}

impl Saida for Placa {
    fn taxa(&self) -> u32 {
        self.taxa
    }
    fn tocar(&mut self, amostras: &[i16], taxa_nucleo: f64) {
        self.tmp.clear();
        self.reamostrador
            .reamostrar(amostras, taxa_nucleo, self.taxa as f64, &mut self.tmp);
        let mut f = self.fila.lock().unwrap_or_else(|e| e.into_inner());
        f.amostras.extend(self.tmp.iter().copied());
        // nunca mais de 1 s guardado (o núcleo andou rápido demais: corta o atraso)
        let max = self.taxa as usize * 2;
        if f.amostras.len() > max {
            let sobra = f.amostras.len() - max;
            f.amostras.drain(..sobra & !1);
        }
    }
    fn guardado_ms(&self) -> f64 {
        let f = self.fila.lock().unwrap_or_else(|e| e.into_inner());
        (f.amostras.len() / 2) as f64 * 1000.0 / self.taxa as f64
    }
    fn faltas(&self) -> u64 {
        self.faltas.load(Ordering::Relaxed)
    }
    fn volume(&mut self, v: f32) {
        self.volume.store(v.clamp(0.0, 1.0).to_bits(), Ordering::Relaxed);
    }
    fn pausar(&mut self, p: bool) {
        self.fila.lock().unwrap_or_else(|e| e.into_inner()).pausado = p;
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn reamostrar_mesma_taxa_preserva() {
        let mut r = Reamostrador::default();
        let mut s = Vec::new();
        let e: Vec<i16> = (0..20).map(|i| (i * 1000) as i16).collect();
        r.reamostrar(&e, 48000.0, 48000.0, &mut s);
        r.reamostrar(&e, 48000.0, 48000.0, &mut s);
        // atraso de uma amostra (interpola entre a anterior e a atual), depois igual
        assert_eq!(s.len(), 40);
        assert!((s[2] - e[0] as f32 / 32768.0).abs() < 1e-6);
        assert!((s[20] - e[18] as f32 / 32768.0).abs() < 1e-6);
    }

    #[test]
    fn reamostrar_conta_certa_entre_chamadas() {
        let mut r = Reamostrador::default();
        let mut s = Vec::new();
        let e = vec![0i16; 735 * 2]; // um quadro de 44.100 Hz a 60 fps
        for _ in 0..60 {
            r.reamostrar(&e, 44100.0, 48000.0, &mut s);
        }
        let quadros = s.len() / 2;
        assert!((47_990..=48_010).contains(&quadros), "{quadros}");
    }

    #[test]
    fn relogio_consome_no_tempo() {
        let mut r = Relogio::default();
        r.tocar(&vec![0; 4410 * 2], 44100.0); // 100 ms
        let g = r.guardado_ms();
        assert!(g > 80.0 && g <= 100.0, "{g}");
        r.pausar(true);
        std::thread::sleep(std::time::Duration::from_millis(30));
        assert!((r.guardado_ms() - r.guardado_ms()).abs() < 1.0);
        assert!(r.guardado_ms() > 60.0);
    }
}
