import { mensagemDoErro, obterInfo, paraBackendError, type Backend } from '@kof/app-core';
import { EXTENSOES, ehPacote } from '@kof/domain';
import { useEffect, useRef } from 'react';
import { Aviso } from '../components/Aviso';
import { Desempenho } from '../components/Desempenho';
import { Lateral } from '../components/Lateral';
import { Menu } from '../components/Menu';
import { MenuRapido, teclaDoRapido } from '../components/MenuRapido';
import { Status } from '../components/Status';
import { useEntradaDoJogo } from '../hooks/useEntradaDoJogo';
import { mover, telaDeCima, useNavegacaoPad } from '../hooks/useNavegacaoPad';
import { usePausa } from '../hooks/usePausa';
import { useTelaDoJogo } from '../hooks/useTelaDoJogo';
import { Backup } from '../screens/Backup/Backup';
import { Biblioteca } from '../screens/Biblioteca/Biblioteca';
import { PedirPasta, PlanoDeOrganizacao } from '../screens/Biblioteca/Dialogos';
import { Estados } from '../screens/Estados/Estados';
import { Guia } from '../screens/Guia/Guia';
import { ModoTela } from '../screens/Modo/ModoTela';
import { Visual } from '../screens/Visual/Visual';
import { Molduras } from '../screens/Molduras/Molduras';
import { Inicio } from '../screens/Inicio/Inicio';
import { Pendente } from '../screens/Pendente/Pendente';
import { BarraShowcase, Temas } from '../screens/Temas/Temas';
import { usarApp } from '../stores/app';
import { usarAvisos } from '../stores/avisos';
import '../stores/auto';
import '../stores/modo';
import { ampulheta, usarRebob } from '../stores/rebob';
import { usarBackup } from '../stores/backup';
import { usarCapas } from '../stores/capas';
import { usarJogo } from '../stores/jogo';
import { usarPrefs } from '../stores/prefs';
import { usarShowcase } from '../stores/showcase';
import { usarTelas, type TelaId } from '../stores/telas';
import { acao } from './acoes';
import { atalhoDe } from './atalhos';

const SETAS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};
const ACEITA = ['zip', 'kofsave', ...EXTENSOES].map((e) => '.' + e).join(',');

/** Arquivo aberto ou arrastado: .kofsave traz o backup; o resto é jogo. */
async function abrirQualquer(f: File) {
  const cab = new Uint8Array(await f.slice(0, 16).arrayBuffer());
  if (/\.kofsave$/i.test(f.name) || ehPacote(new Uint8Array([...cab, 0]))) {
    await usarBackup.getState().importar(new Uint8Array(await f.arrayBuffer()), false);
    return;
  }
  await usarJogo.getState().abrirArquivo(f);
}

function teclaGlobal(e: KeyboardEvent) {
  const t = usarTelas.getState();
  const j = usarJogo.getState();
  const digitando = (e.target as Element | null)?.closest?.('input, textarea, select');
  if (j.rapidoAberto && teclaDoRapido.tratar?.(e.code)) return e.preventDefault();
  const noJogo = !!j.jogo && t.atual === 'jogo' && !t.temasAberto;
  if (e.code === 'Escape') {
    e.preventDefault();
    if (usarShowcase.getState().ativo) return usarShowcase.getState().parar(false);
    if (noJogo) return j.alternarPausa(); // no jogo, Esc pausa (como o P)
    return t.sair();
  }
  if (e.code === 'F3') {
    e.preventDefault();
    return void acao('desempenho');
  }
  const a = atalhoDe(e);
  if (a && !(digitando && a.tecla === 'Home')) {
    e.preventDefault();
    acao(a.acao);
    return;
  }
  if (digitando) return;
  if (e.code === 'KeyM') return void acao('mudo');
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') return void acao('vol-menos');
  if (e.code === 'Equal' || e.code === 'NumpadAdd') return void acao('vol-mais');
  if (noJogo && e.code === 'KeyP') return void acao('pausar');
  // setas no Início e na galeria andam pelos botões (como no antigo)
  const s = SETAS[e.code];
  const tela = telaDeCima();
  if (s && tela && (tela.id === 'home' || tela.id === 'temas')) {
    e.preventDefault();
    mover(tela, s[0], s[1]);
  }
}

export function App({ backend }: { backend: Backend }) {
  const { atual, temasAberto, temJogo } = usarTelas();
  const tema = usarPrefs((p) => p.temaNaTela);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  useNavegacaoPad();
  useEntradaDoJogo();
  useTelaDoJogo(canvas);
  usePausa();

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  useEffect(() => {
    document.body.classList.toggle('sofa', usarCapas.getState().sofa);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('vazio', !temJogo); // sem jogo: a tela do jogo fica escondida
  }, [temJogo]);

  useEffect(() => {
    addEventListener('keydown', teclaGlobal);
    const direito = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('input, textarea')) return; // nas caixas de texto, o menu de colar
      e.preventDefault();
      const t = usarTelas.getState();
      const j = usarJogo.getState();
      if (t.atual === 'jogo' && !t.temasAberto && j.jogo) return void acao('rapido'); // no jogo: menu rápido
      t.voltar(); // nas telas: Voltar
    };
    const lateral = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        usarTelas.getState().voltar();
      }
    };
    const soltar = (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files[0];
      if (f) void abrirQualquer(f);
    };
    const arrastando = (e: DragEvent) => e.preventDefault();
    addEventListener('contextmenu', direito);
    addEventListener('mouseup', lateral);
    addEventListener('drop', soltar);
    addEventListener('dragover', arrastando);
    return () => {
      removeEventListener('keydown', teclaGlobal);
      removeEventListener('contextmenu', direito);
      removeEventListener('mouseup', lateral);
      removeEventListener('drop', soltar);
      removeEventListener('dragover', arrastando);
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
        {atual === 'biblioteca' && <Biblioteca />}
        {atual === 'estados' && <Estados />}
        {!['home', 'guia', 'jogo', 'biblioteca', 'estados'].includes(atual) && <Pendente tela={atual as TelaId} />}
        <div id="moldura" hidden={atual !== 'jogo'}>
          <canvas id="tela" ref={canvas} width={256} height={224} onDoubleClick={() => acao('cheia')}></canvas>
        </div>
        {temasAberto && <Temas />}
        <ModoTela />
        <Visual />
        <Molduras />
        <PedirPasta />
        <Backup />
        <PlanoDeOrganizacao />
        <Ampulheta />
        <MenuRapido />
        <Aviso />
        <BarraShowcase />
      </main>
      <Status />
      <Desempenho />
      <input
        type="file"
        id="arquivo"
        ref={arquivo}
        accept={ACEITA}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void abrirQualquer(f);
        }}
      />
    </>
  );
}

/** A ampulheta do rebobinar (#ampulheta do antigo). */
function Ampulheta() {
  const { texto, enche } = ampulheta(usarRebob((r) => r.r));
  return (
    <div id="ampulheta" hidden={!texto} style={{ '--enche': Math.round(enche * 100) + '%' } as React.CSSProperties}>
      <span>{texto}</span>
    </div>
  );
}
