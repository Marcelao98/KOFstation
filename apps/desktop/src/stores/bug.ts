// 🐞 Caçador de bugs (app.js 1719–1796 do antigo): F9 abre o "Reportar bug"; o pacote kofbug-*.json.gz leva o marco
// de segundos antes + os botões de cada quadro (o Worker guarda) e o print, e a issue abre no GitHub já preenchida.
// Erro na interface ou no emulador oferece reportar (no máximo uma vez por minuto). A ROM nunca vai no pacote.
import { registrar, textoDoErro } from '@kof/app-core';
import { gz } from '@kof/domain';
import { create } from 'zustand';
import { fotoDoQuadro } from '../app/foto';
import { usarApp } from './app';
import { usarAvisos } from './avisos';
import { config } from './config';
import { usarDiagnostico } from './diagnostico';
import { aoErroDoEmulador, jogoAbertoAgora, usarJogo } from './jogo';
import { usarPrefs } from './prefs';

const REPO = 'Marcelao98/KOFStation';

export interface Bug {
  aberto: boolean;
  erro: { mensagem: string; pilha: string } | null;
  cacador: boolean;
  pausadoAntes: boolean;
  abrir: (erro?: unknown) => void;
  fechar: () => void;
  enviar: (descricao: string, comPacote: boolean) => Promise<void>;
  alternarCacador: () => void;
}

async function sha1(b: Uint8Array): Promise<string> {
  try {
    const h = await crypto.subtle.digest('SHA-1', b as Uint8Array<ArrayBuffer>);
    return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return '?'; // sem crypto.subtle (página sem isolamento): o pacote vai sem o SHA-1
  }
}

export const usarBug = create<Bug>()((set, get) => ({
  aberto: false,
  erro: null,
  cacador: config().ler('cacador') !== '0',
  pausadoAntes: false,
  abrir: (erro) => {
    if (get().aberto) return;
    const j = usarJogo.getState();
    const e =
      erro === undefined
        ? null
        : { mensagem: String((erro as Error)?.message ?? erro), pilha: String((erro as Error)?.stack ?? '') };
    set({ aberto: true, erro: e, pausadoAntes: j.pausaManual });
    if (j.jogo && !j.pausaManual) j.alternarPausa();
  },
  fechar: () => {
    if (!get().aberto) return;
    set({ aberto: false });
    const j = usarJogo.getState();
    if (j.jogo && j.pausaManual !== get().pausadoAntes) j.alternarPausa();
  },
  enviar: async (descricao, comPacote) => {
    const aba = window.open('about:blank', '_blank'); // abre já, no clique: depois de um await o navegador bloquearia
    const desc = descricao.trim() || '(sem descrição)';
    const j = usarJogo.getState();
    const aberto = jogoAbertoAgora();
    const versao = usarApp.getState().info?.version ?? '?';
    const agora = new Date();
    const data = agora.toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const jogo =
      j.jogo && aberto && j.info
        ? {
            nome: j.nome,
            titulo: j.registro?.titulo ?? '',
            sistema: j.info.sistema,
            tamanho: aberto.rom.length,
            sha1: await sha1(aberto.rom),
            mapeamento: j.info.sistema,
          }
        : null;
    const cfg = config();
    const opcoes = `tema ${usarPrefs.getState().tema} · filtro ${cfg.ler('filtro') ?? 'original'} · proporção ${j.proporcao} · moldura ${cfg.ler('moldura') ?? 'nenhuma'}`;
    const erro = get().erro;
    let arquivo = '';
    try {
      if (comPacote && j.jogo && jogo) {
        const replay = await j.jogo.replayDoBug();
        const pacote = {
          formato: 'kofbug',
          versao: 1,
          nucleo: jogo.sistema === 'snes' ? 's9x' : jogo.sistema,
          kofstation: versao,
          quando: agora.toISOString(),
          descricao: desc,
          jogo,
          erro,
          ambiente: { navegador: navigator.userAgent, opcoes },
          replay: replay.estado ? replay : null,
          agora: { assinatura: replay.agora.assinatura },
          print: fotoDoQuadro(256),
        };
        arquivo = `kofbug-${(j.nome || 'jogo').replace(/[^\w-]+/g, '_').slice(0, 40)}-${data}.json.gz`;
        const bytes = await gz(new TextEncoder().encode(JSON.stringify(pacote)));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/gzip' }));
        a.download = arquivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      }
    } catch (e) {
      registrar('warn', 'bug', `pacote do bug: ${textoDoErro(e)}`);
    }
    // modo diagnóstico ligado: o relatório da sessão vai junto (M16.3)
    let diagnostico: string | null = null;
    if (comPacote)
      try {
        diagnostico = await usarDiagnostico.getState().exportarPraBug();
      } catch (e) {
        registrar('warn', 'bug', `diagnóstico no pacote do bug: ${textoDoErro(e)}`);
      }
    const L: string[] = ['### O que aconteceu', '', desc, ''];
    if (jogo)
      L.push(
        '### Jogo',
        '',
        `- **ROM:** ${jogo.nome}`,
        `- **Título interno:** ${jogo.titulo || '?'} · ${jogo.mapeamento} · ${Math.round(jogo.tamanho / 1024)} KB`,
        `- **SHA-1:** \`${jogo.sha1}\``,
        '',
      );
    L.push('### Ambiente', '', `- **KOFstation (novo):** ${versao}`, `- **Navegador:** ${navigator.userAgent}`);
    L.push(`- **Opções:** ${opcoes}`, '');
    if (erro) L.push('### Erro', '', '```', erro.mensagem, erro.pilha.slice(0, 1200), '```', '');
    if (arquivo)
      L.push(
        '### Pacote pra reproduzir',
        '',
        `📎 **Arraste aqui o arquivo \`${arquivo}\`**, que o KOFstation acabou de baixar (pasta Downloads).`,
        'Ele tem o savestate de alguns segundos antes e os botões apertados, pra reproduzir o bug quadro a quadro (`pnpm bug <pacote> <rom>`). A ROM **não** vai junto.',
        '',
      );
    if (diagnostico)
      L.push(
        '### Diagnóstico de desempenho',
        '',
        `📎 Arraste também o \`${diagnostico}\` (quadro a quadro, engasgos, máquina e opções de emulação).`,
        '',
      );
    L.push('---', '_Reportado pelo modo caçador de bugs do KOFstation_');
    const titulo = `[bug] ${jogo ? jogo.nome + ': ' : ''}${(desc.split('\n')[0] ?? '').slice(0, 70)}`;
    const url = `https://github.com/${REPO}/issues/new?labels=bug&title=${encodeURIComponent(titulo)}&body=${encodeURIComponent(L.join('\n')).slice(0, 7000)}`;
    if (aba) aba.location.href = url;
    else window.open(url, '_blank');
    get().fechar();
    usarAvisos
      .getState()
      .avisar(
        arquivo ? '🐞 issue aberta no GitHub: arraste o pacote baixado pra dentro dela' : '🐞 issue aberta no GitHub',
        6000,
      );
  },
  alternarCacador: () => {
    const cacador = !get().cacador;
    config().guardar('cacador', cacador ? '1' : '0');
    set({ cacador });
    usarJogo.getState().jogo?.cacador(cacador);
    usarAvisos.getState().avisar('Caçador de bugs: ' + (cacador ? 'ligado' : 'desligado'));
  },
}));

// jogo novo: avisa o Worker se o caçador está ligado
usarJogo.subscribe((s, a) => {
  if (s.jogo && s.jogo !== a.jogo) s.jogo.cacador(usarBug.getState().cacador);
});

// erro na interface: oferece reportar, no máximo uma vez por minuto
let ultimoErro = 0;
addEventListener('error', (e) => {
  if (!usarBug.getState().cacador || Date.now() - ultimoErro < 60000 || !e.error) return;
  ultimoErro = Date.now();
  usarBug.getState().abrir(e.error);
});
aoErroDoEmulador.add((m) => {
  if (usarBug.getState().cacador) usarBug.getState().abrir(new Error(m));
});
