// 🎲 A Mesa (tarefa M.1): tudo da rede num lugar só. No alto, os aparelhos como cartões (ficha, na rede ou não,
// atraso); no meio, 🧠 Núcleo e 📺 Tela; embaixo, J1..J4 com o aparelho e o tipo de controle. Tudo é botão (o
// controle navega como no resto do app): tocar no aparelho de uma vaga passa pro próximo, tocar no tipo troca o tipo.
// Em qualquer aparelho: "📺 Trazer a imagem pra cá" e "🎮 Entrar como jogador". Num aparelho que não é o núcleo (sem
// jogo aberto aqui), mostra a mesa que o núcleo contou e os pedidos vão pra ele.
import {
  ehWiimote,
  estadoDaVaga,
  JOG_CORES,
  nomeDoTipo,
  textoDaFicha,
  tiposDoConsole,
  TIPOS_CONTROLE,
  type TipoControle,
} from '@kof/domain';
import { abrirCalibracao } from '../stores/calibracao';
import { aparelhosComPapel } from '../stores/arranjo';
import { usarJogo } from '../stores/jogo';
import {
  calibrado,
  ehCelular,
  entrarComoJogador,
  imagemPraCa,
  nomeNaMesa,
  pedirAoNucleo,
  recentrarNoCelular,
  tirarJogador,
  trocarMesa,
  trocarNunchuk,
  trocarTipo,
  usarMesa,
  usarSemCalibrar,
} from '../stores/mesa';
import { minhaVista, usarMinhaVaga } from '../stores/minhaVaga';
import { usarRede } from '../stores/rede';

const EU = 'eu';
const icone = (t: TipoControle | '') => TIPOS_CONTROLE.find((x) => x.t === t)?.i ?? '';

/** O próximo da lista depois de `atual` (com volta). */
function proximo<T>(l: readonly T[], atual: T): T {
  const i = l.indexOf(atual);
  return l[(i + 1) % l.length] as T;
}

export function PainelMesa({ compacto = false }: { compacto?: boolean }) {
  usarRede((r) => r.aparelhos);
  const { mesa, atraso } = usarMesa();
  usarMesa((m) => m.calibrados);
  const temJogo = usarJogo((j) => !!j.jogo);
  const sis = usarJogo((j) => j.info?.sistema ?? '');
  usarMinhaVaga((s) => s.quando);
  const vista = temJogo ? null : minhaVista();
  if (vista) return <MesaDeOutro compacto={compacto} />;

  const todos = aparelhosComPapel();
  const on = todos.filter((a) => a.online);
  const online = (id: string) => !!todos.find((a) => a.id === id)?.online;
  const tipoDe = (id: string) => todos.find((a) => a.id === id)?.tipo ?? 'pc';
  // quem pode ocupar uma vaga: este aparelho e os da rede que não estão em outra vaga
  const candidatos = (vaga: number) => [
    '',
    ...on
      .map((a) => a.id)
      .filter(
        (id) => id === EU || !mesa.jogadores.some((j, i) => i !== vaga && (j?.aparelho === id || j?.nunchuk === id)),
      ),
  ];
  const trocarAparelho = (vaga: number) => {
    const atual = mesa.jogadores[vaga]?.aparelho ?? '';
    const id = proximo(candidatos(vaga), atual);
    if (!id) return void tirarJogador(vaga);
    const jogadores = [...mesa.jogadores];
    jogadores[vaga] = { aparelho: id, tipo: tiposDoConsole(sis, tipoDe(id))[0] ?? 'controle' };
    if (id !== EU && tipoDe(id) === 'celular' && sis === 'wii') jogadores[vaga] = { aparelho: id, tipo: 'wiimote' };
    trocarMesa({ ...mesa, jogadores });
  };
  const telas = [EU, ...on.filter((a) => a.id !== EU).map((a) => a.id)];

  return (
    <div className={'painel-mesa' + (compacto ? ' compacto' : '')} role="group" aria-label="mesa de aparelhos">
      {!compacto && (
        <ul className="pm-cartoes" aria-label="aparelhos na rede">
          {todos.slice(0, 8).map((a) => (
            <li key={a.id} data-aparelho={a.id} className={a.online ? 'on' : 'off'}>
              <b>
                {a.tipo === 'celular' ? '📱' : '🖥'} {a.nome}
                {a.id === EU ? <small> (este)</small> : null}
              </b>
              <span className="pm-ficha">{textoDaFicha(a.ficha)}</span>
              <span className="pm-rede">
                {a.id === EU
                  ? 'aqui'
                  : a.online
                    ? atraso[a.id] !== undefined
                      ? `📶 ${atraso[a.id]} ms`
                      : 'na rede'
                    : 'fora da rede'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="pm-imagem">
        <div className="pm-papel" data-papel="nucleo">
          <small>🧠 Núcleo</small>
          <b>{nomeNaMesa(mesa.nucleo)}</b>
        </div>
        <button
          type="button"
          className="pm-papel"
          data-papel="tela"
          title="tocar troca o aparelho da imagem"
          onClick={() => trocarMesa({ ...mesa, tela: proximo(telas, mesa.tela) })}
        >
          <small>📺 Tela</small>
          <b>{nomeNaMesa(mesa.tela)}</b>
        </button>
      </div>
      <ol className="pm-vagas">
        {mesa.jogadores.map((j, i) => {
          const est = estadoDaVaga(j, online, calibrado, ehCelular);
          const tipos = j ? tiposDoConsole(sis, tipoDe(j.aparelho)) : [];
          return (
            <li key={i} data-vaga={i} data-estado={est} style={{ '--cor': JOG_CORES[i] } as React.CSSProperties}>
              <span className="pm-j">J{i + 1}</span>
              <button type="button" className="pm-aparelho" data-vaga-aparelho={i} onClick={() => trocarAparelho(i)}>
                {j ? nomeNaMesa(j.aparelho) : 'livre'}
                {est === 'esperando' ? <small> esperando…</small> : null}
                {j && j.aparelho !== EU && atraso[j.aparelho] !== undefined ? (
                  <small className="pm-ms"> {atraso[j.aparelho]} ms</small>
                ) : null}
              </button>
              {j && (
                <button
                  type="button"
                  className="pm-tipo"
                  data-vaga-tipo={i}
                  disabled={tipos.length < 2}
                  onClick={() => trocarTipo(i, proximo(tipos, j.tipo))}
                >
                  {icone(j.tipo)} {nomeDoTipo(j.tipo)}
                </button>
              )}
              {j?.tipo === 'wiimote+nunchuk' && !compacto && (
                <button
                  type="button"
                  className="pm-tipo"
                  data-vaga-nunchuk={i}
                  title="outro celular como Nunchuk (o mesmo jogador)"
                  onClick={() => {
                    const l = [
                      '',
                      ...on.filter((a) => a.tipo === 'celular' && a.id !== j.aparelho && a.id !== EU).map((a) => a.id),
                    ];
                    trocarNunchuk(i, proximo(l, j.nunchuk ?? '') || undefined);
                  }}
                >
                  🥢 {j.nunchuk ? nomeNaMesa(j.nunchuk) : 'Nunchuk: no mesmo celular'}
                </button>
              )}
              {est === 'calibrar' && j && (
                <span className="pm-calibrar">
                  ⚠ Wiimote sem calibrar (os sensores ficam desligados).{' '}
                  <button type="button" data-vaga-semcal={i} onClick={() => usarSemCalibrar(i, true)}>
                    usar sem calibrar
                  </button>
                </span>
              )}
              {j && ehWiimote(j.tipo) && ehCelular(j.aparelho) && est === 'ok' && !compacto && (
                <button type="button" className="pm-tipo" onClick={() => recentrarNoCelular(j.aparelho)}>
                  ⊕ recentrar
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div className="pm-botoes">
        <button type="button" className="pm-grande" data-mesa="imagem" onClick={() => imagemPraCa()}>
          📺 Trazer a imagem pra cá
        </button>
        <button
          type="button"
          className="pm-grande"
          data-mesa="entrar"
          disabled={mesa.jogadores.some((j) => j?.aparelho === EU)}
          onClick={() => entrarComoJogador(EU)}
        >
          🎮 Entrar como jogador
        </button>
      </div>
      {sis === 'wii' && !compacto && (
        <p className="pm-dica">
          📳 Celular como Wiimote: no celular, entre como jogador e toque em <b>🎯 Calibrar</b>. Nada liga sozinho: os
          sensores só entram com a vaga em Wiimote e o celular calibrado.
        </p>
      )}
    </div>
  );
}

/** A mesa vista de um aparelho que não é o núcleo: as vagas e os pedidos pro núcleo. */
function MesaDeOutro({ compacto }: { compacto: boolean }) {
  const v = minhaVista();
  if (!v) return null;
  const wii = v.sistema === 'wii';
  return (
    <div className={'painel-mesa outro' + (compacto ? ' compacto' : '')} role="group" aria-label="mesa de aparelhos">
      <p className="pm-dica">
        🧠 O jogo roda em <b>{nomeNaMesa(usarMinhaVaga.getState().de)}</b>
        {v.jogo ? <> ({v.jogo})</> : null}
      </p>
      <ol className="pm-vagas">
        {v.vagas.map((x, i) => (
          <li
            key={i}
            data-vaga={i}
            data-estado={!x.nome ? 'livre' : x.esperando ? 'esperando' : 'ok'}
            className={i === v.voce ? 'voce' : ''}
            style={{ '--cor': JOG_CORES[i] } as React.CSSProperties}
          >
            <span className="pm-j">J{i + 1}</span>
            <span className="pm-aparelho">
              {x.nome || 'livre'}
              {i === v.voce ? <small> (você)</small> : null}
            </span>
            {x.tipo && (
              <span className="pm-tipo">
                {icone(x.tipo)} {nomeDoTipo(x.tipo)}
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="pm-botoes">
        <button
          type="button"
          className="pm-grande"
          data-mesa="imagem"
          disabled={v.tela}
          onClick={() => pedirAoNucleo({ t: 'tela' })}
        >
          📺 Trazer a imagem pra cá
        </button>
        {v.voce < 0 ? (
          <button type="button" className="pm-grande" data-mesa="entrar" onClick={() => pedirAoNucleo({ t: 'entrar' })}>
            🎮 Entrar como jogador
          </button>
        ) : (
          <button type="button" className="pm-grande" data-mesa="sair" onClick={() => pedirAoNucleo({ t: 'sair' })}>
            🚪 Sair da vaga J{v.voce + 1}
          </button>
        )}
        {wii && v.voce >= 0 && ehWiimote(v.tipo || undefined) && !v.nunchuk && (
          <button type="button" className="pm-grande" data-mesa="calibrar" onClick={abrirCalibracao}>
            🎯 Calibrar o Wiimote
          </button>
        )}
      </div>
    </div>
  );
}
