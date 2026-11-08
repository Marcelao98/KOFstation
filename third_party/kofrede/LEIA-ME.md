# kofrede (do KOFstation antigo)

Cópia **sem nenhuma mudança** de `rede/` do `Marcelao98/kofstation-old` (commit `ceba493fc494165de6f561b77a699fb8c22b295f`): o núcleo do protocolo de
rede entre aparelhos (`kofrede.c`/`.h`, só conta: CPace, 3DH, XChaCha20-Poly1305), o `PROTOCOLO.md` e o Monocypher
(`terceiros/`, BSD-2-Clause ou CC0-1.0). O `crates/kof-net` compila os dois .c com o crate `cc` e chama por FFI: o
mesmo código que roda no APK atual (`libkofrede.so`), então o pareamento é o mesmo byte a byte.

SHA-256 (conferidos pelo `crates/kof-net/build.rs`):

```
6cbf9154aa7a15472558662d7d82fbc1f03a1bee592c242c0063b850bafe8870  kofrede.c
9e3289e9b34c512a4b114fec328844263042c0b71897932d9638cf320cf63389  kofrede.h
02174117935699d418443c75a558a287deb06ef8cf7c1adced61d9047d2f323d  terceiros/monocypher.c
fcaf6ed771358bb4f40fba016f6518ae86ec02b1b877d2cc35ad92d3a26fd7b3  terceiros/monocypher.h
```
