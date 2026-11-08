# tiny_http 0.12.0 com uma correção

Cópia do `tiny_http` 0.12.0 (crates.io, MIT ou Apache-2.0, github.com/tiny-http/tiny-http) com **uma** mudança, em
`src/util/task_pool.rs` (`spawn`): o original só criava uma linha nova quando ninguém estava esperando (`== 0`). Uma
linha já acordada, mas que ainda não pegou a tarefa, continua contada como "esperando"; com duas conexões chegando
juntas, a segunda ia pra fila sem linha nenhuma pra ela e ficava parada enquanto a primeira conexão (keep-alive do
Chrome) vivesse. Era a página que às vezes não abria (um arquivo `.js` sem resposta). Agora só vai pra fila se tem mais
linhas esperando do que tarefas na fila.

Medido com 30 conexões keep-alive abertas juntas, 5 rodadas: **5 de 150** ficavam sem resposta antes; **0** depois.
Entra pelo `[patch.crates-io]` do `Cargo.toml` da raiz. Trocar pela versão nova do crate quando ele corrigir.
