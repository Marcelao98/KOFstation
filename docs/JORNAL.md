# Jornal do KOFstation

Diário de bordo da migração: **uma entrada por sessão de trabalho, a mais nova em cima.** Serve pra uma pessoa (ou um
agente) que chega amanhã entender o que aconteceu, por quê, e onde parou, sem reler o código nem a conversa inteira.

**Como escrever uma entrada** (copie o modelo; seja curto; números e nomes de arquivo valem mais que adjetivos):

```markdown
## AAAA-MM-DD · Etapas X–Y · título curto

**Pedido:** o que o Marcelo pediu, nas palavras dele resumidas.
**Feito:** o que mudou (com os arquivos ou módulos principais).
**Decidido:** decisões novas ou mudadas (com o número em DECISIONS.md).
**Medido / conferido:** testes, números, comparações com o app antigo.
**Deu errado / aprendido:** o que quebrou, o que custou tempo, o que não fazer de novo.
**Onde parou:** estado exato e o próximo passo (e se está esperando o Marcelo).
```

Regras: não apagar nem reescrever entradas antigas (corrigir com uma entrada nova); datas no formato AAAA-MM-DD;
commits citados pelo hash curto quando ajudarem.

---

## 2026-11-14 · M14.4 · PS1 e N64 nativos no APK (reaproveitando a casca do antigo)

**Pedido:** o APK novo tem que rodar PS1 e N64 como o antigo ("não recria do zero, rearquiteta").
**Erro meu:** escrevi uma casca nova do zero, apaguei o `pcsx.js`/`mupen64.js` do APK e disse que PS1/N64 rodavam no
WebAssembly: **não rodavam** (o APK anterior não abria nenhum dos dois). O antigo roda nativo (`.so` ARM64 + `Ps1Jogo`/`N64Jogo`).
**Achado:** o APK pronto do antigo (`android/apk/KOFstation.apk`) traz as `.so`; **não precisa de NDK**.
**Feito:** `android/` agora é a casca do antigo com o mínimo mudado (assets do app novo com COOP/COEP, ponte nova `KofAndroid` ao
lado da `KOFnesApk`, Voltar, sem o Atualizador do antigo); `construir-apk.sh` extrai as `.so` do APK antigo na hora de montar
(nada de binário no histórico) e mantém o WebAssembly do PS1/N64 de reserva. TS: `engine/nativo-android.ts`
(`JogoNativoAndroid`, a `fachada()` do `android.js` com a cara de sessão do app novo: botões a cada 16 ms, área do jogo, volume,
savestate em base64), `platform/android-nativo.ts` (decide por extensão se vai pro nativo), `stores/jogo.ts` (ramo
`nativoAndroid`: o CD não passa pela página, o "arquivo" guardado é uma marca de 16 bytes, sem cópia na loja `roms`).
**Medido / conferido:** unit (5) e e2e com `KOFnesApk` falsa: `.cue` → `ps1Abrir`, depois `ps1Pad`/`ps1Area`/`ps1Volume`, sem baixar o
WebAssembly do PS1; `.z64` → `n64Abrir` e o PS1 fecha; pausar para de mandar botões (é o sinal que esconde a tela nativa). Nomes
JNI das `.so` (`Java_dev_kofnes_android_Ps1_*`, `..._N64_*`) batem com as classes copiadas. APK 13 MB assina e verifica.
**Falta:** jogar no celular (T-CELULAR passo 4); reabrir CD nativo pela Biblioteca (depende do M14.3, a `Pasta.java` já está lá).
**Onde parou:** ⏸ o Marcelo testa PS1/N64 no APK; depois M14.3.

## 2026-11-14 · Fecho da sessão · onde parou

**Feito nesta sessão (um commit por passo):** M16.4 (`047e047`), T.1 (`ad355eb`), M14.2 (`802bb61`), M14.1 (`d45ab03`),
e2e do F4 mais firme, `tools/publicar-teste.sh`. Pacote novo na `teste-binarios` (um commit órfão com Linux, Windows e o
`KOFstation-novo.apk`; os executáveis e o APK foram conferidos com `grep` pelo código novo antes de publicar). Essa branch
tinha o pacote com as tentativas do PS2 (`rascunho/ps2-liso`): foi substituída pelo pacote sem elas.
**Pausado por decisão do Marcelo:** M16.5 (otimização do PS2). **Não mexi** nos ⏸ de M9–M13, M15 e PS2 (só preparei os testes na
lista "Pra você testar" do SITUACAO). **T.2 não foi feito** (fica pra ele decidir).
**Não feito, com motivo:** M14.3, M14.4 e M14.5 (SAF/biblioteca em Java sem aparelho, NDK ausente, atualizador sem canal
de publicação do APK): `docs/ANDROID.md` tem a ordem sugerida. A lista completa do Avançado ("tudo que o núcleo
declara") também ficou pra depois (precisa de um comando que abra o núcleo só pra listar).
**Próximo passo:** o Marcelo faz os testes da lista "Pra você testar" (T-M16.4 e T-CELULAR primeiro) e diz o que quebrou.
Depois: M14.3 (Java com teste de JVM) e, com o NDK, M14.4.

## 2026-11-14 · M14.1 · casca do Android e o app novo dentro (APK)

**Pedido:** M14.1 a M14.5; sem o Android SDK, fazer o que der e dizer o que faltou.
**Ambiente:** `dl.google.com` é bloqueado (sem SDK/NDK), mas o `apt` tem as ferramentas que o antigo já usava (aapt,
dalvik-exchange, apksigner, zipalign, `android-23.jar`, `org.json`): instalei e o APK monta e assina aqui. **NDK não existe**.
**Feito:** `platform/android.ts` (adaptador `Backend` sobre `window.KofAndroid`, base64, erro do contrato, com teste);
`escolher.ts` usa ele dentro do APK; `ligarModoCelular` liga o modo celular sozinho; `window.__kofVoltar` pro botão Voltar.
`android/`: `Comandos.java` (Java puro: app.*, log.write, config.*, store.* com os mesmos nomes de arquivo do Rust,
nativo.disponivel vazio, library.root.get sem pasta; o resto devolve `UNSUPPORTED` dizendo qual passo falta), `Ponte.java`,
`MainActivity.java` (WebView em `https://kofstation.local/` servindo `assets/web` com COOP/COEP, seletor de arquivos, Voltar,
tela cheia), `AndroidManifest.xml`, `construir-apk.sh` (sem lambda: o dx do minSdk 24 não aceita invokedynamic), chave de
teste `kofstation-teste.keystore` (como a do antigo; `applicationId` próprio `dev.kofstation.android`). `docs/ANDROID.md`.
**Medido / conferido:** `android/testar.sh`: 22 verificações de JVM dos comandos (config, lojas, erros, nomes de arquivo
iguais aos do Rust). `unit` do adaptador (6). e2e `android-simulado.spec.ts` com uma ponte KofAndroid falsa em JS: o app liga no
modo celular sozinho, abre um jogo, o save vai pra loja da "casca" (`sram.KOFSAVE.32768`), a biblioteca sem pasta não
quebra. APK de 8,5 MB compila contra o `android.jar`, o `apksigner verify` passa (v2/v3) e o `aapt dump badging` mostra
`dev.kofstation.android`, minSdk 24, ícone da xícara.
**Não feito (e por quê):** M14.3 (pasta de ROMs por SAF: `library.*`/`file.*` em Java é grande e não dá pra provar sem
aparelho), M14.4 (precisa do NDK), M14.5 (depende de publicar o APK junto das versões e de decidir a verificação). Tudo
anotado no ROADMAP e em `docs/ANDROID.md`, com a ordem sugerida.
**Onde parou:** ⏸ o Marcelo instala o APK (T-CELULAR). Próximo código: M14.3 em Java com teste de JVM.

## 2026-11-14 · M14.2 · controle de toque e layout do celular

**Pedido:** M14.2 (controle de toque dos 6 modelos e o layout), feito e testado no navegador com tela de celular.
**Feito:** `?celular=1` (ou aparelho de toque Android, ou o APK) liga a classe `celular` no `<html>` (`app/celular.ts`).
`styles/celular.css` é o `android.css` do antigo (a marcação do novo usa os mesmos ids e classes). `components/ControleDeToque.tsx`
é o `#ctl` do antigo em React: multitoque por `pointerId`, deslizar troca de botão, direcional com zona morta que vira
analógico nos consoles que têm (misto no PS1, puro no N64/PS2), ☰ = menu rápido, ⏪ = rebobinar, ⏩ = turbo, rótulos por
console (Mega Drive A/B/C, PS1 ✕○□△, N64...). `stores/toque.ts` guarda os dedos e as preferências (chaves do antigo ctlModelo,
ctlTam, ctlOpa, ctlVibrar, ctlCanhoto); `hooks/useEntradaDoJogo` soma o toque ao teclado do J1. Tela Controles no
celular = galeria dos 6 modelos com miniatura, tamanho, transparência, vibrar, canhoto e "restaurar o padrão"
(`screens/Teclas/ControlesDeToque.tsx`); menu rápido ganha 🏠 Início e 🎮 Controle virtual.
**Medido / conferido:** e2e `celular.spec.ts` com viewport de celular (390×780 e 844×390, toque): o controle aparece só
jogando; A+Start juntos (multitoque), soltar um mantém o outro, deslizar de B pra Y; diagonal do direcional e zona morta;
☰ abre o menu rápido; os 6 modelos mudam e ficam guardados depois de recarregar; deitado o direcional fica à esquerda
da imagem e os botões à direita, sem cobrir. Prints: `apps/desktop/test-results/celular-*.png`. `pnpm check` e `pnpm e2e` (57 ok).
CI do T.1 verde no Linux e no Windows; o do M16.4 (run 110) falhou só no e2e do F4 (carregamento do painel de imagem
sob carga), que passou de novo no run seguinte: instabilidade já vista, sem relação com o commit.
**Deu errado / aprendido:** um `usarJogo(...) && usarTelas(...)` chamou o hook condicionalmente e derrubou o App
("reading 'length'" do React): hooks nunca em curto-circuito. E `prettier --write` rodado dentro de `apps/desktop` ignora o
`.prettierignore` da raiz e reformatou o `estilo.css` do antigo: rodar sempre da raiz.
**Onde parou:** M14.1 (casca Java servindo o app novo).

## 2026-11-14 · T.1 · paridade fechada com testes contra o antigo

**Pedido:** fechar os itens não verificados do `PARIDADE.md`, com teste automático contra o `kofstation-old` (só leitura)
onde der.
**Feito:** (1) `apps/desktop/src/testes/paridade-antigo.test.ts` (KOF_ANTIGO): o menu rápido tem os mesmos itens na mesma
ordem do `ITENS_RAPIDO`; cada aviso literal do antigo (53) existe no novo ou está numa lista de diferenças com o motivo.
O teste achou 2 mensagens que faltavam e elas foram copiadas ("o menu rápido é só durante o jogo"/"abra um jogo
primeiro", "este jogo vai abrir sempre com esse jeito"). (2) `packages/engine/test/paridade-sistemas.test.ts`: lê o
`nucleo.js` do antigo e compara sistemas, extensões, núcleo, tamanho de imagem, proporção, opções fixas, analógico e
BIOS. (3) `contraste.test.ts`: as cores dos 126 temas são idênticas às do antigo; contraste WCAG medido (10 pares já
eram baixos no antigo: lista fixa, que só pode encolher). (4) e2e novos: `paridade-teclas` (Tab = turbo ×1,8 ou mais,
F11, proporções 4:3/8:7/esticar), `biblioteca-grande` (3.000 jogos, CPU 4× mais lenta: 433 ms até a primeira linha,
150 linhas no DOM), `nucleo-sob-demanda` (nenhum núcleo no Início; só o do console do jogo).
**Decidido:** os itens que só o Marcelo verifica ganharam o estado ⏸ no PARIDADE e um teste com passo a passo na lista
"Pra você testar" do SITUACAO (T-JOGO, T-OUVIR, T-NEOGEO, T-PS2, T-REDE, T-INSTALAR, T-DIAG). "Estado salvo com outro
núcleo de SNES" ficou ➖ (não se aplica sem o núcleo Kof). Dois textos do PARIDADE estavam velhos (cartão BIOS do
Início e lista de BIOS da abertura já existem e têm e2e): corrigidos.
**Medido / conferido:** `KOF_ANTIGO=… pnpm test` verde (domain 145, engine 56+1, app-core 34, desktop 14);
`pnpm e2e` 51 ok + 1 ignorado.
**Onde parou:** M14 (celular).

## 2026-11-14 · M16.4 · opções de emulação de todos os consoles

**Pedido:** juntar a tarefa B (`agente-b/opcoes-nucleo`), fazer a tela (DIAGNOSTICO.md §4) e catalogar o N64 e os
consoles em WebAssembly.
**Feito:** (1) merge da branch do B (catálogo PS1/PS2, teste Rust contra os `.so`). (2) `domain/opcoes-camadas.ts`: as
camadas geral → console → jogo (puro, com teste): `resolverOpcoes`, `opcoesParaNucleo`, `compararOpcoes` ("na hora"
× "ao reabrir"), ajustes que não mexem no objeto antigo. (3) `stores/emulacao.ts`: guarda tudo na chave `emuOpcoes` da
configuração; ao abrir o jogo as opções entram no núcleo (nativo e WebAssembly); mudar com o jogo aberto manda o que
vale na hora (`Comando::Variavel` / `opcoes` do Worker) e avisa o resto. (4) `screens/Estados/OpcoesDoConsole.tsx`:
perfil geral, console, "valer para o console todo ou só este jogo", perfil do console/jogo, opções por grupo com o
selo ⚡/↻, **Avançado**, "voltar ao perfil" e "apagar os ajustes". (5) Catálogo dos WebAssembly em
`domain/opcoes-nucleo-wasm.ts`: N64 (12), SNES (5), GB (6), NES (5), Mega Drive/SMS/GG (5), GBA (6).
**Medido / conferido:** os núcleos WebAssembly do antigo não expõem as opções que declaram (a ponte ignora o
`SET_VARIABLES`). `tools/opcoes-wasm.mjs` varre a memória estática de cada módulo (tabelas `retro_core_option_v2`) e
gera `packages/contracts/fixtures/opcoes-wasm.json` (chave, valores e padrão **de verdade**); o teste
`opcoes-nucleo-wasm.test.ts` falha se o catálogo disser outra coisa. Isso mostrou, por exemplo, que o Mupen64 do
WebAssembly só tem GLideN64 e interpretador (sem recompilador, sem Angrylion). Novo e2e `opcoes-emulacao.spec.ts`
(perfis, ajuste fino, Avançado, persistência depois de recarregar). `pnpm check`, `pnpm e2e` (46 ok),
`cargo clippy`/`fmt` ok, `cargo test --workspace --no-fail-fast` ok (só o `pcsx` com SIGILL, sabido).
**Decidido:** o Equilibrado é sempre o que o app já usava (testado), então quem não mexer em nada não percebe
diferença. As opções dos WebAssembly dizem sempre "vale ao reabrir" até alguém medir quem relê. O "Avançado" mostra o
que o catálogo marcou como avançado; **a lista completa do que o núcleo declara (`SET_VARIABLES`) fica pendente**:
precisaria abrir o núcleo só pra listar (o PS1/PS2 têm `Nucleo::opcoes_declaradas`, falta um comando no `kof-app`).
**Deu errado / aprendido:** o container não tinha `libasound2-dev` (instalei com apt pra compilar o `kof-app`).
**Onde parou:** pacote novo na `teste-binarios` a fazer (fim da etapa), depois T.1 (paridade).

## 2026-11-14 · M16.5 · otimização do PS2 pausada por decisão do Marcelo

**Pedido:** terminar o roadmap até o fim (M16.4, T.1, M14), um passo depois do outro, sem parar nos checkpoints; o que
depender do Marcelo vira ⏸ e entra na lista "Pra você testar" do `docs/SITUACAO.md`. T.2 fica pra ele decidir.
**Decidido:** a **otimização do PS2 (M16.5) está pausada por decisão do Marcelo.** As tentativas ficam na branch
`rascunho/ps2-liso` (ritmo pelo relógio como o PCSX2, medição de CPU fora do laço, MTVU ligado) e **não devem ser
juntadas**. Ninguém mexe em otimização de PS2 até ele reabrir o assunto.
**Onde parou:** começando pelo M16.4 (juntar `agente-b/opcoes-nucleo` e fazer a tela), depois T.1 e M14.

## 2026-11-10 · Conferência · o C entrou, o SotC continua não liso

**Pedido:** o Marcelo jogou o pacote com a tarefa C: o Shadow of the Colossus **continua não liso** (no antigo roda
liso). Limites do Codex e do Claude acabando: retomar no sábado.
**Conferido:** a junção do C pelo Codex está certa (`filho.rs` manda todo quadro; `canal.rs` fila de até 6; fila por
vsync comum em `engine/fila-de-quadros.ts`); CI verde no Linux e no Windows (`1f91825`, run 104). B (`agente-b/opcoes-nucleo`)
ainda **não** junto.
**Conclusão:** o quadro perdido na origem era real (60% → 0 no teste) mas não era o que o olho do Marcelo vê, ou não
era o único. Sem o `.zip` do 🩺 não dá pra saber o culpado.
**Onde parou (sábado):** 1) o Marcelo manda o `.zip` do 🩺 do SotC (Ajuda → 🩺, jogar 5 min, Exportar) e diz **se no
antigo o PS2 abre numa janela própria ou dentro da página do app**; 2) se o culpado for núcleo/CPU: opções (B, M16.4);
se for ritmo/página: o **modo janela própria** como o antigo (D36), que é o caminho mais provável pra "liso igual ao
antigo"; 3) a memória do ZoE2 com a saída do `journalctl` (comando no `CONTINUAR.md`).

## 2026-11-09 · M16 · ritmo do PS2/PS1 nativo (tarefa C)

**Pedido:** continuar de `docs/agentes/CONTINUAR.md`, integrar o que chegou na branch `claude/busy-ritchie-wrvk8h` e enviar, sem PR.
**Feito:** revisada e integrada `agente-c/ritmo-nativo` (merge `d7e57d3`). `filho.rs` publica cada quadro; `canal.rs` mantém fila limitada; `JogoNativo` e o wasm usam `FilaDeQuadros` por vsync.
**Medido / conferido:** teste `ritmo`: 284 quadros rodados, 0 sem envio. `pnpm check` passou; e2e passou com 44 testes (1 ignorado) usando dois workers. Formatação e clippy passaram. Na suíte Rust completa, todos os alvos passaram exceto `opengl`, que entregou 64 quadros de 120 sob este backend gráfico e falhou no limite do teste; os testes `pcsx`, `lrps2`, `processo` e `ritmo` passaram. Build Linux e `tools/testar-ps2.mjs`: DVD sintético de 4,3 GB abriu, núcleo ficou vivo e a memória da página ficou em 753 MB. Pacote Linux SHA-256 `da4cf8bb…`, publicado em `teste-binarios` (`65bdcf0`). Os artefatos Windows foram preservados da versão anterior e estão marcados como sem C.
**Onde parou:** ⏸ o Marcelo testa SotC com diagnóstico e envia o `.zip`; repete com ZoE2 até o erro de memória. Depois integrar B e iniciar M16.4.

## 2026-11-08 · Passagem · onde parou pro próximo orquestrador (Codex local)

**Pedido:** o limite do Marcelo estava acabando; salvar exatamente onde parou pra continuar pelo Codex.
**Feito:** `docs/agentes/CONTINUAR.md` (o que ele quer hoje: SotC liso; o que foi descartado na falta de memória do
ZoE2: DVD na RAM, opções, envio de imagens, troca de resolução; a causa achada das engasgadas; os passos em ordem).
Tarefa C (ritmo do nativo) e B (opções) disparadas em sessões na nuvem (branches `agente-c/ritmo-nativo`,
`agente-b/opcoes-nucleo`). `tests/lrps2.rs` garante `need_fullpath` (`eb4980a`).
**Onde parou:** ver `docs/agentes/CONTINUAR.md`, "Próximos passos".

## 2026-11-08 · Orquestração · tarefa A junta (ritmo do WebAssembly) · B não chegou

**Pedido:** o Marcelo rodou os dois agentes (Sonnet, sessões na nuvem; o Codex pelo `tools/agentes.sh` não enviou
nada, causa ainda não vista: falta o log) e pediu pra conferir.
**Feito:** revisada e junta a branch do A (`claude/fervent-brahmagupta-zq12qz` → `cbe109e`): a causa era a falta de
fila entre a chegada dos quadros do Worker (em rajadas, pelo `setTimeout(4)` + ritmo pelo som) e o vsync; agora
`engine/jogo.ts` guarda os quadros e solta um por vsync, com 1 quadro de folga (máx. 3 na fila). `tools/medir-ritmo.mjs`
mede antigo × novo com a mesma ROM gerada.
**Medido / conferido (aqui):** 15 s, Game Boy, 60 Hz: novo 0 pulados e 17 repetidos/min (antes ~450 pulados), antigo
0 e 0; p50/p95/p99 16,67 nos dois. `pnpm check` e 44 e2e verdes. Custo: ~1 quadro (16 ms) a mais de atraso de imagem
(a folga da fila); o laço da fila roda antes do desenho no mesmo vsync (registrado primeiro). Num jogo de luta pode
pesar: medir a latência do botão até a tela antes de dar como fechado (fica pro M16.5).
**Não afeta o PS2** (nativo, outro caminho): a tarefa era só dos consoles em WebAssembly.
**Onde parou:** **B** (catálogo de opções) não chegou no GitHub: pedir ao Marcelo a branch ou rodar de novo. ⏸ o
Marcelo grava o SotC e o ZoE2 com o pacote da `teste-binarios` (o pacote ainda não tem o A: sai no próximo).

## 2026-11-08 · M16.1–M16.3 · medidor quadro a quadro, F3 com gráfico e modo diagnóstico

**Pedido:** fazer o M16 na ordem, sem parar nos checkpoints até o M16.3 (lá o Marcelo grava o Shadow of the
Colossus). No meio: "o PCSX2 está em WebAssembly?" (não: o PS2 é só nativo, `soNativo` em `engine/nucleos.ts`; o
"mesmo formato no Worker do wasm" é pros outros consoles); "que diabos é o kof-nativo, deixa o núcleo separado" (é o
suporte que roda o `.so`/`.dll` num processo filho; o núcleo segue arquivo à parte, vindo pelo manifesto, D32). Contou
que **o antigo roda bem mais liso** e que o **Zone of the Enders 2 deu problema de memória**. Pediu pra salvar a sessão
e estimar o que falta.
**Feito:**
- M16.1: `domain/desempenho.ts` (p50/p95/p99, fps suavizado como o PCSX2, engasgo > 1,5× o quadro ou falta de som, o
  culpado: núcleo, leitura da placa, envio, página, som ou ritmo); `kof-nativo/src/medidor.rs` (600 quadros sem alocar)
  e `cpu.rs` (CPU por linha: `/proc/self/task` no Linux, `GetThreadTimes` no Windows; **o Windows só foi conferido pelo
  CI**); aviso `desempenho` com `porQuadro` (6 números/quadro em µs) e `cpu`, opcionais nos dois lados do contrato +
  fixtures; o Worker do wasm manda o mesmo `porQuadro`; `app-core/desempenho.ts` (`MedidorDaSessao`) junta o tempo de
  desenho da página a cada quadro mandado.
- M16.2: F3 com p50/p99, pior quadro, engasgos/min com o culpado, CPU por linha e o gráfico dos últimos 600 quadros.
- M16.3: `domain/diagnostico.ts` (CSVs com ponto no decimal, resumo da sessão em memória fixa por histograma,
  `resumo.txt`); `app-core/diagnostico.ts` (`GravadorDiagnostico`: lotes a cada 5 s); Rust `kof-app/src/diag.rs`
  (`diag.maquina|abrir|anotar|listar|exportar`, só a pasta `<dados>/diagnostico`, nomes conferidos, limite de 20 MB por
  sessão, apaga as de 30 dias, tira a pasta do usuário dos logs); `kof-files::zip::montar` (zip com deflate, conferido
  pelo `zipfile` do Python); placa de vídeo do núcleo (`GL_RENDERER`) no aviso `pronto`; janela Ajuda → 🩺 Modo
  diagnóstico, selo 🩺 na barra, resumo num aviso ao fechar/trocar de jogo, F9 baixa o `.zip` junto quando ligado.
**Medido / conferido:** `pnpm check` (domain 77, app-core 33 testes), testes Rust novos (medidor, cpu, zip, diag) e o
`processo.rs` (o `porQuadro` chega com 1 registro por quadro), e2e `jogo.spec` (F3 com p99 e gráfico) e o novo
`diagnostico.spec` (liga, grava, resume, exporta). Primeiro número de verdade: no Game Boy (wasm), **p50 18,75 ms com
o certo 16,74**: o laço do Worker (setTimeout de 4 ms + ritmo pelo som) solta quadros desiguais. Suspeita pro "antigo
mais liso": olhar isso no M16.5 com o antigo lado a lado.
**Deu errado / aprendido:** um commit saiu com o Prettier reclamando (o `| tail` escondeu o código de saída: rodar o
`pnpm format:check` sem pipe). O `cargo test` todo para no `pcsx` (SIGILL do container, já sabido): usar
`--no-fail-fast` pra ver o resto.
**Orquestração (pedido no fim):** o Marcelo passa a usar este agente como orquestrador e dois outros (Codex etc.) com
tarefas fechadas: `docs/agentes/LEIA-ME.md` (regras: branch própria a partir desta, só os arquivos da tarefa, não
mexer em JORNAL/ROADMAP/README, relatório no fim do arquivo da tarefa), **A** `A-ritmo-wasm.md` (branch
`agente-a/ritmo-wasm`) e **B** `B-opcoes-nucleo.md` (branch `agente-b/opcoes-nucleo`); aviso no topo do AGENTS.md.
**Onde parou:** M16.1–M16.3 feitos e enviados; CI do M16.1/M16.2 verde no Linux e no Windows (o `cpu.rs` do Windows
compila e passa lá). Pacote novo na `teste-binarios` (`4058e25`), com o executável do pacote passando no
`tools/testar-ps2.mjs`. **⏸ M16.3:** o Marcelo grava o SotC e o ZoE2 (o erro de memória: texto do aviso, o `.zip` e
quanto de RAM tem). **Próximo do orquestrador:** revisar as branches dos agentes A e B quando o Marcelo avisar; depois
M16.4 (a tela das opções em cima do catálogo do B) e M16.5 (prioridade: a memória do ZoE2; o ritmo do wasm é do A).

## 2026-11-08 · Planejamento · M16 (desempenho, diagnóstico, opções de emulação) · onde parou pra próxima sessão

**Pedido:** o Marcelo testou o PS2 (Shadow of the Colossus "rodou relativamente bem, umas engasgadas aqui e ali") e
pediu, antes de corrigir, medição de verdade: modo diagnóstico que grava logs e estatísticas, e opções de emulação do
PS1 em diante. "Não basta rodar, tem que rodar bem." Etapa essencial, no meio da migração, antes do M14. Pediu pra
pesquisar quem já faz, desenhar a arquitetura e parar (contexto grande): a implementação fica pra próxima sessão.
**Feito:** só planejamento. `docs/DIAGNOSTICO.md` (pesquisa no PCSX2 `PerformanceMetrics.cpp` e no DuckStation
`performance_counters.cpp` + a arquitetura), M16.1–M16.5 no ROADMAP (antes do M14), D37.
**Decidido:** D37 (medir antes de otimizar; estatística pura no `domain`; gravação pelo Rust em `diag.*`).
**Onde parou:** **próximo é o M16.1** (medidor quadro a quadro), na ordem do `DIAGNOSTICO.md`:
1. `domain/desempenho.ts` primeiro (puro, com teste): percentis p50/p95/p99, fps suavizado, engasgo (> 1,5× o tempo de
   um quadro ou falta de som) e o culpado (a etapa que mais passou do normal dela).
2. `crates/kof-nativo/src/medidor.rs`: histórico de 600 quadros sem alocar; o `filho.rs` já mede núcleo, leitura
   (`gl::LEITURA_US`) e imagem por segundo: passar a guardar por quadro e mandar o bloco do segundo no aviso
   `desempenho` (campo novo, opcional, nos dois lados do contrato e nas fixtures de `packages/contracts/fixtures`).
3. CPU por linha (Linux `/proc/self/task/*/stat`, Windows `GetThreadTimes`), agrupada pelo nome da linha.
4. O mesmo formato no Worker do WebAssembly (`packages/engine`) e o tempo de desenho/chegada na página.
Depois M16.2 (F3 com gráfico), M16.3 (modo diagnóstico; ⏸ o Marcelo grava o SotC e manda), M16.4 (opções de
emulação), M16.5 (otimizar pelos relatórios). Pergunta em aberto pro Marcelo: os engasgos do SotC foram na primeira
vez que aparece um lugar/efeito (shader sendo montado) ou espalhados?
**Também esperando o Marcelo:** a chave do atualizador (SITUACAO, "Pra você fazer"), o teste da rede com o celular,
os pacotes do Linux/Windows, e o PS2 nos outros dois jogos (Zone of the Enders 2, Gran Turismo 4) com print do F3.
**Ambiente da próxima sessão:** `pnpm install`, `KOF_NATIVOS=todas pnpm nucleos` (traz o LRPS2), e pros testes
nativos/PS2: `sudo apt-get install -y libasound2-dev genisoimage libegl1 libegl-mesa0 libgl1-mesa-dri`. O teste
`kof-nativo --test pcsx` morre com SIGILL em container (CPU), no CI passa. Pros testes de paridade da rede:
`git clone https://github.com/Marcelao98/kofstation-old` (só leitura) e `node tools/testar-rede.mjs <pasta>`.

---

## 2026-11-08 · Correção · a página que às vezes não abria (tiny_http)

**Pedido:** o CI quebrou de novo com a página sem carregar (agora no teste dos Aparelhos); o Marcelo pediu pra tentar de
novo.
**Causa:** bug do `tiny_http` 0.12.0 (`TaskPool::spawn`): uma linha acordada que ainda não pegou a tarefa segue contada
como "esperando"; com conexões chegando juntas, uma ia pra fila sem linha pra ela e ficava parada enquanto a outra
conexão keep-alive do Chrome vivesse. Era o "arquivo `.js` sem resposta" do JORNAL de 07/11 e do M13 (não era o disco).
**Feito:** cópia do crate em `third_party/tiny_http` com a correção de uma linha (só vai pra fila se tem mais linhas
esperando do que tarefas na fila), via `[patch.crates-io]`; `tools/testar-conexoes.mjs` (no CI); o teste do PS1 não
tenta mais de novo (a causa saiu). `pnpm nucleos` com 3 tentativas por download (o GitHub respondeu 504 no CI).
Teste do OpenGL só obrigatório onde há placa (o Windows do CI não tem).
**Medido / conferido:** 30 conexões keep-alive juntas × 5 rodadas: **5 de 150 sem resposta antes, 0 depois** (duas
vezes, e no executável do pacote). CI verde no Linux e no Windows com todos os testes de ponta a ponta.
**Onde parou:** o mesmo da entrada do PS2 (abaixo): ⏸ o Marcelo joga PS2 com o pacote novo da `teste-binarios`.

---

## 2026-11-08 · PS2 (N.9/M12) · LRPS2 com OpenGL sem janela, o sistema PS2 no app

**Pedido:** o Marcelo trocou a ordem: PS2 antes do M14 ("quero jogar PS2, eu uso mais PC"), "liso igual ao PCSX2", no
jeito mais eficiente, num núcleo separado como os outros. Aprovou o plano P.1–P.8 e mandou executar tudo.
**Feito:** P.1 `pcsx2_libretro` do `publicado/nativo/` do antigo no manifesto (o `.so` vem gzipado: o `pnpm nucleos`
descompacta e confere), `empacotar.sh` leva todos os nativos. P.2/P.3 `crates/kof-nativo/src/gl.rs`: OpenGL sem
janela (Linux EGL: tela do usuário ou surfaceless; Windows: janela escondida + WGL, só compilado aqui), framebuffer com
profundidade/estêncil, `SET_HW_RENDER`/`GET_PREFERRED_HW_RENDER`, `context_reset` depois do `load_game`,
`context_destroy` ao fechar, leitura assíncrona (3 PBOs + cerca). P.4 o LRPS2 abre no frontend novo (teste com BIOS
falsa: só a ROMDIR + um laço no vetor de reset, e DVD gerado). P.5 `NUCLEOS.ps2` (só nativo), cabeça do DVD (64 KB; o
sistema pelo SYSTEM.CNF lido aos pedaços), DVD arrastado vai pra Kof Games aos pedaços, BIOS do PS2 obrigatória (vai
pra `sistema/pcsx2/bios`), mensagens quando falta o núcleo ou o jogo está fora da Kof Games. P.6 o aviso de desempenho
traz o tempo do núcleo, da leitura da placa e do quadro pra página; o F3 mostra. P.8 pacote na `teste-binarios`.
**Decidido:** D36 (LRPS2 do antigo, OpenGL sem janela, imagem pela página; modo direto só se os números pedirem).
**Medido / conferido:** `tests/opengl.rs` (núcleo de teste que desenha com OpenGL core 3.3: imagem virada certa, 120 de
120 quadros entregues, no máximo 2 de atraso, 0,64 ms por quadro no Mesa sem placa); `tests/lrps2.rs` (o LRPS2 de
verdade: abre, pede a placa, 60 quadros, ~958 amostras de som por quadro); `tools/testar-ps2.mjs` (no CI): app de
verdade e o executável do pacote, DVD de 4,3 GB (esparso) pela biblioteca, processo vivo, página 339 → 339 MB,
`kofstation` 17 MB. `check`, `check:rust`, 43 e2e verdes.
**Deu errado / aprendido:** (1) com a BIOS falsa só de zeros o PCSX2 cai (o antigo anotava o mesmo no RetroArch): um
`j 0xBFC00000` no vetor de reset deixa ele parado e o resto do caminho testável. (2) PS2 agora "roda": a BIOS
obrigatória fazia a tela de BIOS abrir antes de avisar que falta o núcleo; o aviso do núcleo vem primeiro. (3) Imagem
de verdade só com BIOS de verdade (a falsa não liga o vídeo do PS2): **não vi um quadro de PS2 aqui**.
**Onde parou:** ⏸ Marcelo: BIOS + um jogo de verdade (Shadow of the Colossus) no pacote novo, print do F3 numa cena
pesada, e se possível o mesmo jogo no PCSX2 sozinho pra comparar. Com os números: decidir o P.7 (modo direto) e
ajustar opções. Também pendente: cartão de memória do PS2 no backup `.kofsave` (hoje fica em
`<dados>/nativo/saves/ps2`, persistente), conferir no Windows (WGL nunca rodou), estados do PS2 com jogo de verdade.
Depois: M14 (celular), plano na entrada do M13.

---

## 2026-11-08 · Etapa M13 · rede entre aparelhos, celular como controle e Jogar no PC

**Pedido:** o mesmo lote ("segue até o M14"): M13 reaproveitando o `kofrede.c` e com o mesmo protocolo do APK atual.
**Feito:** M13.1 `crates/kof-net`: `kofrede.c` + Monocypher do antigo sem mudança (`third_party/kofrede`) por FFI
(`ffi.rs`), o `kofservico.c` em Rust (`servico.rs`: UDP achar, TCP parear/conectar, pareados em arquivo, ping 15 s,
religar PC×PC), a WebSocket da página (`pagina.rs`, token ou o modo do antigo) e o `kof-rede` (o serviço sozinho com as
opções do kofservico). M13.2: o `kofstation` abre a rede junto (`crates/kof-app/src/rede.rs`, `rede.ligar`), tela
📡 Aparelhos (`screens/Aparelhos`, QR com o mesmo gerador do antigo, código, lista, nome, procurar), cartão do Início
(`app-core/rede.ts`, `stores/rede.ts`, backend de teste com serviço de mentira). M13.3: `domain/celular.ts` (formatos do
antigo) e `stores/celular.ts`: celular pela rede (canal `pad`, `pad-ok` com jogador e console) e pelo servidor do APK
(Arquivo → 📱 Celular como controle, senha de 4 números, religa sozinho), os celulares entram nos Jogadores. M13.4:
`stores/transmissao.ts` (o `jogarpc.js`): pedir/oferta/resposta/fim pelo canal `jogo`, imagem crua em pixels inteiros,
H.264, 12 Mbps, som no celular (`Jogo.somPraTransmitir`, o PC fica mudo; no PS1 nativo vai sem som), canal de dados com
os 6 bytes, ping, menu do PC no celular, 💾⟲🏠, 📱 Levar pro celular / 📺 Voltar pra TV no menu rápido, a navegação
por controle aceita o celular, sair da janela não pausa enquanto transmite.
**Decidido:** D35 (FFI + serviço em Rust, mesma API JSON, WebSocket da página com token).
**Medido / conferido:** `tools/testar-rede.mjs` (CI): o `servicos.cjs` do antigo contra o novo; novo × `kofservico`
antigo nos dois papéis; o `celular.cjs` do antigo (o `Rede.java` do APK + `libkofrede.so`) contra o novo — tudo verde.
`tools/testar-aparelhos.mjs --antigo` (CI): app de verdade + Chromium, outro aparelho pareia digitando o código da
tela e aparece 🟢; o `ControleServidor.java` do APK conecta com a senha e o A acende na tela Jogadores. e2e novos:
`aparelhos.spec.ts`, `jogar-no-pc.spec.ts` (um "celular" WebRTC noutra página recebe a imagem vermelha, manda botão,
ping e menu). 43 e2e, `check`, `check:rust` (menos o SIGILL do pcsx neste container) verdes.
**Deu errado / aprendido:** (1) importar stores no topo do `main.tsx` cria elas antes da configuração carregar (o tema
voltava pro padrão ao recarregar): as da rede entram depois do `carregarConfig`. (2) O MSVC não tem os `__builtin_` que
o `kofrede.c` usa: o `build.rs` define pras funções do C no Windows (o arquivo continua igual). (3) **Aberto:** o
`testar-nativo` às vezes estoura o `page.goto` (1 em ~4 aqui): um arquivo da página (`react-*.js`) fica sem resposta do
servidor HTTP local logo depois dos 600 MB de CD gravados; sem a carga de disco não reproduz (0 em 12). O teste tenta de
novo uma vez; investigar o `tiny_http` (ver se um pedido fica preso atrás de outro na mesma conexão).
**Onde parou:** ⏸ Marcelo: testar a rede com o celular (abaixo e no SITUACAO), a chave do atualizador e os pacotes.
**Próximo: M14** (não começado), plano: M14.1 adaptador `android` (`platform/android.ts`) implementando o `Backend`
sobre a ponte `KOFnesApk` da casca Java atual (CASCA 14; a página nova vai nos assets e no `publicado/android` da
casca, sem mexer no `kofstation-old`: o APK novo é montado aqui com a casca copiada, como os núcleos); as lojas e a
config no celular ficam no IndexedDB/OPFS (sem Rust lá) com a mesma interface; a rede pela `KOFnesApk.redeCmd` +
`window.__rede` (o mesmo `CanalRede`). M14.2: controle de toque (6 modelos do `android.css`/`android.js`) e layout do
celular. M14.3: pasta de ROMs (`Pasta.java`). M14.4: PS1/N64 nativos pela ponte (`Ps1Jogo`/`N64Jogo`). M14.5:
atualizador do APK (`Atualizador.java` lendo um manifesto nosso). Tudo precisa do Marcelo no celular de verdade.

---

## 2026-11-07 · Etapa M15 · atualizador assinado, pacotes do Linux e do Windows, lado a lado com o antigo

**Pedido:** "segue até o M14", sem parar em cada checkpoint; parar só no que só o Marcelo faz (chave, celular, Windows).
**Feito:** M15.1: o `kofstation` aplica a versão baixada no começo do `main` (executável trocado → abre o novo e sai),
`app.atualizacao {procurar}` (procura numa linha separada; a página pergunta até terminar), versão do `versao.txt` no
`app.info` (antes era sempre 0.1.0, então o "✨ atualizado!" nunca aparecia), `nao-atualizar` e `fonte.txt` como no
antigo (`crates/kof-app/src/atualizacao.rs`); página: menu "🔄 Procurar atualização" e procura sozinha 10 s depois de
abrir (`stores/atualizacao.ts`, `app-core/atualizacao.ts`); `tools/manifesto.mjs` (gera a chave; monta e assina; arquivo
igual ao da versão anterior aponta pra Release antiga); workflow `versao.yml` (Linux + Windows, empacota, assina,
Release `v<data>` como "latest"; sem o secret só compila). M15.2: `kofstation --instalar/--desinstalar`
(`kofstation-novo.desktop`, `src/instalar.rs`), ícone da xícara do antigo (`tools/icone.py`), `tools/pacote-linux.sh`
(`.tar.gz` com LEIA-ME). M15.3: `tools/pacote-windows.sh` + `tools/pacote/instalador.nsi` (NSIS sem administrador em
`%LOCALAPPDATA%\Programs\KOFstation`, atalhos "KOFstation novo", desinstalador que não toca em saves) e o `.zip`.
M15.4: nomes e pastas separados do antigo ("KOFstation novo"; dados em `KOFstation/`, o antigo em `KOFnes/`).
**Decidido:** D34 (atualizador próprio, Ed25519 com o `ring`, troca na próxima abertura, publicação a cada envio na
`main`).
**Medido / conferido:** `crates/kof-atualiza/tests/ciclo.rs` (5 testes: troca, núcleo velho apagado, assinatura de outra
chave, manifesto mexido, arquivo alterado, caminho `../`); `tools/testar-atualizacao.mjs` (no CI): o `kofstation` de
verdade com chave de teste, versão 2 servida por HTTP local com os 13 núcleos reais (28 MB): baixa, troca o
executável na abertura seguinte, apaga o núcleo que saiu, `app.info` diz "2", depois "em dia"; arquivo alterado e
assinatura falsa recusados sem deixar nada pela metade. Pacotes: `.tar.gz` 13,9 MB, instalador 11,6 MB, `.zip` 15 MB;
o `.tar.gz` baixado da `teste-binarios` extrai, `--instalar` grava o `.desktop` certo e o app serve os núcleos.
`check`, `check:rust` e 40 e2e verdes.
**Deu errado / aprendido:** neste container o teste `kof-nativo --test pcsx` morre com SIGILL (CPU do container; não
mexi no kof-nativo, no CI do GitHub ele passa). O instalador do Windows só foi montado (makensis no Linux), não rodado.
**Onde parou:** ⏸ Marcelo: (1) **criar a chave** (comando no SITUACAO, "Pra você fazer"); (2) instalar o pacote do
Linux; (3) Windows quando der. Seguindo pro M13 (rede).

---

## 2026-11-07 · M15.1 começado · onde parou pra próxima sessão

**Pedido:** o Marcelo autorizou seguir os próximos (M15 em diante) e pediu pra deixar tudo salvo: a sessão ficou grande e
ele vai abrir outra.
**Feito:** só o começo do M15.1: o crate `crates/kof-atualiza` (compila, clippy limpo, 2 testes de unidade; **ainda não
ligado ao `kofstation`**): manifesto por plataforma (`caminho → {tamanho, sha256, url}`), assinatura Ed25519 conferida com
o `ring` (já vinha pelo TLS), `procurar` (baixa manifesto + `.sig`, compara a pasta pelo SHA-256, baixa só o que mudou
pra `.atualizacao/`, cada arquivo conferido, `pronto.json`), `aplicar` (na abertura: troca os arquivos, o executável
rodando vira `.velho`, apaga os núcleos que saíram da lista, grava o `versao.txt`), `atualizacao.log` como o antigo.
**Falta no M15.1 (plano):** (1) teste de integração com chave gerada no teste (assinatura falsa e arquivo alterado
recusados; troca e núcleo velho apagado); (2) `kof-app`: `aplicar` no começo do `main` (antes do servidor; se trocou o
executável, abre o novo e sai), comando `app.atualizacao {procurar}` no `api.rs` com o `ureq` das capas, a versão do
`versao.txt` no `app.info`; (3) página: o menu "🔄 Procurar atualização" (hoje `ETAPA.atualizacao = 'M15'` em
`app/acoes.ts`) e a procura sozinha uns 15 s depois de abrir, com os avisos ("baixando…", "pronta: vale na próxima vez",
"já está na última"); (4) `tools/manifesto.mjs` (monta o manifesto das pastas do `tools/empacotar.sh`; núcleos com hash
no nome sobem uma vez só, compartilhados) + workflow `versao.yml` (compila Linux e Windows, empacota, assina com o
secret, Release "latest" com os arquivos soltos); (5) **chave**: a pública num arquivo do repositório
(`crates/kof-app/chave-atualizacao.txt`, hex de 32 bytes); a privada é um secret do GitHub que **o Marcelo cria**
(`openssl genpkey -algorithm ed25519`); sem chave, o atualizador fica desligado e anota no log.
**Onde parou:** ⏸ Marcelo testa Neo Geo e N64 (no Wi-Fi). Próxima sessão: terminar o M15.1 pelos itens acima, depois
M15.2–M15.4 (ordem combinada em 03/11, no ROADMAP).

---

## 2026-11-07 · Aprovações · M9, M10, M11 e a jukebox do SNES

**Pedido:** o Marcelo testou o pacote: "falta testar N64 e Neo Geo, o resto passou". Pediu os próximos passos.
**Feito:** ROADMAP: M9.1–M9.5, M10.1–M10.5, M11.1, M11.2, M11.4, M11.6 e N.5 ✅. SITUACAO: 68 ✅, 3 ⏸, 20 ⬜.
**Onde parou:** ⏸ Neo Geo (M11.3) e N64 (M11.5, N.6): ele testa no Wi-Fi. PS1 no Windows quando ele tiver um.
Próximo: **M15.1** (atualizador com manifesto assinado), na ordem combinada em 03/11.

---

## 2026-11-07 · Correção · PS1 sem memória de novo: o jogo zipado (e o estado que voltava preto)

**Pedido:** o Marcelo pediu pra fazer o PS1 rodar no Linux dele, com os jogos dele, sem estourar a memória, sozinho
até resolver (suspeitos em ordem: reserva no wasm, lightrec sem o endereço 0, processo caindo, formato não coberto,
pacote velho).
**Erro de verdade:** o único PS1 dele é um **`.zip`** (CD de 740 MB dentro: `.cue` + `.bin`). O `cabecaDoCd` só
cobria `cue|bin|img|iso|chd|pbp`: o zip era lido inteiro pela página e o jogo ia pro **WebAssembly** (nem tentava o
nativo; o log não tinha nenhuma linha "nativo"). Reproduzido no pacote `689755e` como usuário comum: página com pico de
**3,6 GB** (1,2 GB presos depois), `kofstation` **971 MB** (servindo o zip), 47 fps com 26 engasgos/s.
**Feito:**
- Rust (`kof-files/src/zip.rs`): entradas do zip com método e posição; `ler_entrada` (o começo de uma entrada,
  descompactado: guardado ou deflate, com o `flate2` que já vinha pelo `ureq`); `extrair_cd` (o CD sai em
  `<dados>/nativo/cache/<sistema>/<nome>-<tamanho>-<data>/`, CRC conferido, um CD por vez no cache, reaproveita se o zip
  é o mesmo). Erro novo `BAD_ZIP`. Comandos `file.stat`, `file.zip.list`, `file.zip.read` (API_CONTRACTS). O
  `nativo.abrir` extrai quando o caminho é `.zip`.
- Página (`app-core/jogos.ts`): `cabecaDoZip` monta o mesmo `JogoAberto` que o zip lido inteiro (mesmo nome, mesma rom
  = o `.cue`/a cabeça/o `.cue` montado das faixas: **mesma identidade e chave do save**), lendo só o `.cue` ou 64 KB.
  `pesoCd` = o tamanho do CD no disco (do zip, da imagem, ou do `.cue` + os `.bin` pelo `file.stat`).
- Reserva (`stores/jogo.ts`): CD acima de **100 MB** não cai mais pro WebAssembly; mostra o erro do nativo e o log do
  processo vai pro log do app. A reserva dos CDs pequenos agora lê o jogo inteiro antes (antes ia só a cabeça de 64 KB
  pro wasm).
- **Segundo bug, achado no caminho:** carregar estado num jogo de verdade deixava a **tela preta e o jogo recomeçava**.
  O `reset` antes do `unserialize` (posto no N.2 contra o SIGILL do lightrec) faz a BIOS HLE deixar o boot do CD pro
  próximo quadro, e esse boot passava por cima do estado. Agora: `reset` → **um quadro** (o boot acontece; som e imagem
  dele descartados) → `unserialize` (`kof-nativo/src/nucleo.rs`).
- `JogoNativo` (engine): a WebSocket que cai com o processo vivo reconecta sozinha (3 tentativas); depois de um "fim" do
  processo não reconecta. Uma vez a conexão caiu sozinha nos primeiros 10 s (o servidor viu EOF do navegador); não
  reproduziu em mais 8 rodadas.
- Teste `crates/kof-nativo/tests/jogo_de_verdade.rs` (ignorado; `KOF_JOGO=<cue>`): roda, salva, anda, carrega 3 vezes e
  confere que a imagem volta e o jogo anda. Não cita jogo nenhum.
**Suspeitos descartados:** (2) o lightrec não consegue o 0x0 como usuário (`vm.mmap_min_addr = 65536`), cai pro mapa
em 0x10000000 ("Memory map is sub-par") e funciona: 1500 quadros do FF9 em 0,7 s, muito acima do tempo real. Não
precisou recompilar o PCSX (sem Release nova). Sem o reset, o `pcsx.rs` também passa como usuário (o SIGILL foi visto
como root, no mapa em 0x0: por isso o reset ficou, com o quadro depois). (3) o processo não caiu. (5) o pacote
instalado era o `81f859e`.
**Medido / conferido (FF9 do Marcelo, só na máquina dele, BIOS HLE porque ele não tem a do PS1):** pela Biblioteca:
abre em 0,2 s, **página com pico de 190–320 MB, `kofstation` com 14–21 MB, processo do jogo com 44 MB** (não crescem com o
CD), 60 fps, 0 engasgos, 0 falta de som, controle responde, estado F5/F8 volta na mesma tela. Arrastado de fora: guardado
inteiro na Kof Games (cópia byte a byte) e abre no nativo, página 191 MB, `kofstation` 28 MB. A extração do zip leva
alguns segundos só na primeira vez. Cartão: o jogo lê o cartão ("No FF9 save data") e o app guarda e devolve ele entre
duas aberturas. `pnpm check`, `pnpm check:rust`, testes novos (zip no Rust e no TS, reconexão), `testar-nativo.mjs` no
pacote (sem `genisoimage`: só o PS-X EXE) e `pnpm e2e` 39/39 verdes (cada um precisou de uma segunda rodada uma vez: o
`page.goto` de 60 s do `testar-nativo` e o `visual.spec` do F4, que não mudou; os dois passaram na segunda).
**Deu errado / aprendido:** o teste do JORNAL anterior gerava `.cue`/`.iso` soltos; o jogo de verdade era zip. Testar
com o formato que a pessoa tem. A máquina dele não tinha Rust nem pnpm: instalados no usuário (rustup, pnpm pelo npx) e
o `alsa-lib-devel` extraído do RPM em `~/.local/kof-alsa` (`PKG_CONFIG_PATH`), sem sudo.
**Teste do Marcelo (07/11, pacote `a88d370` na Kof Games dele):** FF9 "rodou liso liso liso, 60 fps, sem stuttering".
Ele também testou **salvar no cartão dentro do jogo**: funciona. ✅ PS1 nativo aprovado no Linux.
**Onde parou:** falta o **Windows**: o Marcelo não tem Windows; ele vê depois como conferir (não mexer sem ele pedir).
Um `.chd` quando ele tiver. Depois: M15.1.

---

## 2026-11-07 · Correção · PS1 sem memória e a pasta de núcleos igual ao antigo

**Pedido:** o Marcelo testou: o PS1 estoura a memória. Pediu pra achar a causa, corrigir e documentar, e deixar os
núcleos numa pasta ao lado do executável como no antigo (`nativo/`, `nucleos/`, `versao.txt`).
**Causa:** a página lia o CD inteiro antes de abrir o jogo. Reproduzido no pacote anterior com um CD gerado de 300 MB:
arrastado de fora, a página foi a **1,2 GB** (com 700 MB, a aba morre) e o CD nem era guardado na Kof Games (limite de
256 MB por pedido); imagem única (`.iso`/`.chd`/`.bin`) pela biblioteca também era lida inteira. (Eu tinha testado só
com um programa de PS1 de poucos KB.)
**Feito:** `cabecaDoCd` (app-core): com o nativo, só o `.cue` ou 64 KB da imagem passam pela página; o tamanho de
verdade fica em `JogoAberto.tamanho` (a identidade e a chave do save não mudam). CD arrastado: vai pra Kof Games aos
pedaços de 16 MB direto do disco (`library.import.parte` no Rust, `enviarArquivo` com `Blob` no `fetch`) e abre no
nativo. WebAssembly (reserva): o CD vai pro Worker transferido, sem cópia. **D33:** núcleos fora do executável
(38 → 8 MB): `KOFstation/{kofstation, nucleos/ (hash no nome + lista.json), nativo/, versao.txt}`,
`crates/kof-app/src/pastas.rs`, `tools/empacotar.sh`; rodando do código, usa as pastas do repositório.
**Medido / conferido:** `tools/testar-nativo.mjs` (também no CI, com `genisoimage`): CD de 300 MB de verdade (ISO com
SYSTEM.CNF e o programa que desenha) pela biblioteca (`.cue` e `.iso`) e arrastado: imagem certa no nativo, 60 fps,
página ~300 MB (igual a antes de abrir), `kofstation` < 60 MB, CD guardado inteiro na Kof Games. `check`, `check:rust`,
39 e2e verdes. O pacote baixado da `teste-binarios` abre e serve os núcleos da pasta.
**Deu errado / aprendido:** testar sempre com arquivo do tamanho de verdade. Ler os pedaços como `ArrayBuffer` ainda
subia a página (~730 MB: o coletor de lixo demora); mandando o `Blob` direto no `fetch` não sobe. Uma vez o `page.goto`
do teste estourou 60 s (já tinha acontecido no CI): não reproduziu depois; ficar de olho. O executável novo é maior que
o lançador do antigo (que só abria o navegador): o perfil de compilação enxuto (~6 MB) ficou pra depois, a pedido.
**Onde parou:** ⏸ o Marcelo testa a `teste-binarios` nova (`fc73f93`: `KOFstation-linux.tar.gz` /
`KOFstation-windows.zip`): **PS1 de verdade** (pela biblioteca e arrastado), depois N64, jukebox do SNES e Neo Geo.
Depois: M15.1 (o atualizador já tem a pasta pronta).

---

## 2026-11-03 · Planejamento · ordem nova (PS2 pro fim)

**Pedido:** o Marcelo achou o PS2 caro em token e pediu pra fazer antes o que sai mais rápido, e deixar documentado.
**Feito:** só o plano: ROADMAP → "Ordem combinada em 03/11" (custo de cada etapa e por quê).
**Decidido:** ordem 1) teste dele + correções, 2) M15 distribuição, 3) M13 rede/celular como controle, 4) M14 celular,
5) N.9/M12 PS2 (+ N64 nativo), 6) Troca.
**Onde parou:** ⏸ o Marcelo testa a `teste-binarios` (PS1 nativo, jukebox do SNES, N64) e abre o PR da
`claude/busy-ritchie-wrvk8h`. Depois: **M15.1** (manifesto assinado e atualizador).

---

## 2026-11-02 · Etapas M11b N.2–N.8 · PS1 nativo, jukebox do SNES igual, N64 desenhando

**Pedido:** "segue até terminar" (depois do N.1).
**Feito:** N.2 `tools/nucleos-nativos.sh` (PCSX-ReARMed c8816799 com lightrec, Linux + Windows por mingw-w64) e o
workflow "Núcleos compilados" → Release `nucleos-2` (manifesto, seção `nativos`; o `pnpm nucleos` baixa a plataforma
atual). N.3 o `kofstation` embute o núcleo nativo da plataforma (`crates/kof-app/src/nativo.rs`, comandos `nativo.*`) e o
PS1 abre nele por padrão (jogo da Kof Games; o CD é lido pelo processo); `JogoNativo` na engine com a mesma cara do
`Jogo`; Opções de emulação → "Núcleo do PlayStation"; se falhar, cai no wasm. N.4 `tools/remendos/snes9x-sonda.patch` +
`tools/nucleos-wasm.sh` (o `construir.sh`/`ponte.cpp` do antigo num commit fixo); o Snes9x do app passa a ser o com
sonda. N.5 jukebox do SNES com Ondas/Notas, capa oficial pelo nome, o 8 bits do antigo portado (`oitobits.ts`) como
reserva da trilha. N.6 ROM de N64 que boota (programa no lugar do IPL3 → RDP → VI). N.7 PS1 wasm conferido pela imagem.
N.8 cartão BIOS do Início, ícone do app (xícara do `icone.py`, em SVG) na abertura e na janela, lista de BIOS no passo 2.
Executáveis novos na `teste-binarios` (`85befef`; Linux SHA-256 `a9633142…`, Windows `b86ff328…`).
**Decidido:** núcleos que a gente compila: Release `nucleos-<VERSAO>` (sobe a VERSAO quando muda núcleo; recompilar dá
outros bytes). PCSX nativo: `reset` antes de carregar estado (o lightrec dá SIGILL sem isso, também no upstream novo).
**Medido / conferido:** `tests/pcsx.rs`: PS-X EXE gerado desenha (vermelho + retângulo verde), pixels conferidos; estado
3x com o recompilador. `tools/testar-nativo.mjs` (também no CI): app de verdade + Chromium + PCSX nativo, pixels da
tela do app, 60 fps. Snes9x com sonda: o mesmo `.spc` toca **byte a byte igual** ao Snes9x publicado do antigo.
8 bits (Rua e Air) e `.wav` da trilha **byte a byte iguais** ao antigo (testes com `KOF_ANTIGO`). N64 em wasm desenha a
ROM nova (e2e, pixels). `check`, `check:rust`, e2e verdes; CI do N.1 verde também no Windows.
**Deu errado / aprendido:** o N64 "quebrado" era a ROM de teste (zeros no lugar do IPL3), não o núcleo. O PCSX com
lightrec entrega RGB565 (verde 31 → 251, a mesma conta do wasm). No CI, `page.goto` esperando "load" estourou uma vez:
o teste do nativo espera o DOM e a tela do Início.
**Onde parou:** ⏸ o Marcelo testa a `teste-binarios`: **PS1 de verdade** (Linux e Windows; liso?), N64 de verdade,
jukebox do SNES (F7 num jogo, Ondas/Notas), Neo Geo. Falta o **N.9 (PS2 nativo)**: precisa ensinar o `kof-nativo` a dar
um OpenGL sem janela pro núcleo (`SET_HW_RENDER`) e ler a imagem de volta; o mesmo caminho serve pro N64 nativo. É do
tamanho do M12: fazer numa sessão própria.

---

## 2026-11-02 · Etapa M11b N.1 · núcleo nativo num processo filho

**Pedido:** começar o M11b pelo N.1 ("pode fazer tudo").
**Feito:** crate `crates/kof-nativo`: frontend libretro em Rust (`nucleo.rs`, `libloading`; conversão de pixels igual ao
`ponte.cpp` do antigo; padrão das opções do `SET_VARIABLES` guardado como no RetroArch; log do núcleo formatado por uma
ponte em C, `ponte.c`, porque o printf do libretro é variádico), som pela placa (`som.rs`, cpal + reamostrador linear;
sem placa, um relógio), WebSocket local com token e origem (`canal.rs`, tungstenite; só o quadro mais novo vai),
protocolo (`protocolo.rs`), processo filho (`filho.rs`) e supervisor (`supervisor.rs`: token sorteado, config pelo stdin,
log guardado, fecha junto). `kofstation --nativo` roda o filho (um executável só). Erro novo `CORE_FAILED` no `kof-core`.
Lado da página: `packages/contracts/src/nativo.ts` (ler quadro/avisos, montar botões e blocos). CI e `rodar.sh` instalam
/ conferem os cabeçalhos do ALSA; INSTALAR.md atualizado.
**Decidido:** D32 (processo filho, som pela placa, imagem pela página). Protocolo em API_CONTRACTS §5.
**Medido / conferido:** `cargo test -p kof-nativo` compila `tests/nucleo/minimo.c` e confere: quadro RGBA com a cor da
opção e o 1º byte do jogo; som amostra por amostra; ~60 quadros/s e 735 amostras por quadro no relógio; botões; estado
ida e volta; bateria; pausa (o quadro não anda); sem token, token errado e origem errada = 403; comando inválido vira
erro; página nova derruba a antiga; núcleo que dá `abort()` derruba só o filho e o log fica; núcleo inexistente =
`CORE_FAILED`. Fixtures `packages/contracts/fixtures/nativo.json` testadas no TS e no Rust. `pnpm check` e
`pnpm check:rust` verdes. Sem placa de som no container: o caminho do cpal só foi conferido até "sem placa → relógio".
**Deu errado / aprendido:** o "pronto" da página nova ia pra conexão antiga (fila compartilhada): agora a geração é
conferida com a fila presa. cpal 0.18 mudou a API (config por valor, `cpal::Error`).
**Onde parou:** N.1 ✅. Próximo: **N.2** (compilar o PCSX-ReARMed nativo com dynarec no commit do antigo:
`nucleo-libretro/construir.sh` do `kofstation-old` diz qual; Release + manifesto; PS-X EXE gerado no teste) e **N.3**
(o app usa: comandos `nativo.*` na API, a página conecta pelo `nativo.ts` e desenha com os filtros).

---

## 2026-11-02 · Pós-entrega do M9–M11 · plano do PS nativo e do que ficou incompleto

**Pedido:** o Marcelo não aceita o pacote M9–M11 assim: a jukebox tem que ser "igualzinha à outra" (no SNES faltam Ondas
e Notas) e o N64 tem que rodar. Prioridade nova: PS rodando liso, com núcleo nativo como padrão (o wasm fica como
reserva, sem apagar). Aprovou fazer tudo e pediu pra salvar e continuar em outra sessão.
**Feito:** só o plano (ROADMAP → **M11b**, passos N.1 a N.9). Nenhum código.
**Decidido:** núcleos que a gente compila vão como anexo de Release no repositório KOFStation, baixados pelo manifesto
(SHA-256), no mesmo commit do núcleo que o antigo usa. O nativo roda num processo filho do `kof-app` (frontend libretro
em Rust), com o som nativo ditando o ritmo e a imagem indo pra página desenhar com os filtros (vira decisão D32 no N.1).
**Medido / conferido:** hoje o PS1 é o PCSX-ReARMed em WebAssembly, num Worker, sem dynarec: por isso pesa.
**Onde parou:** começar o **N.1** (crate `kof-nativo`), depois N.2 e N.3 (PS1 nativo, checkpoint: o Marcelo joga PS1
liso). Pacote só quando a jukebox do SNES estiver igual ao antigo e o N64 tiver rodado com imagem conferida, ou antes se
ele pedir o PS1 nativo pra testar. M9–M11 continuam ⏸.

---

## 2026-11-02 · Etapas M9–M11 · jukebox, extras e sistemas com BIOS (em lote)

**Pedido:** "vai até o M11", de uma vez. Perguntou se o M11 não sairia mais barato, já que os núcleos estão prontos.
**Feito:** M9 (`27769ab`): tocador da jukebox num Worker à parte (instância separada do núcleo, sonda de ondas, mudo/solo,
fade, `.wav`), F7, tela com Capa/Ondas/Notas (YIN, sincronia), mini-player, trilha FM no núcleo só de som, Air em
violino, música do Início e abertura da 1ª vez. M10 (`a1fd59c`): estatísticas (tempo jogando de verdade, sessões, 7 dias,
por jogo), espaço usado, patches IPS/BPS/UPS com o 🇧🇷, caçador de bugs (marco a cada 600 quadros no Worker, F9, pacote
`kofbug`, `pnpm bug <pacote> <rom>`), aviso de "atualizado" e de som desligado. M11 (`d6641a9`, `2cce114`): tela de BIOS
e o "falta a BIOS" do Neo Geo, BIOS no `/sistema`, Neo Geo no FBNeo (zip + pai, AES/MVS), PS1 no PCSX (.cue + .bin, .chd,
.pbp, .iso, .exe, zip com CD), N64 no Mupen64Plus (WebGL2 num OffscreenCanvas dentro do Worker), menu do núcleo do SNES.
**Decidido:** D28 (BIOS na loja `bios`), D29 (música do SNES pelo Snes9x: .spc entra num estado dele), D30 (N64 no
Worker com OffscreenCanvas), D31 (núcleo só de som e trilha pelo manifesto, de um commit fixo do antigo).
**Medido / conferido:** `check`, `check:rust` e 38 testes de fluxo verdes (novos: jukebox, abertura, extras, bios).
O `.spc` gerado no teste toca no Snes9x (a voz religada soa; sem ela, silêncio; mudo pela opção zera). PS1 roda um PS-X
EXE gerado a 60 fps, também no executável de verdade (servidor Rust), junto com a trilha na jukebox. Executáveis: Linux
34,8 MB, Windows 37,4 MB (entraram fbneo, pcsx, mupen64, somfm, violino e trilha).
**Deu errado / aprendido:** `l.i += l.num()` no BPS lia o `l.i` antes do `num()` avançar (o antigo usava duas linhas). A
tela de BIOS apagava o "falta a BIOS do Neo Geo" ao abrir (pego no teste). O N64 com a ROM gerada quebra ("couldn't
allocate memory for cached interpreter"): rodei o mesmo núcleo do jeito do antigo, na página, e quebra igual, então é a
ROM (não é jogo de verdade), não o Worker. O teste do N64 confere só o que dá sem jogo. De passagem: a loja `roms` faltava
na lista do Rust (o jogo aberto sem Kof Games não guardava a cópia).
**Tokens:** o M11 saiu bem mais barato que a estimativa (os núcleos já eram do antigo: só ligação e testes).
**Onde parou:** ⏸ o Marcelo testa o pacote M9–M11 (`teste-binarios`). Mais importante: jogo de verdade de Neo Geo
(com o neogeo.zip), PS1 (.cue com os .bin na mesma pasta) e N64; F7 num jogo de SNES e num de Mega Drive; .spc de
fora na jukebox; Estatísticas depois de jogar; F9. Bug que ele trouxer: "Correção: …", trocar a `teste-binarios`,
juntar na `main`. Depois que ele aprovar: M9–M11 ✅ e seguir pro M12 (PS2 nativo).

---

## 2026-11-02 · Etapas M3–M8 · pacote aprovado

**Pedido:** o Marcelo conferiu os saves do novo (save de cartucho, F5/F6/F8, Continuar de onde parou): "deu certo".
Pediu a lista das próximas etapas com a estimativa de tokens de cada uma.
**Feito:** M3–M8 marcados ✅ no ROADMAP e no README. Nenhuma mudança de código.
**Decidido:** nada novo.
**Medido / conferido:** teste do Marcelo no pacote da `teste-binarios` (Linux).
**Deu errado / aprendido:** —
**Onde parou:** próximo é o M9 (Jukebox). Estimativa passada ao Marcelo (tokens escritos, por etapa): M9 250–400 mil,
M10 150–250 mil, M11 350–600 mil, M12 200–350 mil, M13 250–400 mil, M15 120–200 mil, M14 300–500 mil, Troca 40–80 mil.
⏸ esperando ele dizer até onde seguir (um passo, a etapa inteira ou um lote).

---

## 2026-11-02 · Pós-entrega dos Lotes A e B · "connection refused" e onde parou

**Pedido:** o Marcelo instalou o pacote M3–M8; abriu uma vez e rodou liso, na segunda deu "connection refused". Depois
desistiu de trazer os saves do app antigo ("muito trampo") e quer conferir se os saves do **novo** funcionam.
**Feito:** correção `ab024f4`: quando já tem um Chromium aberto com o perfil do KOFstation, o processo novo entrega o
endereço pro que já existe e sai na hora; o `kofstation` achava que a janela tinha fechado e desligava o servidor. Agora
só um navegador que durou mais de 15 s conta como janela fechada; senão vale o sinal de vida da página (`app.vivo` a
cada 5 s; sem sinal por 30 s, encerra). Binários da `teste-binarios` trocados (Linux SHA-256 `86005e4f…`), `main` em dia.
**Medido / conferido:** reproduzido com um navegador falso que sai na hora: o servidor fica no ar com a janela aberta e
encerra sozinho 30 s depois que ela some. `check`, `check:rust` e 29 testes de fluxo verdes.
**Aprendido:** no antigo isso não existia porque não tinha servidor (o lançador abria um `.html` direto). Saves do antigo
ficam dentro do navegador dele (IndexedDB): só saem pelo backup `.kofsave` (Arquivo → 💾 Backup no antigo).
**Onde parou:** ⏸ o Marcelo vai testar a lista de 39 itens (está na conversa; resumo no README → "Rodar"), começando
pelos **saves do novo**: jogar algo com save de cartucho, salvar no jogo, fechar e abrir (save em
`~/.local/share/KOFstation/lojas/saves/`, chave `sram.<título>.<tamanho>`); F5/F6/F8; Continuar de onde parou. Bug que
ele trouxer: consertar com commit "Correção: …", trocar a `teste-binarios` (um commit, `push -f`) e juntar na `main`.
Depois que ele aprovar o pacote: marcar M3–M8 como ✅ no ROADMAP e seguir pro M9 (Jukebox).

---

## 2026-11-01 · Lotes A e B (M3–M8) · biblioteca, saves, rebobinar, imagem e controles

**Pedido:** fazer o Lote A (M3 Biblioteca e Kof Games, M4 Configurações e `.kofsave`, M5 Saves/estados/modos, M6
Rebobinar) e o Lote B (M7 Painel de imagem e molduras, M8 Controles e jogadores 2–4) inteiros, sem parar nos
checkpoints; junto, o `docs/EXPANDIR.md` e o log dos erros da tela no arquivo do Rust (`log.write`). Um commit por passo.
**Feito (22 commits, `4bb8e1f`…`433425e`):**
- Rust: `api.rs` com os comandos (testável sem HTTP), corpo JSON ou binário (`X-Kof-Args`), uma linha por pedido;
  crate `kof-files` (escopos, raiz Kof Games pela posição do executável ou escolhida, varredura com diretório do zip e
  cara de CD, CRC No-Intro com cache, inventário + aplicar o plano de organizar, lojas `.json`+`.bin`, config, capas do
  libretro-thumbnails com `ureq`). `log.write` com os erros da tela.
- `domain`: identidade da ROM (CRC, título, `título|tamanho`, `sram.<título>.<tamanho>`), detecção pelo conteúdo, Neo Geo
  (lista do FBNeo), plano de organizar, busca/facetas/base de jogos, guarda (`.kofsave`), modos, entrada em camadas,
  jogadores. `engine`: bateria e estados no Worker, rebobinador (o do antigo), `RenderizadorVisual` + `kofvisual.js` e
  `kofmolduras.js` copiados sem mudança, paletas.
- Telas: Biblioteca (lotes de 150, ficha, filtros, capas, sofá), pasta Kof Games e plano de organizar, Backup, Estados
  (com Opções de emulação), Modo de jogo, Início com Continuar/Recentes, ampulheta do rebobinar, painel de imagem (F4),
  galeria de molduras, Controles e teclas, Jogadores. `docs/EXPANDIR.md`.

**Decidido:** D23 (pasta digitada/colada, sem diálogo nativo), D24 (dados em `<dados>/lojas` com os formatos do antigo),
D25 (plano de organizar no TS, Rust só lista e move; mostra o plano antes), D26 (visual e molduras copiados sem mudança),
D27 (uma linha por pedido; binário sem base64).
**Medido / conferido (com `KOF_ANTIGO`, comparando com o código do antigo):** savestate do antigo abre no novo e o do
novo no antigo, com a mesma imagem depois, nos 5 sistemas; o rebobinador restaura os mesmos estados, passo a passo; o
`.kofsave` é lido e escrito pelo `guarda.js` antigo nos dois sentidos (mesmo hash); a base de jogos responde igual ao
`KofJogos`; título/CRC iguais ao `nucleo.js`/`jogos.js`; **os 42 jeitos do painel de imagem dão o mesmo canvas, pixel a
pixel**, do `KOFstation.html` publicado. 29 testes de fluxo + ~100 de unidade passando; executável de verdade testado de
ponta a ponta (pasta → plano → organizar → jogar → F5 → painel → backup) sem erro.
**Deu errado / aprendido:**
- O App passou a carregar depois da configuração (`import()` dinâmico): teste de fluxo que aperta tecla logo após o
  `goto` precisa esperar o `#home`.
- Duas gravações do registro de um jogo (abrir e salvar automático) se cruzavam e apagavam o `temAuto`: agora passam
  por uma fila (`naFila`).
- Um `vite preview` esquecido aberto fez o Playwright testar um build velho; e o Gambatte não devolve o mesmo estado byte
  a byte depois de carregar e salvar (o antigo também não): o teste do rebobinar confere o que é carregado no núcleo.
- Commit do M3.2 saiu com um aviso do clippy (corrigido no M3.3); o do M5.3 foi corrigido antes do envio (amend local).
**Onde parou:** ⏸ esperando o Marcelo testar o pacote (comando de instalação e lista do que testar na conversa e no
README). Fica pra depois: estatísticas/espaço usado (M10; o backup já leva as estatísticas), CD de PS1 e analógico num
jogo de verdade (M11), celulares como jogadores (M13), medir 3.000 jogos na biblioteca com a CPU limitada.

---

## 2026-11-01 · Checkpoint do M2 · aprovado

**Pedido:** instalar em `~/Programas/Kof Games/KOFstation` (só o executável; o antigo foi renomeado pra
"KOFstation old"), juntar tudo na `main`.
**Feito:** `rodar.sh` corrigido (não baixava os núcleos: o executável saía sem emuladores; testado num clone limpo sem
pnpm). Branch de trabalho juntada na `main` (avanço direto, `8af2c0b`). Comando de instalação por `curl` da branch
`teste-binarios` (precisa do repositório público).
**Medido / conferido:** o Marcelo rodou um jogo dele no app novo: "funcionou, deu certo". **M2 aprovado.**
**Decidido:** o Marcelo aprovou fazer **o Lote A (M3, M4, M5, M6) e o Lote B (M7, M8) inteiros**, sem parar nos
checkpoints do meio: um pacote só no fim pra ele testar tudo. Cada passo continua sendo um commit próprio com o nome da
etapa (ex.: "M3.2: …"), pra achar e desfazer só o que der errado. Entram junto: `docs/EXPANDIR.md` (como adicionar e
debugar) e o log dos erros da tela indo pro arquivo do Rust (comando `log.write`).
**Onde parou:** começar o **M3.1** numa sessão nova (o contexto desta ficou grande).

---

## 2026-10-31 · M2 · O app novo roda jogo

**Pedido:** "vai até o M2" (depois de aprovar o M1 como "ficou excelente"); entendido também como aprovação da opção B.
**Feito:**
- F4b.5: protótipos do spike apagados; D2 aceita.
- Núcleos por manifesto (`third_party/cores/manifest.json`, SHA-256), baixados do `kofstation-old` com `pnpm nucleos`
  pra `apps/desktop/public/nucleos/` (fora do git). Entram os 5 sem BIOS: Snes9x, Gambatte, FCEUmm, Genesis Plus GX, mGBA.
- `packages/engine`: `SessaoLibretro` (o `Consolinho` do antigo, sem DOM), `worker.ts` (núcleo num Web Worker), anel de
  som em `SharedArrayBuffer` + AudioWorklet (`anel.ts`), `Reamostrador`, `Jogo` (controlador do lado da página),
  `TelaDoJogo` (WebGL2), `tamanhoNaTela` (o `ajustarEscala` do antigo), `encaixarQuadro` (corte do NES, SNES em alta).
- `app-core/arquivo.ts`: ROM solta ou `.zip` → sistema + ROM, com erros claros pros sistemas que ainda não rodam.
- Desktop: `stores/jogo.ts`, hooks da tela/entrada/pausa, `MenuRapido` (os 19 itens do antigo), painel F3, abrir por
  Ctrl+O/menu/arrastar, Início com "🎮 Jogando agora" e a foto do jogo, botão "Voltar ao jogo" na lateral.
- Executável com os núcleos dentro: 14,7 MB (Linux) e 16 MB (Windows), na branch órfã `teste-binarios`.

**Decidido:** D21 (núcleos embutidos por enquanto), D22 (o som dita o ritmo; núcleo no Worker).
**Medido / conferido:**
- **Paridade:** mesma imagem e mesmo som que o adaptador do antigo, quadro a quadro, em SNES, NES, Mega Drive, Game
  Boy e GBA (`packages/engine/test/paridade.test.ts`; referência gerada rodando o `web/nucleo.js` do antigo com
  `KOF_ANTIGO=<pasta>`).
- No executável de verdade: 60 fps, 0 falta de som, núcleo 1,4–1,8 ms/quadro, também com a CPU limitada a 4×.
- 11 testes de fluxo (Playwright) passando, inclusive jogo: cor certa na tela, som saindo, pausa, menu rápido.

**Deu errado / aprendido:**
- Os arquivos de núcleo não exportam nada pro `require` do Node: criam a variável global `Nucleo_<núcleo>`. No Node,
  carregar num `vm` com `atob/btoa` (igual ao teste do antigo); no Worker, `self.window = self` + `eval` indireto.
- No commit `fb7b66e` (M2.1) o `git add -A` levou núcleos que tinham sobrado da pasta local do spike (~10 MB); saíram no
  commit seguinte, mas ficam no histórico da branch. **Lição:** apagar as pastas locais junto com o `git rm`, e
  conferir `git status` antes de `git add -A`.
- Repositório novo é privado: link direto (`raw.githubusercontent.com`) não funciona sem login; o teste do Marcelo é
  pelo `git clone` da branch `teste-binarios`.

**Onde parou:** M2 ⏸ esperando o Marcelo jogar um jogo dele (checkpoint). Ainda **sem saves** (M5). Próximo: M3
(biblioteca e Kof Games).

---

## 2026-10-31 · Empacotamento · executável único e explicação Rust × Tauri × Electron

**Pedido:** "me envia o app", "por que Rust e Chromium e não Tauri, pra empacotar", "e Electron, funcionaria?",
depois "só me dá um comando pra rodar".
**Feito:** `crates/kof-app` (o `kofstation`): serve o front embutido (`include_dir`) em `127.0.0.1` com token e COOP/COEP,
acha Chrome/Chromium/Edge/Brave/Vivaldi (também Flatpak) e abre em modo app com perfil próprio, fecha junto. Adaptador
`platform/local.ts` no front. `rodar.sh` (confere o que falta, compila, abre). Branch `teste-binarios` com os binários.
**Decidido:** D2 ganhou o argumento do empacotamento (um arquivo de 3–16 MB; AppImage/.deb/.rpm/instalador no M15).
Electron funcionaria (leva o Chromium junto, ~100–150 MB) e fica como alternativa se um dia precisar de Chromium fixo
(ex.: modo fliperama/comércio); trocar seria só a casca.
**Medido / conferido:** pedido sem token → 403 `FORBIDDEN`; isolamento ligado; log gravado; `.exe` do Windows compilado
daqui com mingw (não testado num Windows de verdade).
**Deu errado / aprendido:** `pkill -f kofstation` derruba o próprio shell do teste (casa com a linha de comando); usar
`pgrep -x`/`kill`. O alvo do Windows precisa ser instalado no toolchain fixado (`rustup target add ... --toolchain 1.97.0`).
**Onde parou:** Marcelo testou o M1: "ficou excelente".

---

## 2026-10-31 · F3 → M1 · Ambiente, esqueleto, spike da casca e a casca

**Pedido:** "segue até o M1, depois a gente testa".
**Feito:**
- F3: monorepo pnpm + Cargo, TypeScript 6 estrito, ESLint com regra de camadas, Prettier, clippy/rustfmt, CI Linux e
  Windows, `docs/INSTALAR.md`.
- F4a: pacotes `domain`, `contracts`, `app-core`, `engine`; app React mínimo com backend de teste; `kof-core` (app.info,
  `KofError` com código estável, log com `tracing`); contrato testado dos dois lados com as mesmas fixtures.
- F4b: spike Tauri × Rust local + Chromium com os núcleos do antigo (relatório `docs/SPIKE_D2.md`).
- M1: `estilo.css` do antigo inteiro + mesmos ids/classes (D17); menus, lateral, Início (frases e logos por tema),
  Guia (texto do antigo), galeria de temas com busca/categorias/showcase, pilha de telas e Voltar, atalhos, foco por
  controle (o `moverPad` do antigo, D19), telas que ainda não chegaram avisam a etapa.
**Decidido:** D2 proposta = opção B; D17–D20 (CSS do antigo, sem biblioteca de componentes, foco e lista feitos em casa).
**Medido / conferido:** no Linux o Tauri (WebKitGTK 2.52) **não tem WebRTC nem `SharedArrayBuffer`** (mesmo com
COOP/COEP chegando e `enable-webrtc` ligado); o Chromium passa em tudo. Prints antigo × novo do Início, temas e Guia:
iguais. 7 testes de fluxo (Playwright), inclusive um controle simulado pela Gamepad API.
**Deu errado / aprendido:** o 1º CI falhou por `pnpm-lock.yaml` desatualizado (`@types/node` com `^`); o repositório
foi renomeado pra `KOFstation` no meio (o `git push` avisa e redireciona).
**Onde parou:** esperando o Marcelo testar o M1.

---

## 2026-10-31 · Fase 1 e F2 · Auditoria do app antigo e arquitetura nova

**Pedido:** plano de evolução arquitetural (React + TypeScript, Rust, preservar emuladores), começando por uma
auditoria completa sem mexer no projeto antigo.
**Feito:** auditoria em `docs/auditoria/` (arquitetura, dependências, 42 funcionalidades, mapa do sistema, plano de
migração, plano detalhado com estimativa de tokens). Repositórios: antigo renomeado pra `kofstation-old`, novo
`kofstation`. F2: `ARCHITECTURE.md`, `DECISIONS.md` (D0–D16), `API_CONTRACTS.md`, `PARIDADE.md`, `ROADMAP.md`
(76 passos com checkpoint em cada um), `FRONTEND.md`, LICENSE GPL-3, `THIRD_PARTY.md`.
**Decidido (Marcelo):** Linux com a mesma prioridade do Windows; GPL-3; núcleo Kof é da Mel (fora até ela definir);
celular depois; **todas as funcionalidades são intocáveis**; sem correção de segurança no antigo por enquanto.
**Medido / conferido:** o app antigo **não usa RetroArch**: tem frontends libretro próprios (`ponte.cpp`,
`kofnativo.c`, nativo Android). Riscos achados: `kofnativo` sem conferência de `Origin`, atualizador sem assinatura,
dados presos ao perfil do navegador (`file://`).
**Deu errado / aprendido:** o GitHub não diferencia maiúsculas: criar `kofstation` tomou o nome de `KOFStation`; os
atualizadores antigos usam `KOFSnes` e continuam funcionando (**nunca criar um repositório `KOFSnes`**).
**Onde parou:** arquitetura aprovada; começar F3.
