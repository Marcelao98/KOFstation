// 📡 Aparelhos "tipo Switch" (tarefa N.4): os arranjos prontos como botões grandes (um toque troca, com o jogo rodando)
// e os aparelhos conectados com os papéis de cada um como chips (🧠 Núcleo · 📺 Tela · 🎮 Controle). Tocar num chip
// passa aquele papel pro aparelho. Tudo é botão: o controle navega como no resto do menu.
import { ARRANJOS, MAX_APARELHOS, PAPEIS, textoDaFicha, type Papel } from '@kof/domain';
import { acao } from '../app/acoes';
import { aparelhosComPapel, arranjoAtual, trocarPapelAvulso, usarArranjo, usarArranjoPronto } from '../stores/arranjo';
import { usarRede } from '../stores/rede';

export function BlocoAparelhos({ fechar }: { fechar?: () => void }) {
  // re-desenha quando a lista, as fichas ou o arranjo mudam
  usarRede((r) => r.aparelhos);
  const arranjo = usarArranjo((s) => s.arranjo);
  usarArranjo((s) => s.fichas);
  const todos = aparelhosComPapel();
  const visiveis = todos.filter((a, i) => i === 0 || a.online).slice(0, 6);
  const ativo = arranjoAtual();
  const chip = (id: string, p: Papel) => {
    const tem =
      p === 'nucleo' ? arranjo.nucleo === id : p === 'tela' ? arranjo.tela === id : arranjo.controles.includes(id);
    const info = PAPEIS.find((x) => x.p === p) ?? { i: '', t: p };
    return (
      <button
        key={p}
        type="button"
        className={'chip-papel' + (tem ? ' tem' : '')}
        data-papel={p}
        data-aparelho={id}
        disabled={p === 'nucleo'}
        aria-pressed={tem}
        title={
          p === 'nucleo' ? 'o jogo roda neste aparelho' : tem ? `tirar ${info.t} deste aparelho` : `${info.t} aqui`
        }
        onClick={() => trocarPapelAvulso(p, id)}
      >
        {info.i} {info.t}
      </button>
    );
  };
  return (
    <div className="bloco-aparelhos" role="group" aria-label="aparelhos">
      <div className="ba-titulo">
        📡 Aparelhos <small>até {MAX_APARELHOS}</small>
      </div>
      <div className="ba-arranjos">
        {ARRANJOS.map((a) => (
          <button
            key={a.id}
            type="button"
            data-arranjo={a.id}
            className={a.id === ativo ? 'ativo' : undefined}
            title={a.dica}
            onClick={() => usarArranjoPronto(a.id)}
          >
            <b>{a.i}</b>
            <span>{a.nome}</span>
          </button>
        ))}
      </div>
      <ul className="ba-lista">
        {visiveis.map((a) => (
          <li key={a.id} data-aparelho={a.id}>
            <div className="ba-nome">
              {a.tipo === 'celular' ? '📱' : '🖥'} {a.nome}
              {a.id === 'eu' ? <small> (este)</small> : null}
            </div>
            <div className="ba-ficha">{textoDaFicha(a.ficha)}</div>
            <div className="ba-chips">{(['nucleo', 'tela', 'controle'] as const).map((p) => chip(a.id, p))}</div>
          </li>
        ))}
      </ul>
      {visiveis.length < 2 ? <p className="ba-dica">nenhum outro aparelho na rede agora</p> : null}
      <button
        type="button"
        className="ba-parear"
        onClick={() => {
          fechar?.();
          acao('aparelhos');
        }}
      >
        ＋ parear aparelho
      </button>
    </div>
  );
}
