import { ligarLog, registrar, textoDoErro } from '@kof/app-core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { escolherBackend } from './platform/escolher';
import './styles/antigo/estilo.css';
import './styles/base.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('index.html sem o #raiz');
const backend = escolherBackend(new URL(location.href));
ligarLog(backend);
addEventListener('error', (e) =>
  registrar('error', 'tela', textoDoErro(e.error ?? e.message), { arquivo: e.filename }),
);
addEventListener('unhandledrejection', (e) => registrar('error', 'promessa', textoDoErro(e.reason)));
createRoot(raiz).render(
  <StrictMode>
    <App backend={backend} />
  </StrictMode>,
);
