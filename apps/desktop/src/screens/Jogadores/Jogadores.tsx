// 🎮 Jogadores (#jogadores do antigo): cada aparelho com a luz acendendo quando aperta e J1..J4 pra escolher o jogador
// de cada um (fica guardado pelo nome do controle).
import { JOG_CORES, juntarJogadores, type Aparelho } from '@kof/domain';
import { useEffect, useState } from 'react';
import { acao } from '../../app/acoes';
import { lerAparelhosAgora } from '../../hooks/useEntradaDoJogo';
import { usarJogadores, vagas } from '../../stores/jogadores';
import { usarJogo } from '../../stores/jogo';

export function Jogadores() {
  usarJogadores((j) => j.versao);
  const sis = usarJogo((j) => j.info?.sistema);
  const [l, setL] = useState<(Aparelho & { j: number })[]>([]);
  useEffect(() => {
    const ler = () => {
      const a = lerAparelhosAgora();
      const r = juntarJogadores(a, vagas);
      setL(a.map((x, i) => ({ ...x, j: r.j[i] ?? 0 })));
    };
    ler();
    const t = setInterval(ler, 120);
    return () => clearInterval(t);
  }, []);
  return (
    <section id="jogadores" className="janela">
      <div className="titulo-j">
        <span>🎮 Jogadores</span>
        <button className="x" data-acao="jogadores-fechar" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <p>
        Até 4 jogando juntos. Cada controle aparece aqui sozinho: aperte qualquer botão e a luz dele acende. Toque em{' '}
        <b>J1</b> a <b>J4</b> pra escolher o jogador de cada um (fica guardado pra próxima vez).
      </p>
      <ul id="jog-lista">
        {l.map((a) => (
          <li key={a.k} data-k={a.k} className={a.b || a.e?.some((v) => Math.abs(v) > 8000) ? 'apertando' : ''}>
            <span className="jog-nome">
              <i className="jog-luz" />
              <b>{a.nome}</b>
            </span>
            <span className="jog-bts">
              {[0, 1, 2, 3].map((j) => (
                <button
                  key={j}
                  className={a.j === j ? 'ativo' : ''}
                  style={{ '--cor': JOG_CORES[j] } as React.CSSProperties}
                  onClick={() => usarJogadores.getState().escolher(a.k, j)}
                >
                  J{j + 1}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="dica">
        🎮 <b>Controle de USB ou Bluetooth:</b> é só ligar. · 📱 <b>Celular:</b> pareie em 📡 Aparelhos e, no celular,
        abra <b>Controles → Usar este celular como controle do PC</b>: cada celular vira um jogador (chega no M13).
      </p>
      <p id="jog-ps2" className="dica" hidden={sis !== 'ps2'}>
        ⚠ No PS2, por enquanto, só o Jogador 1.
      </p>
    </section>
  );
}
