// 🎮 Controles e teclas (#teclas do antigo): abas por console, "todo o console" ou "só este jogo", e cada ação com a
// tecla e o botão do controle. Clicar espera a tecla (Esc cancela; atalho do emulador não vale) ou o botão (espera
// soltar o que abriu e pega o próximo, 10 s). Mudado fica marcado; ↺ volta ao padrão.
import {
  ABAS_CONTROLES,
  acoesDe,
  BOTOES_SNES,
  chaveCamada,
  ehEixo,
  gravarNaCamada,
  lerCamada,
  mapaDe,
  NOMES_ACAO,
  NOMES_BOTAO,
  nomePad,
  nomeTecla,
  RESERVADAS,
  SISTEMAS,
  type TipoDeMapa,
} from '@kof/domain';
import { useEffect, useState } from 'react';
import { acao } from '../../app/acoes';
import { usarAvisos } from '../../stores/avisos';
import { config } from '../../stores/config';
import { sisAtual, usarEntrada } from '../../stores/entrada';
import { usarJogo } from '../../stores/jogo';

const ler = (k: string) => config().ler(k);
const curto = (s: string) => SISTEMAS.find((x) => x.id === s)?.curto ?? s;

export function Teclas() {
  const jogo = usarJogo((j) => (j.jogo ? j.registro : null));
  const nomeJogo = usarJogo((j) => j.nome);
  const { capturando } = usarEntrada();
  const [aba, setAba] = useState<string>(() => (jogo ? sisAtual() : 'geral'));
  const [escopo, setEscopo] = useState<'console' | 'jogo'>(() =>
    jogo && config().ler('teclas.jogo.' + jogo.id) ? 'jogo' : 'console',
  );
  const [, setVersao] = useState(0);
  const podeJogo = !!jogo && aba === sisAtual();
  const jogoDaTela = aba !== 'geral' && escopo === 'jogo' && podeJogo ? (jogo?.id ?? null) : null;
  const capturar = (c: EstadoCaptura | null) => usarEntrada.setState({ capturando: c });

  const gravar = (tipo: TipoDeMapa, nome: string, v: string) => {
    const [k, cam] = gravarNaCamada(ler, tipo, aba, jogoDaTela, nome, v);
    config().guardar(k, JSON.stringify(cam));
    capturar(null);
    usarEntrada.getState().aplicar();
    setVersao((x) => x + 1);
  };

  // tecla: pega antes de tudo (o jogo e os atalhos não veem)
  useEffect(() => {
    if (capturando?.tipo !== 'tecla') return;
    const tecla = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') return capturar(null);
      if (RESERVADAS.includes(e.code))
        return usarAvisos.getState().avisar(nomeTecla(e.code) + ' é atalho do emulador; escolha outra', 2500);
      gravar('teclas', capturando.nome, e.code);
    };
    addEventListener('keydown', tecla, true);
    return () => removeEventListener('keydown', tecla, true);
  });
  // botão do controle: espera soltar o que abriu a escolha (o A da navegação) e pega o próximo apertado
  useEffect(() => {
    if (capturando?.tipo !== 'botao') return;
    const esc = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      capturar(null);
    };
    addEventListener('keydown', esc, true);
    const t = setInterval(() => {
      const c = usarEntrada.getState().capturando;
      if (!c) return;
      if (performance.now() > c.ate) return capturar(null);
      const ap: number[] = [];
      for (const g of navigator.getGamepads?.() ?? []) if (g) g.buttons.forEach((b, i) => b.pressed && ap.push(i));
      if (!c.solto) {
        if (!ap.length) capturar({ ...c, solto: true });
        return;
      }
      if (ap[0] !== undefined) gravar('botoes', c.nome, String(ap[0]));
    }, 40);
    return () => {
      clearInterval(t);
      removeEventListener('keydown', esc, true);
    };
  });
  useEffect(() => () => capturar(null), []);

  const tec = mapaDe(ler, 'teclas', aba, jogoDaTela);
  const bot = mapaDe(ler, 'botoes', aba, jogoDaTela);
  const camT = lerCamada(ler, chaveCamada('teclas', aba, jogoDaTela));
  const camB = lerCamada(ler, chaveCamada('botoes', aba, jogoDaTela));
  const rot = NOMES_BOTAO[aba] ?? {};
  const acoes = aba === 'geral' ? BOTOES_SNES.map(([x]) => x) : acoesDe(aba);
  return (
    <section id="teclas" className="janela">
      <div className="titulo-j">
        🎮 Controles e teclas{' '}
        <button className="x" data-acao="fechar-teclas" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <div id="ct-abas" className="ct-abas so-pc">
        {ABAS_CONTROLES.filter((s) => s === 'geral' || SISTEMAS.some((x) => x.id === s)).map((s) => (
          <button
            key={s}
            className={s === aba ? 'ativo' : ''}
            onClick={() => {
              setAba(s);
              capturar(null);
            }}
          >
            {s === 'geral' ? 'Geral' : curto(s)}
          </button>
        ))}
      </div>
      <div id="ct-escopo" className="ct-abas ct-escopo so-pc">
        {aba === 'geral' ? (
          <small>Vale pra todos os consoles. Cada console e cada jogo pode mudar por cima.</small>
        ) : (
          (
            [
              ['console', 'Todo o ' + curto(aba)],
              ['jogo', podeJogo ? 'Só ' + (nomeJogo || 'este jogo') : 'Só este jogo (abra o jogo)'],
            ] as const
          ).map(([k, t]) => (
            <button
              key={k}
              className={(jogoDaTela ? 'jogo' : 'console') === k ? 'ativo' : ''}
              disabled={k === 'jogo' && !podeJogo}
              onClick={() => {
                setEscopo(k);
                capturar(null);
              }}
            >
              {t}
            </button>
          ))
        )}
      </div>
      <p className="dica" id="teclas-dica">
        {capturando
          ? capturando.tipo === 'tecla'
            ? `Aperte a tecla para ${NOMES_ACAO[capturando.nome] ?? capturando.nome} (Esc cancela).`
            : 'Aperte o botão no controle (Esc cancela).'
          : 'Clique na tecla ou no botão do controle e aperte o que quiser. Mudado fica marcado; ↺ volta ao padrão.'}
      </p>
      <div id="grade-teclas">
        <b className="ct-cab">Botão</b>
        <b className="ct-cab">⌨ Teclado</b>
        <b className="ct-cab">🎮 Controle</b>
        <span />
        {acoes.flatMap((n) => {
          const esperaT = capturando?.nome === n && capturando.tipo === 'tecla';
          const esperaB = capturando?.nome === n && capturando.tipo === 'botao';
          const nome = NOMES_ACAO[n] ?? (rot[n] && rot[n] !== n ? rot[n] + ' (' + n + ')' : n);
          return [
            <span key={n + 'n'} className="ct-nome">
              {nome}
            </span>,
            <button
              key={n + 't'}
              className={'tecla' + (esperaT ? ' esperando' : '') + (n in camT ? ' mudou' : '')}
              data-ct-tecla={n}
              onClick={(e) => {
                e.stopPropagation();
                capturar({ nome: n, tipo: 'tecla', solto: true, ate: 0 });
              }}
            >
              {esperaT ? 'aperte…' : nomeTecla(tec[n])}
            </button>,
            ehEixo(n) ? (
              <span key={n + 'b'} className="ct-fixo">
                o analógico
              </span>
            ) : (
              <button
                key={n + 'b'}
                className={'tecla' + (esperaB ? ' esperando' : '') + (n in camB ? ' mudou' : '')}
                data-ct-botao={n}
                onClick={(e) => {
                  e.stopPropagation();
                  capturar({ nome: n, tipo: 'botao', solto: false, ate: performance.now() + 10000 });
                }}
              >
                {esperaB ? 'aperte no controle…' : nomePad(bot[n])}
              </button>
            ),
            <button
              key={n + 'r'}
              className="ct-volta"
              title="voltar ao padrão"
              style={{ visibility: n in camT || n in camB ? undefined : 'hidden' }}
              onClick={(e) => {
                e.stopPropagation();
                for (const t of ['teclas', 'botoes'] as const) {
                  const k = chaveCamada(t, aba, jogoDaTela);
                  const c = Object.fromEntries(Object.entries(lerCamada(ler, k)).filter(([x]) => x !== n));
                  config().guardar(k, JSON.stringify(c));
                }
                usarEntrada.getState().aplicar();
                setVersao((x) => x + 1);
              }}
            >
              ↺
            </button>,
          ];
        })}
      </div>
      <button
        className="grande sec"
        data-acao="teclas-padrao"
        onClick={() => {
          for (const t of ['teclas', 'botoes'] as const) config().guardar(chaveCamada(t, aba, jogoDaTela), '');
          usarEntrada.getState().aplicar();
          setVersao((x) => x + 1);
          usarAvisos
            .getState()
            .avisar(
              aba === 'geral'
                ? 'controles: padrão'
                : jogoDaTela
                  ? 'este jogo volta a usar os controles do console'
                  : 'o console volta a usar os controles gerais',
              3000,
            );
        }}
      >
        Restaurar padrão
      </button>
    </section>
  );
}

type EstadoCaptura = { nome: string; tipo: 'tecla' | 'botao'; solto: boolean; ate: number };
