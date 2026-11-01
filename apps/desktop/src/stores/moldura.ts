// Moldura em volta do jogo (galeria #molduras do antigo): as 15 em SVG, a sua em PNG (o buraco transparente vira a
// tela), animações, uma por console; e as paletas do Game Boy e do NES.
import { registrar, textoDoErro } from '@kof/app-core';
import {
  buracoDoPng,
  KofMolduras,
  OPCOES_PALETA_GB,
  opcoesDePaleta,
  PALETAS_NES,
  type MolduraPropria,
} from '@kof/engine';
import { create } from 'zustand';
import { usarAvisos } from './avisos';
import { config } from './config';
import { depoisDeAbrirJogo, trocarOpcoesDoNucleo, usarJogo } from './jogo';
import { servicos } from './servicos';

export const MOLDURAS: [string, string][] = [
  ['nenhuma', 'Sem moldura'],
  ...KofMolduras.LISTA.map((m): [string, string] => [m.id, m.nome]),
  ['propria', 'Moldura sua (PNG)'],
];

export interface EstadoMoldura {
  moldura: string;
  anim: boolean;
  porSis: boolean;
  propria: MolduraPropria | null;
  galeria: boolean;
  cat: string;
  paletaGb: string;
  paletaNes: string;
  mudar: (id: string, semGuardar?: boolean) => void;
  set: (p: Partial<EstadoMoldura>) => void;
  escolherPropria: () => void;
  mudarPaletaGb: (v: string) => void;
  mudarPaletaNes: (v: string) => void;
}

const valida = (id: string | null, propria: MolduraPropria | null) =>
  id && MOLDURAS.some(([k]) => k === id) && (id !== 'propria' || propria) ? id : 'nenhuma';

export const usarMoldura = create<EstadoMoldura>()((set, get) => ({
  moldura: ((m) => (m && MOLDURAS.some(([k]) => k === m) ? m : 'nenhuma'))(config().ler('moldura')),
  anim: config().ler('moldAnim') !== '0',
  porSis: config().ler('moldPorSis') === '1',
  propria: null,
  galeria: false,
  cat: 'Todas',
  paletaGb: OPCOES_PALETA_GB[config().ler('paletaGb') ?? ''] ? (config().ler('paletaGb') as string) : 'auto',
  paletaNes: PALETAS_NES.some(([k]) => k === config().ler('paletaNes'))
    ? (config().ler('paletaNes') as string)
    : 'default',
  set: (p) => {
    if (p.anim !== undefined) config().guardar('moldAnim', p.anim ? '1' : '0');
    if (p.porSis !== undefined) config().guardar('moldPorSis', p.porSis ? '1' : '0');
    set(p);
  },
  mudar: (v, semGuardar) => {
    const moldura = valida(v, get().propria);
    if (!semGuardar) {
      config().guardar('moldura', moldura);
      const sis = usarJogo.getState().info?.sistema;
      if (sis && get().porSis) config().guardar('moldura.' + sis, moldura);
    }
    set({ moldura });
  },
  escolherPropria: () => {
    const e = document.createElement('input');
    e.type = 'file';
    e.accept = 'image/png,image/webp';
    e.onchange = async () => {
      const f = e.files?.[0];
      if (!f) return;
      try {
        const bmp = await createImageBitmap(f);
        const c = document.createElement('canvas');
        c.width = bmp.width;
        c.height = bmp.height;
        const g = c.getContext('2d');
        if (!g) throw new Error('sem canvas');
        g.drawImage(bmp, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const buraco = buracoDoPng((x, y) => d[(y * c.width + x) * 4 + 3] ?? 255, c.width, c.height);
        const bytes = new Uint8Array(await f.arrayBuffer());
        const tipo = f.type || 'image/png';
        await servicos().armazem.por('visual', 'molduraPropria', { buraco, larg: c.width, alt: c.height, tipo }, bytes);
        const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
        set({ propria: { url, buraco, larg: c.width, alt: c.height } });
        get().mudar('propria');
        usarAvisos.getState().avisar('🖼 moldura sua guardada (tela de ' + buraco[2] + '×' + buraco[3] + ' px)');
      } catch (er) {
        usarAvisos.getState().avisar(er instanceof Error ? er.message : String(er), 5000);
      }
    };
    e.click();
  },
  mudarPaletaGb: (v) => {
    const paletaGb = OPCOES_PALETA_GB[v] ? v : 'auto';
    config().guardar('paletaGb', paletaGb);
    set({ paletaGb });
    const j = usarJogo.getState();
    if (j.info?.sistema === 'gb') j.jogo?.mudarOpcoes(opcoesDePaleta('gb', paletaGb, get().paletaNes));
  },
  mudarPaletaNes: (v) => {
    const paletaNes = PALETAS_NES.some(([k]) => k === v) ? v : 'default';
    config().guardar('paletaNes', paletaNes);
    set({ paletaNes });
    const j = usarJogo.getState();
    if (j.info?.sistema === 'nes') j.jogo?.mudarOpcoes(opcoesDePaleta('nes', get().paletaGb, paletaNes));
  },
}));

/** Opções do núcleo de paleta pro jogo que vai abrir. */
export const opcoesDePaletaAgora = (sistema: string) =>
  opcoesDePaleta(sistema, usarMoldura.getState().paletaGb, usarMoldura.getState().paletaNes);

// a moldura própria guardada volta quando o app abre
void (async () => {
  try {
    const { armazem } = servicos();
    const meta = await armazem.meta<{
      buraco: [number, number, number, number];
      larg: number;
      alt: number;
      tipo: string;
    }>('visual', 'molduraPropria');
    const bytes = meta && (await armazem.pegar('visual', 'molduraPropria'));
    if (!meta || !bytes) return;
    const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: meta.tipo }));
    usarMoldura.setState({ propria: { url, buraco: meta.buraco, larg: meta.larg, alt: meta.alt } });
    if (config().ler('moldura') === 'propria') usarMoldura.getState().mudar('propria', true);
  } catch (e) {
    registrar('warn', 'moldura', `moldura própria não voltou: ${textoDoErro(e)}`);
  }
})();

// cada console com a sua: ao abrir um jogo, a moldura guardada dele (ou a padrão do console)
depoisDeAbrirJogo.add(() => {
  const m = usarMoldura.getState();
  const sis = usarJogo.getState().info?.sistema;
  if (!m.porSis || !sis) return;
  m.mudar(config().ler('moldura.' + sis) ?? KofMolduras.PADRAO_SIS[sis] ?? m.moldura, true);
});
trocarOpcoesDoNucleo(opcoesDePaletaAgora);
