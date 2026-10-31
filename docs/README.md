# Mapa da documentação

| Documento | Pra quê | Quando ler |
|---|---|---|
| [../README.md](../README.md) | o que é o projeto, a arquitetura **como está hoje** (diagramas), como rodar | primeiro |
| [JORNAL.md](JORNAL.md) | diário de bordo: o que aconteceu em cada sessão e **onde parou** | sempre, a entrada mais nova |
| [ROADMAP.md](ROADMAP.md) | as 19 etapas / 76 passos, estado de cada um e os checkpoints | pra saber o que vem |
| [ARCHITECTURE.md](ARCHITECTURE.md) | camadas, regras de dependência, ciclo do jogo, erros, logs, configurações, dados, testes | ao mexer na estrutura |
| [FRONTEND.md](FRONTEND.md) | como o front é feito (ferramentas, fidelidade visual, telas, foco por controle, tela do jogo) | ao mexer em telas |
| [DECISIONS.md](DECISIONS.md) | todas as decisões (D0–D22), com contexto, consequências e alternativas | antes de mudar algo grande |
| [API_CONTRACTS.md](API_CONTRACTS.md) | o contrato entre o app e o Rust (envelope, escopos, comandos por etapa) | ao criar comando novo |
| [PARIDADE.md](PARIDADE.md) | tudo que tem que ficar igual ao antigo, item por item, com estado | em toda etapa |
| [SPIKE_D2.md](SPIKE_D2.md) | o teste que decidiu Rust + Chromium em vez de Tauri | se a casca for rediscutida |
| [INSTALAR.md](INSTALAR.md) | ambiente de desenvolvimento no Fedora, Ubuntu e Windows | pra compilar |
| [auditoria/](auditoria/) | a análise completa do app antigo (fase 1): arquitetura, dependências, 42 funcionalidades com arquivo e linha, mapa, plano | pra migrar uma funcionalidade |
| [../THIRD_PARTY.md](../THIRD_PARTY.md) | licenças de terceiros (núcleos, bibliotecas, mídia) | antes de distribuir |
| [../AGENTS.md](../AGENTS.md) | manual pra agentes de IA | agentes: primeiro |
