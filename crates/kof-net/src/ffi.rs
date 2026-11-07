//! O `kofrede.c` do antigo por FFI (o mesmo código da `libkofrede.so` do APK). Só conta: chaves, pareamento (CPace),
//! conexão (3DH) e cifra (XChaCha20-Poly1305). O `unsafe` fica todo aqui, atrás de funções seguras com tamanhos fixos.
#![allow(unsafe_code)]
use std::ffi::{c_char, c_int, CString};

/// Tamanho do MAC de cada mensagem.
pub const MAC: usize = 16;
/// Maior mensagem (sem o MAC).
pub const MAX: usize = 1 << 20;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct Canal {
    k_env: [u8; 32],
    k_rec: [u8; 32],
    n_env: u64,
    n_rec: u64,
}

#[repr(C)]
pub struct Par {
    y: [u8; 32],
    ya: [u8; 32],
    yb: [u8; 32],
    sid: [u8; 16],
    isk: [u8; 64],
}

#[repr(C)]
pub struct Con {
    e: [u8; 32],
    ec: [u8; 32],
    pkc: [u8; 32],
    ck: [u8; 64],
}

unsafe extern "C" {
    fn kr_publica(pk: *mut u8, sk: *const u8);
    fn kr_id(out: *mut c_char, pk: *const u8);
    fn kr_par_cliente(
        p: *mut Par,
        app: *const c_char,
        senha: *const c_char,
        sid: *const u8,
        rnd: *const u8,
        msg1: *mut u8,
    );
    fn kr_par_servidor(
        p: *mut Par,
        app: *const c_char,
        senha: *const c_char,
        msg1: *const u8,
        rnd: *const u8,
        msg2: *mut u8,
    ) -> c_int;
    fn kr_par_cliente2(p: *mut Par, app: *const c_char, msg2: *const u8, msg3: *mut u8, c: *mut Canal) -> c_int;
    fn kr_par_servidor2(p: *mut Par, app: *const c_char, msg3: *const u8, c: *mut Canal) -> c_int;
    fn kr_con_cliente(k: *mut Con, skc: *const u8, rnd: *const u8, msg1: *mut u8);
    fn kr_con_servidor(
        k: *mut Con,
        app: *const c_char,
        sks: *const u8,
        msg1: *const u8,
        rnd: *const u8,
        msg2: *mut u8,
        c: *mut Canal,
    ) -> c_int;
    fn kr_con_cliente2(
        k: *mut Con,
        app: *const c_char,
        skc: *const u8,
        pks: *const u8,
        msg2: *const u8,
        msg3: *mut u8,
        c: *mut Canal,
    ) -> c_int;
    fn kr_con_servidor2(k: *mut Con, msg3: *const u8) -> c_int;
    fn kr_cifrar(c: *mut Canal, out: *mut u8, inp: *const u8, n: usize);
    fn kr_decifrar(c: *mut Canal, out: *mut u8, inp: *const u8, total: usize) -> c_int;
}

/// Texto pro C (o nome do app e a senha nunca têm byte zero; se tiver, corta ali, como o C leria).
fn c(s: &str) -> CString {
    CString::new(s.split('\0').next().unwrap_or("")).expect("sem zero")
}

fn vazio_canal() -> Canal {
    Canal {
        k_env: [0; 32],
        k_rec: [0; 32],
        n_env: 0,
        n_rec: 0,
    }
}

pub fn publica(sk: &[u8; 32]) -> [u8; 32] {
    let mut pk = [0u8; 32];
    // SAFETY: os dois ponteiros apontam pra 32 bytes, como o kofrede.h pede
    unsafe { kr_publica(pk.as_mut_ptr(), sk.as_ptr()) };
    pk
}

/// O id do aparelho: 16 letras hex do hash da chave pública.
pub fn id(pk: &[u8; 32]) -> String {
    let mut o = [0 as c_char; 17];
    // SAFETY: out tem 17 bytes (16 + o zero), pk tem 32
    unsafe { kr_id(o.as_mut_ptr(), pk.as_ptr()) };
    o[..16].iter().map(|&b| b as u8 as char).collect()
}

impl Par {
    fn novo() -> Par {
        Par {
            y: [0; 32],
            ya: [0; 32],
            yb: [0; 32],
            sid: [0; 16],
            isk: [0; 64],
        }
    }

    /// Cliente: msg1 = sid(16) | Ya(32).
    pub fn cliente(app: &str, senha: &str, sid: &[u8; 16], rnd: &[u8; 32]) -> (Par, [u8; 48]) {
        let (mut p, mut m) = (Par::novo(), [0u8; 48]);
        let (a, s) = (c(app), c(senha));
        // SAFETY: tamanhos do kofrede.h (sid 16, rnd 32, msg1 48); as strings terminam em zero
        unsafe {
            kr_par_cliente(
                &mut p,
                a.as_ptr(),
                s.as_ptr(),
                sid.as_ptr(),
                rnd.as_ptr(),
                m.as_mut_ptr(),
            )
        };
        (p, m)
    }

    /// Servidor: lê msg1, devolve msg2 = Yb(32) | conf(16).
    pub fn servidor(app: &str, senha: &str, msg1: &[u8; 48], rnd: &[u8; 32]) -> Option<(Par, [u8; 48])> {
        let (mut p, mut m) = (Par::novo(), [0u8; 48]);
        let (a, s) = (c(app), c(senha));
        // SAFETY: tamanhos do kofrede.h
        let r = unsafe {
            kr_par_servidor(
                &mut p,
                a.as_ptr(),
                s.as_ptr(),
                msg1.as_ptr(),
                rnd.as_ptr(),
                m.as_mut_ptr(),
            )
        };
        (r == 0).then_some((p, m))
    }

    /// Cliente: confere msg2 (senha errada = None), devolve msg3 e o canal.
    pub fn cliente2(&mut self, app: &str, msg2: &[u8; 48]) -> Option<([u8; 16], Canal)> {
        let (mut m3, mut can) = ([0u8; 16], vazio_canal());
        let a = c(app);
        // SAFETY: tamanhos do kofrede.h
        let r = unsafe { kr_par_cliente2(self, a.as_ptr(), msg2.as_ptr(), m3.as_mut_ptr(), &mut can) };
        (r == 0).then_some((m3, can))
    }

    pub fn servidor2(&mut self, app: &str, msg3: &[u8; 16]) -> Option<Canal> {
        let mut can = vazio_canal();
        let a = c(app);
        // SAFETY: tamanhos do kofrede.h
        let r = unsafe { kr_par_servidor2(self, a.as_ptr(), msg3.as_ptr(), &mut can) };
        (r == 0).then_some(can)
    }
}

impl Con {
    fn novo() -> Con {
        Con {
            e: [0; 32],
            ec: [0; 32],
            pkc: [0; 32],
            ck: [0; 64],
        }
    }

    /// Cliente: msg1 = PKc(32) | Ec(32).
    pub fn cliente(skc: &[u8; 32], rnd: &[u8; 32]) -> (Con, [u8; 64]) {
        let (mut k, mut m) = (Con::novo(), [0u8; 64]);
        // SAFETY: tamanhos do kofrede.h
        unsafe { kr_con_cliente(&mut k, skc.as_ptr(), rnd.as_ptr(), m.as_mut_ptr()) };
        (k, m)
    }

    /// Servidor (depois de conferir que PKc é de um pareado): msg2 = Es(32) | conf(16) e o canal.
    pub fn servidor(app: &str, sks: &[u8; 32], msg1: &[u8; 64], rnd: &[u8; 32]) -> Option<(Con, [u8; 48], Canal)> {
        let (mut k, mut m, mut can) = (Con::novo(), [0u8; 48], vazio_canal());
        let a = c(app);
        // SAFETY: tamanhos do kofrede.h
        let r = unsafe {
            kr_con_servidor(
                &mut k,
                a.as_ptr(),
                sks.as_ptr(),
                msg1.as_ptr(),
                rnd.as_ptr(),
                m.as_mut_ptr(),
                &mut can,
            )
        };
        (r == 0).then_some((k, m, can))
    }

    /// Cliente: confere msg2 (o servidor tem a chave de pks?), msg3 e o canal.
    pub fn cliente2(
        &mut self,
        app: &str,
        skc: &[u8; 32],
        pks: &[u8; 32],
        msg2: &[u8; 48],
    ) -> Option<([u8; 16], Canal)> {
        let (mut m3, mut can) = ([0u8; 16], vazio_canal());
        let a = c(app);
        // SAFETY: tamanhos do kofrede.h
        let r = unsafe {
            kr_con_cliente2(
                self,
                a.as_ptr(),
                skc.as_ptr(),
                pks.as_ptr(),
                msg2.as_ptr(),
                m3.as_mut_ptr(),
                &mut can,
            )
        };
        (r == 0).then_some((m3, can))
    }

    pub fn servidor2(&mut self, msg3: &[u8; 16]) -> bool {
        // SAFETY: msg3 tem 16 bytes
        unsafe { kr_con_servidor2(self, msg3.as_ptr()) == 0 }
    }
}

impl Canal {
    /// mac(16) | cifrado.
    pub fn cifrar(&mut self, d: &[u8]) -> Vec<u8> {
        let mut out = vec![0u8; d.len() + MAC];
        // SAFETY: out tem n + 16 bytes, como o kr_cifrar escreve
        unsafe { kr_cifrar(self, out.as_mut_ptr(), d.as_ptr(), d.len()) };
        out
    }

    /// None = adulterada (ou fora de ordem).
    pub fn decifrar(&mut self, q: &[u8]) -> Option<Vec<u8>> {
        if q.len() < MAC {
            return None;
        }
        let mut out = vec![0u8; q.len() - MAC];
        // SAFETY: out tem total - 16 bytes, o que o kr_decifrar escreve
        let r = unsafe { kr_decifrar(self, out.as_mut_ptr(), q.as_ptr(), q.len()) };
        (r == 0).then_some(out)
    }
}

#[cfg(test)]
mod testes {
    use super::*;

    fn rnd<const N: usize>(semente: u8) -> [u8; N] {
        std::array::from_fn(|i| (i as u8).wrapping_mul(31).wrapping_add(semente))
    }

    fn parear(sc: &str, ss: &str) -> Result<(Canal, Canal), i32> {
        let (mut pc, m1) = Par::cliente("teste", sc, &rnd(1), &rnd(2));
        let (mut ps, m2) = Par::servidor("teste", ss, &m1, &rnd(3)).ok_or(-1)?;
        let (m3, cc) = pc.cliente2("teste", &m2).ok_or(-2)?;
        let cs = ps.servidor2("teste", &m3).ok_or(-3)?;
        Ok((cc, cs))
    }

    fn troca(a: &mut Canal, b: &mut Canal) -> bool {
        let q = a.cifrar(b"ola do celular");
        let ok1 = b.decifrar(&q).as_deref() == Some(&b"ola do celular"[..]);
        let mut q = b.cifrar(b"volta");
        let ok2 = a.decifrar(&q).is_some();
        q = a.cifrar(b"adulterada");
        q[20] ^= 1;
        ok1 && ok2 && b.decifrar(&q).is_none()
    }

    // os mesmos casos do rede/teste/nucleo.c do antigo
    #[test]
    fn pareamento_conexao_e_cifra() {
        let (mut cc, mut cs) = parear("123456", "123456").expect("pareia com a senha certa");
        assert!(
            troca(&mut cc, &mut cs),
            "mensagens no canal do pareamento (e a adulterada falha)"
        );
        assert_eq!(
            parear("123457", "123456").err(),
            Some(-2),
            "senha errada: o cliente percebe"
        );

        let (skc, sks, skx) = (rnd::<32>(10), rnd::<32>(20), rnd::<32>(30));
        let (pks, pkc) = (publica(&sks), publica(&skc));
        let (mut kc, m1) = Con::cliente(&skc, &rnd(4));
        let (mut ks, m2, mut cs) = Con::servidor("teste", &sks, &m1, &rnd(5)).unwrap();
        let (m3, mut cc) = kc.cliente2("teste", &skc, &pks, &m2).expect("conecta entre pareados");
        assert!(ks.servidor2(&m3));
        assert!(troca(&mut cc, &mut cs), "mensagens no canal da conexão");

        // servidor falso (sem a chave do PC)
        let (mut kc, m1) = Con::cliente(&skc, &rnd(6));
        let (_, m2, _) = Con::servidor("teste", &skx, &m1, &rnd(7)).unwrap();
        assert!(
            kc.cliente2("teste", &skc, &pks, &m2).is_none(),
            "servidor falso é recusado pelo cliente"
        );

        // cliente falso: diz que é pkc mas não tem skc
        let (mut kc, mut m1) = Con::cliente(&skx, &rnd(8));
        m1[..32].copy_from_slice(&pkc);
        kc.pkc = pkc;
        let (mut ks, m2, _) = Con::servidor("teste", &sks, &m1, &rnd(9)).unwrap();
        let m3 = kc.cliente2("teste", &skx, &pks, &m2).map(|x| x.0).unwrap_or([0; 16]);
        assert!(!ks.servidor2(&m3), "cliente falso é recusado pelo servidor");
        assert_eq!(id(&pkc).len(), 16);
    }
}
