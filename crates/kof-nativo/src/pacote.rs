//! O estado salvo no formato da loja (3.2), montado aqui em vez de na página: o texto `{"lr":<núcleo>,"d":"<base64>"}`
//! (o mesmo do `textoDoCapturado` do `packages/domain/src/estado-texto.ts` e do app antigo), em gzip na loja `estados` e
//! sem gzip na `autos`. No PS2 o estado tem ~48 MB: o base64 (64 MB) e o gzip na página paravam a tela ~0,75 s no F5 e
//! subiam a memória do Chrome; aqui isso roda numa linha separada do jogo e a página só guarda o pacote pronto.
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use std::io::{Read, Write};

/// O pacote da loja: o texto do estado, em gzip quando `comprimir`.
pub fn empacotar(nucleo: &str, estado: &[u8], comprimir: bool) -> Vec<u8> {
    let mut t = Vec::with_capacity(estado.len() / 3 * 4 + 64);
    t.extend_from_slice(b"{\"lr\":");
    t.extend_from_slice(serde_json::to_string(nucleo).expect("texto").as_bytes());
    t.extend_from_slice(b",\"d\":\"");
    let mut b = String::with_capacity(estado.len() / 3 * 4 + 4);
    STANDARD.encode_string(estado, &mut b);
    t.extend_from_slice(b.as_bytes());
    t.extend_from_slice(b"\"}");
    if !comprimir {
        return t;
    }
    // rápido em vez de menor: o tempo conta mais que o disco (o gzip da página também não era o mais forte)
    let mut e = GzEncoder::new(Vec::with_capacity(t.len() / 3), Compression::fast());
    e.write_all(&t).expect("escrever na memória");
    e.finish().expect("escrever na memória")
}

/// Os bytes do estado de um pacote da loja (o que o `empacotar` faz, ou o que a página/o app antigo gravaram).
pub fn desempacotar(dados: &[u8], comprimido: bool) -> Result<Vec<u8>, String> {
    let aberto;
    let texto: &[u8] = if comprimido {
        let mut v = Vec::with_capacity(dados.len() * 3);
        GzDecoder::new(dados)
            .read_to_end(&mut v)
            .map_err(|e| format!("o gzip do estado não abre: {e}"))?;
        aberto = v;
        &aberto
    } else {
        dados
    };
    let i = texto
        .windows(5)
        .position(|w| w == b"\"d\":\"")
        .ok_or("o estado não tem o campo d")?;
    let ini = i + 5;
    let fim = texto[ini..]
        .iter()
        .position(|&c| c == b'"')
        .map(|p| ini + p)
        .ok_or("o campo d do estado não termina")?;
    STANDARD
        .decode(&texto[ini..fim])
        .map_err(|e| format!("o base64 do estado está estragado: {e}"))
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn mesmo_texto_da_pagina_e_ida_e_volta() {
        let e = [1u8, 2, 3, 250, 0, 7];
        let t = empacotar("pcsx2", &e, false);
        assert_eq!(
            String::from_utf8(t.clone()).unwrap(),
            r#"{"lr":"pcsx2","d":"AQID+gAH"}"#
        );
        assert_eq!(desempacotar(&t, false).unwrap(), e);
        let gz = empacotar("pcsx2", &e, true);
        assert_eq!(&gz[..2], &[0x1f, 0x8b], "gzip");
        assert_eq!(desempacotar(&gz, true).unwrap(), e);
        // o que o app antigo gravava (o Snes9x com o s9x antes) também abre
        assert_eq!(
            desempacotar(br#"{"s9x":1,"lr":"snes9x","d":"AQID"}"#, false).unwrap(),
            [1, 2, 3]
        );
    }

    #[test]
    fn estragado_da_erro_com_motivo() {
        assert!(desempacotar(b"{}", false).unwrap_err().contains("campo d"));
        assert!(desempacotar(br#"{"d":"AQ"#, false).unwrap_err().contains("termina"));
        assert!(desempacotar(br#"{"d":"!!!!"}"#, false).unwrap_err().contains("base64"));
        assert!(desempacotar(b"nao e gzip", true).unwrap_err().contains("gzip"));
    }
}
