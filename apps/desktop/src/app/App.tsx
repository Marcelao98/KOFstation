import { procurarDepoisDeAbrir } from '../stores/atualizacao';
import { mensagemDoErro, obterInfo, paraBackendError, type Backend } from '@kof/app-core';
import { EXTENSOES, ehPacote, principal as principalDoCd } from '@kof/domain';
import { useEffect, useRef } from 'react';
import { Aviso } from '../components/Aviso';
import { Desempenho } from '../components/Desempenho';
import { ControleDeToque } from '../components/ControleDeToque';
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
import { Teclas } from '../screens/Teclas/Teclas';
import { Jogadores } from '../screens/Jogadores/Jogadores';
import { Aparelhos } from '../screens/Aparelhos/Aparelhos';
import { Jukebox } from '../screens/Jukebox/Jukebox';
import { Abertura } from '../screens/Abertura/Abertura';
import { Estatisticas } from '../screens/Estatisticas/Estatisticas';
import { Bug } from '../screens/Bug/Bug';
import { Diagnostico } from '../screens/Diagnostico/Diagnostico';
import { BiosTela } from '../screens/Bios/BiosTela';
import { usarBug } from '../stores/bug';
import { usarDiagnostico } from '../stores/diagnostico';
import '../stores/estatisticas';
import { abrirPatch } from '../stores/traducao';
import { primeiraVez, usarAbertura } from '../stores/abertura';
import { usarJukebox } from '../stores/jukebox';
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
import { usarEntrada } from '../stores/entrada';
import { usarJogo } from '../stores/jogo';
import { usarPrefs } from '../stores/prefs';
import { config } from '../stores/config';
import { usarShowcase } from '../stores/showcase';
import { usarTelas, type TelaId } from '../stores/telas';
import { acao } from './acoes';
import { atalhoDe } from './atalhos';

/** Telas que já existem no app novo (as outras mostram em que etapa chegam). */
const PRONTAS: string[] = [
  'home',
  'guia',
  'jogo',
  'biblioteca',
  'estados',
  'teclas',
  'jogadores',
  'aparelhos',
  'jukebox',
  'estatisticas',
  'bios-tela',
];

const SETAS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};
const ACEITA = ['zip', 'kofsave', 'ips', 'bps', 'ups', ...EXTENSOES].map((e) => '.' + e).join(',');

/** Vários arquivos (o .cue com os .bin, as faixas de um CD): o principal abre com os outros junto. */
async function abrirVarios(fs: File[]) {
  if (fs.length < 2) return fs[0] ? abrirQualquer(fs[0]) : undefined;
  const p = fs.find((x) => /\.cue$/i.test(x.name)) ?? principalDoCd(fs) ?? fs[0];
  if (!p) return;
  await usarJogo.getState().abrirArquivo(
    p,
    fs.filter((x) => x !== p),
  );
}

/** Arquivo aberto ou arrastado: .kofsave traz o backup; o resto é jogo. */
async function abrirQualquer(f: File) {
  const cab = new Uint8Array(await f.slice(0, 16).arrayBuffer());
  if (/\.kofsave$/i.test(f.name) || ehPacote(new Uint8Array([...cab, 0]))) {
    await usarBackup.getState().importar(new Uint8Array(await f.arrayBuffer()), false);
    return;
  }
  if (/\.(ips|bps|ups)$/i.test(f.name)) return void (await abrirPatch(f)); // patch de tradução
  await usarJogo.getState().abrirArquivo(f);
}

function teclaGlobal(e: KeyboardEvent) {
  if (usarEntrada.getState().capturando) return; // a tela Controles está esperando uma tecla
  const t = usarTelas.getState();
  const j = usarJogo.getState();
  const digitando = (e.target as Element | null)?.closest?.('input, textarea, select');
  if (j.rapidoAberto && teclaDoRapido.tratar?.(e.code)) return e.preventDefault();
  const noJogo = !!j.jogo && t.atual === 'jogo' && !t.temasAberto;
  if (usarBug.getState().aberto) {
    if (e.code === 'Escape') usarBug.getState().fechar();
    return; // escrevendo a descrição do bug
  }
  if (usarDiagnostico.getState().aberto) {
    if (e.code === 'Escape') usarDiagnostico.getState().fechar();
    return; // a janela do diagnóstico está por cima
  }
  if (usarAbertura.getState().aberta) {
    if (e.code === 'Escape') usarAbertura.getState().fechar(true);
    return; // a abertura cuida das teclas dela
  }
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
  // na jukebox: Espaço toca/pausa, P volta pro jogo (como no antigo)
  if (t.atual === 'jukebox' && !t.temasAberto) {
    if (e.code === 'Space') {
      e.preventDefault();
      return void usarJukebox.getState().alternar();
    }
    if (e.code === 'KeyP' && j.jogo) return void acao('voltar-jogo');
  }
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
    primeiraVez();
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
      const todos = [...(e.dataTransfer?.files ?? [])];
      if (todos.length && todos.every((x) => /\.spc$/i.test(x.name)))
        return void usarJukebox.getState().importarSpcs(todos); // arquivos .spc vão pra jukebox
      if (todos.length) void abrirVarios(todos);
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
      (info) => {
        if (!vivo) return;
        usarApp.getState().setInfo(info);
        // o avisarSeAtualizou do antigo: a versão mudou desde a última vez que o app abriu
        const vista = config().ler('versaoVista');
        if (vista && vista !== info.version)
          setTimeout(
            () => usarAvisos.getState().avisar(`✨ KOFstation atualizado! versão ${info.version}`, 5000),
            1200,
          );
        config().guardar('versaoVista', info.version);
        procurarDepoisDeAbrir();
      },
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
      <ControleDeToque />
      <Lateral />
      <main id="palco">
        {atual === 'home' && <Inicio />}
        {atual === 'guia' && <Guia />}
        {atual === 'biblioteca' && <Biblioteca />}
        {atual === 'estados' && <Estados />}
        {atual === 'teclas' && <Teclas />}
        {atual === 'jogadores' && <Jogadores />}
        {atual === 'aparelhos' && <Aparelhos />}
        {atual === 'jukebox' && <Jukebox />}
        {atual === 'estatisticas' && <Estatisticas />}
        {atual === 'bios-tela' && <BiosTela />}
        {!PRONTAS.includes(atual) && <Pendente tela={atual as TelaId} />}
        <div id="moldura" hidden={atual !== 'jogo'}>
          <canvas id="tela" ref={canvas} width={256} height={224} onDoubleClick={() => acao('cheia')}></canvas>
        </div>
        {temasAberto && <Temas />}
        <ModoTela />
        <Visual />
        <Molduras />
        <PedirPasta />
        <Backup />
        <Bug />
        <Diagnostico />
        <PlanoDeOrganizacao />
        <Ampulheta />
        <MenuRapido />
        <Aviso />
        <BarraShowcase />
      </main>
      <Abertura />
      <Status />
      <Desempenho />
      <input
        type="file"
        id="arquivo"
        ref={arquivo}
        accept={ACEITA}
        multiple
        hidden
        onChange={(e) => {
          const fs = [...(e.target.files ?? [])];
          e.target.value = '';
          void abrirVarios(fs);
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
