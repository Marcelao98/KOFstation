import { ligarLog, registrar, textoDoErro } from '@kof/app-core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { escolherBackend } from './platform/escolher';
import { carregarConfig } from './stores/config';
import { ligarServicos } from './stores/servicos';
import { ligarARede } from './stores/rede';
import { religarControleNaAbertura } from './stores/celular';
import './styles/antigo/estilo.css';
import './styles/base.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('index.html sem o #raiz');
const backend = escolherBackend(new URL(location.href));
ligarLog(backend);
ligarServicos(backend);
ligarARede();
religarControleNaAbertura();
// sinal de vida: o kofstation fica no ar enquanto esta janela estiver aberta (e fecha 30 s depois que ela sumir)
setInterval(() => void backend.chamar('app.vivo').catch(() => undefined), 5000);
addEventListener('error', (e) =>
  registrar('error', 'tela', textoDoErro(e.error ?? e.message), { arquivo: e.filename }),
);
addEventListener('unhandledrejection', (e) => registrar('error', 'promessa', textoDoErro(e.reason)));
// as configurações vêm antes da primeira tela (tema, volume...); se o serviço não responder, abre com o padrão
// (o App é importado depois: as stores leem a configuração quando são criadas)
await carregarConfig(backend).catch((e: unknown) => registrar('error', 'config', textoDoErro(e)));
const { App } = await import('./app/App');
(await import('./app/ganchosDeTeste')).ligarGanchosDeTeste();
const { assentarSobras } = await import('./stores/bateria');
setTimeout(assentarSobras, 1500);
createRoot(raiz).render(
  <StrictMode>
    <App backend={backend} />
  </StrictMode>,
);
