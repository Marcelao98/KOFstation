import { mensagemDoErro, obterInfo, paraBackendError, type Backend } from '@kof/app-core';
import { useEffect } from 'react';
import { Aviso } from '../components/Aviso';
import { Lateral } from '../components/Lateral';
import { Menu } from '../components/Menu';
import { Status } from '../components/Status';
import { mover, telaDeCima, useNavegacaoPad } from '../hooks/useNavegacaoPad';
import { Guia } from '../screens/Guia/Guia';
import { Inicio } from '../screens/Inicio/Inicio';
import { Pendente } from '../screens/Pendente/Pendente';
import { BarraShowcase, Temas } from '../screens/Temas/Temas';
import { usarApp } from '../stores/app';
import { usarAvisos } from '../stores/avisos';
import { usarPrefs } from '../stores/prefs';
import { usarShowcase } from '../stores/showcase';
import { usarTelas } from '../stores/telas';
import { acao } from './acoes';
import { atalhoDe } from './atalhos';

const SETAS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

function teclaGlobal(e: KeyboardEvent) {
  const t = usarTelas.getState();
  const digitando = (e.target as Element | null)?.closest?.('input, textarea, select');
  if (e.code === 'Escape') {
    e.preventDefault();
    if (usarShowcase.getState().ativo) return usarShowcase.getState().parar(false);
    return t.sair();
  }
  const a = atalhoDe(e);
  if (a && !(digitando && a.tecla === 'Home')) {
    e.preventDefault();
    acao(a.acao);
    return;
  }
  // setas no Início e na galeria andam pelos botões (como no antigo)
  const s = SETAS[e.code];
  const tela = telaDeCima();
  if (s && !digitando && tela && (tela.id === 'home' || tela.id === 'temas')) {
    e.preventDefault();
    mover(tela, s[0], s[1]);
  }
}

export function App({ backend }: { backend: Backend }) {
  const { atual, temasAberto } = usarTelas();
  const tema = usarPrefs((p) => p.temaNaTela);
  useNavegacaoPad();

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  useEffect(() => {
    document.body.classList.add('vazio'); // sem jogo: a tela do jogo fica escondida (M2 liga)
    addEventListener('keydown', teclaGlobal);
    const direito = (e: MouseEvent) => {
      const t = usarTelas.getState();
      if (t.atual !== 'jogo' || t.temasAberto) {
        e.preventDefault(); // botão direito nas telas = Voltar
        t.voltar();
      }
    };
    const lateral = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        usarTelas.getState().voltar();
      }
    };
    addEventListener('contextmenu', direito);
    addEventListener('mouseup', lateral);
    return () => {
      removeEventListener('keydown', teclaGlobal);
      removeEventListener('contextmenu', direito);
      removeEventListener('mouseup', lateral);
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    obterInfo(backend).then(
      (info) => vivo && usarApp.getState().setInfo(info),
      (e: unknown) => {
        const b = paraBackendError(e);
        if (vivo) usarAvisos.getState().avisarErro(`${mensagemDoErro(b.code)} (${b.message})`);
      },
    );
    return () => {
      vivo = false;
    };
  }, [backend]);

  return (
    <>
      <Menu />
      <Lateral />
      <main id="palco">
        {atual === 'home' && <Inicio />}
        {atual === 'guia' && <Guia />}
        {atual !== 'home' && atual !== 'guia' && atual !== 'jogo' && <Pendente tela={atual} />}
        <div id="moldura">
          <canvas id="tela" width={256} height={224}></canvas>
        </div>
        {temasAberto && <Temas />}
        <Aviso />
        <BarraShowcase />
      </main>
      <Status />
    </>
  );
}
