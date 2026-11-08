//! O processo do núcleo nativo sozinho (testes e depuração). No app, o `kofstation --nativo` roda o mesmo código.
fn main() {
    std::process::exit(kof_nativo::filho::rodar());
}
