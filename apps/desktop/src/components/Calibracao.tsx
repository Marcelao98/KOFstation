// 🎯 O assistente de calibração do celular-Wiimote (M.4), no celular: 1) o meio da tela; 2) dois cantos opostos (a área
// da mira); 3) zona morta e suavização, com a mira de teste se mexendo; 4) chacoalhar três vezes; 5) mão e posição;
// 6) acertar um alvo antes de salvar. As contas estão em domain/calibracao.ts; aqui só a conversa.
import {
  acertou,
  arcosDosCantos,
  ContadorDeChacoalhadas,
  ganhoDoChacoalhar,
  textoDaCalibracao,
  type CalibracaoWii,
  type Mao,
  type Posicao,
} from '@kof/domain';
import { useEffect, useRef, useState } from 'react';
import { contarCalibracao, fecharCalibracao, usarCalibracao } from '../stores/calibracao';
import {
  ajustarMiraDeTeste,
  calibracaoAtual,
  guardarCalibracao,
  ouvirSensores,
  recentrarMira,
  temGiroscopio,
} from '../stores/sensores';

const PASSOS = ['Meio', 'Cantos', 'Mira', 'Chacoalhar', 'Mão', 'Testar'] as const;
const GRAU = Math.PI / 180;

export function Calibracao() {
  const aberto = usarCalibracao((s) => s.aberto);
  if (!aberto) return null;
  return <Assistente />;
}

function Assistente() {
  const antes = calibracaoAtual();
  const [passo, setPasso] = useState(0);
  const [cantos, setCantos] = useState<{ x: number; y: number }[]>([]);
  const [zona, setZona] = useState(antes?.zonaMorta ?? 0.03);
  const [suave, setSuave] = useState(antes?.suavizar ?? 0.3);
  const [mao, setMao] = useState<Mao>(antes?.mao ?? 'destro');
  const [posicao, setPosicao] = useState<Posicao>(antes?.posicao ?? 'apontar');
  const [mira, setMira] = useState({ x: 0, y: 0 });
  const [batidas, setBatidas] = useState(0);
  const [alvo, setAlvo] = useState({ x: 0.5, y: -0.4 });
  const [acertos, setAcertos] = useState(0);
  const [erro, setErro] = useState('');
  const angulo = useRef({ x: 0, y: 0 });
  const contador = useRef(new ContadorDeChacoalhadas());
  const dentroDesde = useRef(0);
  const arcos = arcosDosCantos(cantos);
  const arcoX = arcos?.arcoX;
  const arcoY = arcos?.arcoY;

  // a mira do assistente: sem borda nos passos de medir; com o ajuste da calibração nova depois
  useEffect(() => {
    if (passo < 2) ajustarMiraDeTeste({ arcoX: Math.PI, arcoY: Math.PI });
    else
      ajustarMiraDeTeste({
        ...(arcoX !== undefined && arcoY !== undefined ? { arcoX, arcoY } : {}),
        zonaMorta: zona,
        suavizar: suave,
      });
  }, [passo, zona, suave, arcoX, arcoY]);
  useEffect(
    () =>
      ouvirSensores((m, cru) => {
        angulo.current = cru;
        setMira({ x: m.x, y: m.y });
        if (passo === 3) setBatidas(contador.current.medir(m.acel));
      }),
    [passo],
  );
  // o alvo do teste: segurar a mira dentro dele meio segundo = acertou; três acertos e pode salvar
  useEffect(() => {
    if (passo !== 5) return;
    if (!acertou(mira, alvo)) {
      dentroDesde.current = 0;
      return;
    }
    const agora = performance.now();
    if (!dentroDesde.current) dentroDesde.current = agora;
    else if (agora - dentroDesde.current > 500) {
      dentroDesde.current = 0;
      setAcertos((n) => n + 1);
      setAlvo({
        x: Math.round((Math.random() * 1.4 - 0.7) * 10) / 10,
        y: Math.round((Math.random() * 1.2 - 0.6) * 10) / 10,
      });
    }
  }, [mira, alvo, passo]);
  // ao sair do assistente, a mira volta pra calibração guardada
  useEffect(() => () => ajustarMiraDeTeste(null), []);

  const nova = (): CalibracaoWii => ({
    versao: 1,
    arcoX: arcos?.arcoX ?? 25 * GRAU,
    arcoY: arcos?.arcoY ?? 18 * GRAU,
    zonaMorta: zona,
    suavizar: suave,
    ganhoChacoalhar: ganhoDoChacoalhar(contador.current.picos),
    mao,
    posicao,
    giroscopio: !!temGiroscopio(),
  });
  const marcarCanto = () => {
    const c = [...cantos, { ...angulo.current }];
    setCantos(c);
    setErro('');
    if (c.length >= 2) {
      if (arcosDosCantos(c)) setPasso(2);
      else {
        setCantos([]);
        setErro('os dois cantos ficaram perto demais (ou do mesmo lado): aponte de novo, um em cada ponta da tela');
      }
    }
  };
  const salvar = () => {
    guardarCalibracao(nova());
    contarCalibracao();
    fecharCalibracao();
  };

  return (
    <section id="calibracao" className="janela calibracao" aria-label="calibrar o Wiimote">
      <div className="titulo-j">
        <span>🎯 Calibrar o Wiimote</span>
        <button className="x" aria-label="fechar" onClick={fecharCalibracao}>
          ×
        </button>
      </div>
      <ol className="cal-passos">
        {PASSOS.map((p, i) => (
          <li key={p} className={i === passo ? 'agora' : i < passo ? 'feito' : ''}>
            {i + 1}. {p}
          </li>
        ))}
      </ol>
      <div className="cal-area" aria-hidden>
        <i className="cal-mira" style={{ left: `${(mira.x + 1) * 50}%`, top: `${(mira.y + 1) * 50}%` }} />
        {passo === 5 && (
          <i className="cal-alvo" style={{ left: `${(alvo.x + 1) * 50}%`, top: `${(alvo.y + 1) * 50}%` }} />
        )}
        {passo === 1 && <i className={'cal-canto ' + (cantos.length ? 'br' : 'tl')} />}
      </div>
      {erro && <p className="cal-erro">⚠ {erro}</p>}
      {passo === 0 && (
        <div className="cal-texto">
          <p>
            Segure o celular como um Wiimote, <b>apontando pro meio da tela da TV</b> (ou do PC), e toque no botão.
          </p>
          {antes && <p className="dica">Calibração de agora: {textoDaCalibracao(antes)}</p>}
          <button
            className="pm-grande"
            data-cal="meio"
            onClick={() => {
              recentrarMira();
              setCantos([]);
              setPasso(1);
            }}
          >
            📍 Aqui é o meio
          </button>
        </div>
      )}
      {passo === 1 && (
        <div className="cal-texto">
          <p>
            Agora aponte pro canto <b>{cantos.length ? 'de baixo à direita' : 'de cima à esquerda'}</b> da tela e toque.
          </p>
          <button className="pm-grande" data-cal="canto" onClick={marcarCanto}>
            📐 Aqui é o canto
          </button>
        </div>
      )}
      {passo === 2 && (
        <div className="cal-texto">
          <p>Mexa o celular e veja a mira. Ajuste até ficar firme parada e sem atraso demais.</p>
          <label>
            Zona morta (parada no meio): {Math.round(zona * 100)}%
            <input type="range" min={0} max={0.2} step={0.01} value={zona} onChange={(e) => setZona(+e.target.value)} />
          </label>
          <label>
            Suavização (menos tremida): {Math.round(suave * 100)}%
            <input
              type="range"
              min={0}
              max={0.9}
              step={0.05}
              value={suave}
              onChange={(e) => setSuave(+e.target.value)}
            />
          </label>
          <button className="pm-grande" data-cal="mira-ok" onClick={() => setPasso(3)}>
            ✔ Assim está bom
          </button>
        </div>
      )}
      {passo === 3 && (
        <div className="cal-texto">
          <p>
            <b>Chacoalhe agora</b>, como no jogo, três vezes (segure firme!). {Math.min(batidas, 3)}/3
          </p>
          <button className="pm-grande" data-cal="chacoalhar-ok" disabled={batidas < 3} onClick={() => setPasso(4)}>
            ✔ Pronto
          </button>
          <button
            className="pm-pequeno"
            onClick={() => {
              contador.current = new ContadorDeChacoalhadas();
              setPasso(4);
            }}
          >
            pular (sem aumentar o chacoalhar)
          </button>
        </div>
      )}
      {passo === 4 && (
        <div className="cal-texto">
          <p>Com que mão e de que jeito você segura?</p>
          <div className="cal-opcoes">
            {(['destro', 'canhoto'] as const).map((x) => (
              <button key={x} className={mao === x ? 'ativo' : ''} aria-pressed={mao === x} onClick={() => setMao(x)}>
                {x === 'destro' ? '✋ Destro' : '🤚 Canhoto'}
              </button>
            ))}
          </div>
          <div className="cal-opcoes">
            {(['apontar', 'de-lado'] as const).map((x) => (
              <button
                key={x}
                className={posicao === x ? 'ativo' : ''}
                aria-pressed={posicao === x}
                onClick={() => setPosicao(x)}
              >
                {x === 'apontar' ? '👉 Apontando pra TV' : '↔ Deitado, como o Wiimote de lado'}
              </button>
            ))}
          </div>
          <button className="pm-grande" data-cal="mao-ok" onClick={() => setPasso(5)}>
            ✔ Seguir
          </button>
        </div>
      )}
      {passo === 5 && (
        <div className="cal-texto">
          <p>
            Acerte o alvo com a mira (segure dentro dele um instante): <b>{Math.min(acertos, 3)}/3</b>
          </p>
          <p className="dica">{textoDaCalibracao(nova())}</p>
          <button className="pm-grande" data-cal="salvar" onClick={salvar}>
            💾 Salvar {acertos < 3 ? '(mesmo sem acertar)' : ''}
          </button>
          <button className="pm-pequeno" onClick={() => setPasso(0)}>
            ↺ Recalibrar do começo
          </button>
        </div>
      )}
      {antes && passo === 0 && (
        <button
          className="pm-pequeno"
          onClick={() => {
            guardarCalibracao(null);
            contarCalibracao();
            fecharCalibracao();
          }}
        >
          🗑 Apagar a calibração deste celular
        </button>
      )}
    </section>
  );
}
