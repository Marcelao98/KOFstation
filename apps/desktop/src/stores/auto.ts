// Salvar automático e Continuar (app.js `salvarAuto`/`continuar` do antigo): a cada N segundos de jogo (15/30/60,
// padrão 30), ao sair da janela, ao fechar e antes de abrir outro jogo; ao jogar de novo, continua de onde parou.
import { AUTO_SEG, bytesDoJogo, guardarAuto, lerAuto, registrar, textoDoErro } from '@kof/app-core';
import { quando, type RegistroJogo } from '@kof/domain';
import { NUCLEOS } from '@kof/engine';
import { fotoDoQuadro } from '../app/foto';
import { usarAvisos } from './avisos';
import { config } from './config';
import { restaurar } from './estados';
import { antesDeTrocarJogo, nativoLigado, usarJogo } from './jogo';
import { servicos } from './servicos';

export const autoLigado = (): boolean => config().ler('autoSalvar') !== '0';
export const autoSeg = (): number => {
  const v = Number(config().ler('autoSeg'));
  return (AUTO_SEG as readonly number[]).includes(v) ? v : 30;
};

let antes = Date.now();
let salvando: Promise<void> | null = null;

export function salvarAuto(): Promise<void> {
  if (salvando) return salvando;
  const j = usarJogo.getState();
  if (!autoLigado() || !j.jogo || !j.registro || !j.info) return Promise.resolve();
  const id = j.registro.id;
  const jogo = j.jogo;
  const nucleo = NUCLEOS[j.info.sistema]?.nucleo ?? '';
  const capa = fotoDoQuadro(256);
  salvando = (async () => {
    try {
      const estado = await jogo.salvarEstado();
      if (usarJogo.getState().registro?.id !== id) return; // trocou de jogo no meio
      const q = await guardarAuto(servicos().armazem, id, nucleo, estado, capa);
      const r = usarJogo.getState().registro;
      if (r?.id === id) usarJogo.setState({ registro: { ...r, temAuto: true, autoQuando: q, autoCapa: capa, capa } });
      antes = Date.now();
    } catch (e) {
      registrar('warn', 'auto', `salvar automático falhou: ${textoDoErro(e)}`);
    } finally {
      salvando = null;
    }
  })();
  return salvando;
}

/** Abre o jogo e continua do estado automático (sem automático: só abre). */
export async function continuar(j: RegistroJogo): Promise<void> {
  const { backend, armazem } = servicos();
  const aberto = await bytesDoJogo(backend, armazem, j, { soCabeca: !!j.path && (await nativoLigado(j.sistema)) });
  const auto = j.temAuto ? await lerAuto(armazem, j.id) : null;
  if (!(await usarJogo.getState().abrirJogo(aberto, j.path ? { path: j.path } : {}))) return;
  if (!auto) return;
  await restaurar(auto);
  antes = Date.now();
  if (j.autoQuando) usarAvisos.getState().avisar('continuando de ' + quando(j.autoQuando));
}

export function alternarAuto(): void {
  const liga = !autoLigado();
  config().guardar('autoSalvar', liga ? '1' : '0');
  usarAvisos.getState().avisar('Salvar automático: ' + (liga ? 'ligado' : 'desligado'));
}

// a cada 5 s confere se já passou o tempo (com o jogo andando)
setInterval(() => {
  const j = usarJogo.getState();
  if (j.jogo && !j.pausaManual && document.visibilityState === 'visible' && Date.now() - antes > autoSeg() * 1000)
    void salvarAuto();
}, 5000);
addEventListener('pagehide', () => void salvarAuto());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) void salvarAuto();
});
antesDeTrocarJogo.add(() => salvarAuto());
