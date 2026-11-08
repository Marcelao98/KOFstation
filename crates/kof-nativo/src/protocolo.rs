//! O que passa pela WebSocket entre o processo nativo e a página (docs/API_CONTRACTS.md, "Núcleo nativo").
//!
//! Binário (números em little-endian; cabeçalho de 12 bytes, o 1º byte diz o tipo):
//! - processo → página: `QUADRO` `[1, 0, 0, 0, largura u16, altura u16, número u32]` + RGBA;
//!   `ESTADO`/`BATERIA` `[3|5, 0, 0, 0, pedido u32, tamanho u32]` + bytes.
//! - página → processo: `BOTOES` `[2, jogador, botões u16, eixos 4×i16]` (12 bytes);
//!   `CARREGAR_ESTADO`/`GRAVAR_BATERIA` `[4|6, 0, 0, 0, pedido u32, tamanho u32]` + bytes.
//!
//! Texto (JSON): comandos da página (`Comando`) e avisos do processo (`Aviso`).
use crate::nucleo::{Entrada, Quadro};
use serde::{Deserialize, Serialize};

pub const QUADRO: u8 = 1;
pub const BOTOES: u8 = 2;
pub const ESTADO: u8 = 3;
pub const CARREGAR_ESTADO: u8 = 4;
pub const BATERIA: u8 = 5;
pub const GRAVAR_BATERIA: u8 = 6;
pub const CABECALHO: usize = 12;

/// Comando da página (texto JSON).
#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(tag = "cmd", rename_all = "camelCase", deny_unknown_fields)]
pub enum Comando {
    Pausar,
    Continuar,
    Reiniciar,
    Fechar,
    /// volume de 0 a 1
    Volume {
        valor: f32,
    },
    /// roda mais rápido (fator 2–8), sem som
    Turbo {
        fator: u32,
    },
    Variavel {
        chave: String,
        valor: String,
    },
    SalvarEstado {
        pedido: u32,
    },
    LerBateria {
        pedido: u32,
    },
}

/// Aviso do processo (texto JSON).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "tipo", rename_all = "camelCase")]
pub enum Aviso {
    Pronto {
        nucleo: String,
        versao: String,
        largura: u32,
        altura: u32,
        proporcao: f32,
        fps: f64,
        taxa: f64,
        /// taxa em que a placa de som toca (0 = sem placa: o relógio do sistema dita o ritmo)
        #[serde(rename = "taxaSaida")]
        taxa_saida: u32,
    },
    Geometria {
        largura: u32,
        altura: u32,
        proporcao: f32,
    },
    /// a cada segundo: quadros rodados, amostras entregues, som guardado e vezes que o som acabou
    Desempenho {
        quadros: u64,
        amostras: u64,
        #[serde(rename = "atrasoMs")]
        atraso_ms: f64,
        faltas: u64,
        /// média por quadro no último segundo: o núcleo inteiro (com a leitura da placa), só a leitura da placa e o
        /// preparo do quadro pra página (ms)
        #[serde(rename = "nucleoMs", default, skip_serializing_if = "Option::is_none")]
        nucleo_ms: Option<f64>,
        #[serde(rename = "leituraMs", default, skip_serializing_if = "Option::is_none")]
        leitura_ms: Option<f64>,
        #[serde(rename = "imagemMs", default, skip_serializing_if = "Option::is_none")]
        imagem_ms: Option<f64>,
        /// cada quadro do último segundo (M16): 6 números por quadro, em µs, `[t, núcleo, leitura, envio, som na fila,
        /// faltas]` (o formato do `medidor` e do `packages/domain/src/desempenho.ts`)
        #[serde(rename = "porQuadro", default, skip_serializing_if = "Option::is_none")]
        por_quadro: Option<Vec<u64>>,
        /// % de um núcleo do processador que cada linha (thread) do processo usou no último segundo
        #[serde(default, skip_serializing_if = "Option::is_none")]
        cpu: Option<Vec<crate::cpu::Linha>>,
    },
    Ok {
        pedido: u32,
    },
    Erro {
        pedido: Option<u32>,
        codigo: String,
        mensagem: String,
    },
    Fim {
        motivo: String,
    },
}

/// Mensagem binária da página já entendida.
#[derive(Debug, PartialEq)]
pub enum Binario<'a> {
    Botoes { jogador: usize, entrada: Entrada },
    CarregarEstado { pedido: u32, dados: &'a [u8] },
    GravarBateria { pedido: u32, dados: &'a [u8] },
}

fn u32le(b: &[u8], i: usize) -> u32 {
    u32::from_le_bytes([b[i], b[i + 1], b[i + 2], b[i + 3]])
}

pub fn ler_binario(b: &[u8]) -> Result<Binario<'_>, String> {
    if b.len() < CABECALHO {
        return Err(format!("mensagem curta demais ({} bytes)", b.len()));
    }
    match b[0] {
        BOTOES => {
            let i16le = |i: usize| i16::from_le_bytes([b[i], b[i + 1]]);
            Ok(Binario::Botoes {
                jogador: b[1] as usize,
                entrada: Entrada {
                    botoes: u16::from_le_bytes([b[2], b[3]]),
                    eixos: [i16le(4), i16le(6), i16le(8), i16le(10)],
                },
            })
        }
        t @ (CARREGAR_ESTADO | GRAVAR_BATERIA) => {
            let pedido = u32le(b, 4);
            let n = u32le(b, 8) as usize;
            let dados = b
                .get(CABECALHO..CABECALHO + n)
                .ok_or_else(|| format!("faltam bytes: diz {n}, veio {}", b.len() - CABECALHO))?;
            Ok(if t == CARREGAR_ESTADO {
                Binario::CarregarEstado { pedido, dados }
            } else {
                Binario::GravarBateria { pedido, dados }
            })
        }
        t => Err(format!("tipo de mensagem desconhecido: {t}")),
    }
}

pub fn botoes(jogador: u8, e: Entrada) -> Vec<u8> {
    let mut v = vec![BOTOES, jogador];
    v.extend_from_slice(&e.botoes.to_le_bytes());
    for x in e.eixos {
        v.extend_from_slice(&x.to_le_bytes());
    }
    v
}

pub fn quadro(q: &Quadro, numero: u32, saida: &mut Vec<u8>) {
    saida.clear();
    saida.extend_from_slice(&[QUADRO, 0, 0, 0]);
    saida.extend_from_slice(&(q.largura as u16).to_le_bytes());
    saida.extend_from_slice(&(q.altura as u16).to_le_bytes());
    saida.extend_from_slice(&numero.to_le_bytes());
    saida.extend_from_slice(&q.rgba);
}

/// `ESTADO`, `BATERIA`, `CARREGAR_ESTADO` ou `GRAVAR_BATERIA`: cabeçalho com pedido e tamanho, depois os bytes.
pub fn bloco(tipo: u8, pedido: u32, dados: &[u8]) -> Vec<u8> {
    let mut v = Vec::with_capacity(CABECALHO + dados.len());
    v.extend_from_slice(&[tipo, 0, 0, 0]);
    v.extend_from_slice(&pedido.to_le_bytes());
    v.extend_from_slice(&(dados.len() as u32).to_le_bytes());
    v.extend_from_slice(dados);
    v
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn botoes_ida_e_volta() {
        let e = Entrada {
            botoes: 0x8101,
            eixos: [-32768, 32767, 5, -5],
        };
        let b = botoes(2, e);
        assert_eq!(b.len(), CABECALHO);
        assert_eq!(ler_binario(&b), Ok(Binario::Botoes { jogador: 2, entrada: e }));
    }

    #[test]
    fn bloco_ida_e_volta_e_curto_recusado() {
        let b = bloco(CARREGAR_ESTADO, 7, &[1, 2, 3]);
        assert_eq!(
            ler_binario(&b),
            Ok(Binario::CarregarEstado {
                pedido: 7,
                dados: &[1, 2, 3]
            })
        );
        assert!(ler_binario(&b[..13]).is_err());
        assert!(ler_binario(&[9; 12]).is_err());
    }

    #[test]
    fn comandos_em_json() {
        let c: Comando = serde_json::from_str(r#"{"cmd":"turbo","fator":4}"#).unwrap();
        assert_eq!(c, Comando::Turbo { fator: 4 });
        let c: Comando = serde_json::from_str(r#"{"cmd":"salvarEstado","pedido":3}"#).unwrap();
        assert_eq!(c, Comando::SalvarEstado { pedido: 3 });
        assert!(serde_json::from_str::<Comando>(r#"{"cmd":"rm -rf"}"#).is_err());
        let a = serde_json::to_string(&Aviso::Ok { pedido: 1 }).unwrap();
        assert_eq!(a, r#"{"tipo":"ok","pedido":1}"#);
    }
}
