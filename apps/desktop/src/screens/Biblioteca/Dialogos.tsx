// Janelas da pasta Kof Games: escolher a pasta (no navegador em modo app não tem diálogo de pasta com caminho: a
// pessoa cola/digita, com a sugestão já preenchida) e o plano de organização (o que vai mudar de lugar, antes de mudar).
import { chaveDaVersao, quando, sobreAVersao } from '@kof/domain';
import { useEffect, useState } from 'react';
import { usarBiblioteca } from '../../stores/biblioteca';

const MOTIVO: Record<string, string> = {
  solto: 'solto em Games',
  novo: 'em Novos',
  'pasta-errada': 'na pasta de outro console',
  'faixa-do-cd': 'faixa do CD',
  cd: 'pasta do CD',
};

export function PedirPasta() {
  const { pedirPasta, raiz } = usarBiblioteca();
  const [caminho, setCaminho] = useState('');
  useEffect(() => {
    if (pedirPasta) setCaminho(raiz?.path ?? raiz?.sugestao ?? '');
  }, [pedirPasta, raiz]);
  if (!pedirPasta) return null;
  const b = usarBiblioteca.getState();
  return (
    <section id="pasta-tela" className="janela">
      <div className="titulo-j">
        <span>📁 Pasta Kof Games</span>
        <button className="x" title="fechar" onClick={() => b.fecharPedirPasta()}>
          ×
        </button>
      </div>
      <p className="dica">
        O KOFstation usa uma pasta só, com tudo dentro: <b>Games</b> (uma pasta por console), <b>Novos</b> (solte jogos
        aqui: vão sozinhos pro lugar certo), <b>Config</b> e <b>Saves</b>. Se ela ainda não existe, eu crio.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void b.usarPasta(caminho);
        }}
      >
        <input
          id="pasta-caminho"
          value={caminho}
          autoFocus
          spellCheck={false}
          onChange={(e) => setCaminho(e.target.value)}
          placeholder="/home/você/Kof Games"
        />
        <div className="bib-botoes">
          <button className="grande" type="submit">
            Usar esta pasta
          </button>
          <button className="grande sec" type="button" onClick={() => b.fecharPedirPasta()}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

export function PlanoDeOrganizacao() {
  const plano = usarBiblioteca((s) => s.plano);
  if (!plano) return null;
  const b = usarBiblioteca.getState();
  return (
    <section id="organizar-tela" className="janela">
      <div className="titulo-j">
        <span>📁 Organizar a Kof Games</span>
        <button className="x" title="agora não" onClick={() => b.cancelarOrganizacao()}>
          ×
        </button>
      </div>
      <p className="dica">
        {plano.moves.length} {plano.moves.length === 1 ? 'coisa está' : 'coisas estão'} fora do lugar. Nada muda até
        você aplicar:
      </p>
      <ul id="organizar-lista">
        {plano.moves.map((m) => (
          <li key={m.from}>
            <span>{m.from}</span> → <b>{m.to}</b> <small>({MOTIVO[m.reason] ?? m.reason})</small>
          </li>
        ))}
      </ul>
      <div className="bib-botoes">
        <button className="grande" data-acao="organizar-aplicar" onClick={() => void b.aplicarOrganizacao()}>
          Organizar agora
        </button>
        <button className="grande sec" onClick={() => b.cancelarOrganizacao()}>
          Agora não
        </button>
      </div>
    </section>
  );
}

/** B.1: "qual versão?" de uma obra com várias (região, revisão, tradução, hack, as ROMs de um zip). ↑↓ Enter Esc. */
export function VersoesDaObra() {
  const { escolhendo, versaoSel, doZero } = usarBiblioteca();
  if (!escolhendo?.obra) return null;
  const b = usarBiblioteca.getState();
  const { titulo, versoes } = escolhendo.obra;
  return (
    <section id="versoes" className="janela" role="dialog" aria-label={`Versões de ${titulo}`}>
      <div className="titulo-j">
        <span>🎮 {titulo}: qual versão?</span>
        <button className="x" title="fechar (Esc)" onClick={() => b.fecharVersoes()}>
          ×
        </button>
      </div>
      <ul className="versoes-lista">
        {versoes.map((v, i) => {
          const s = sobreAVersao(v.nome);
          return (
            <li key={chaveDaVersao(v)}>
              <button
                className={i === versaoSel ? 'sel' : undefined}
                data-versao={i}
                onClick={() => void b.escolherVersao(i)}
                onMouseEnter={() => usarBiblioteca.setState({ versaoSel: i })}
              >
                <span className="versao-rotulo">
                  {s.pt ? '🇧🇷 ' : ''}
                  {s.rotulo}
                </span>
                <small className="dica">
                  {i === 0 && (v.jogo ? 'da última vez · ' : 'recomendada · ')}
                  {v.jogo ? `jogado ${quando(v.jogo.ultimo)}` : 'ainda não jogado'}
                  {v.pasta?.entrada ? ' · dentro de um zip' : ''}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="dica">
        ↑↓ escolhe · Enter {doZero ? 'joga do zero' : 'joga'} · Esc fecha. A escolha fica lembrada pra próxima vez.
      </p>
    </section>
  );
}
