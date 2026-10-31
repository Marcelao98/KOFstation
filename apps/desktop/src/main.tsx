import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { escolherBackend } from './platform/escolher';
import './styles/antigo/estilo.css';
import './styles/base.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('index.html sem o #raiz');
createRoot(raiz).render(
  <StrictMode>
    <App backend={escolherBackend(new URL(location.href))} />
  </StrictMode>,
);
