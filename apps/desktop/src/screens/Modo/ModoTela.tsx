// 🎮 Como você quer jogar? (#modo-tela do antigo): aparece ao abrir um jogo (dá pra desligar). Setas escolhem,
// Enter confirma, Esc fica no modo de sempre.
import { MODOS } from '@kof/domain';
import { useEffect, useRef, useState } from 'react';
import { usarJogo } from '../../stores/jogo';
import { usarModo } from '../../stores/modo';

export function ModoTela() {
  const { perguntando, modo } = usarModo();
  const nome = usarJogo((j) => j.nome);
  const [perguntar, setPerguntar] = useState(true);
  const ops = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!perguntando) return;
    setPerguntar(true);
    (ops.current?.querySelector<HTMLButtonElement>('.ativo') ?? ops.current?.querySelector('button'))?.focus({
      preventScroll: true,
    });
    const tecla = (e: KeyboardEvent) => {
      const bs = [...(ops.current?.querySelectorAll<HTMLButtonElement>('.modo-op') ?? [])];
      const i = bs.indexOf(document.activeElement as HTMLButtonElement);
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') bs[(i + 1) % bs.length]?.focus();
      else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') bs[(i - 1 + bs.length) % bs.length]?.focus();
      else if (e.code === 'Escape') usarModo.getState().escolher(usarModo.getState().modo, true);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    addEventListener('keydown', tecla, true);
    return () => removeEventListener('keydown', tecla, true);
  }, [perguntando]);
  if (!perguntando) return null;
  return (
    <section id="modo-tela" className="janela">
      <div className="titulo-j">
        <span>
          🎮 Como você quer jogar <b id="modo-jogo">{nome || 'este jogo'}</b>?
        </span>
      </div>
      <div id="modo-ops" ref={ops}>
        {MODOS.map(([k, n, d]) => (
          <button
            key={k}
            className={'modo-op' + (k === modo ? ' ativo' : '')}
            data-modo={k}
            onClick={() => usarModo.getState().escolher(k, perguntar)}
          >
            <b>{n}</b>
            <small>{d}</small>
          </button>
        ))}
      </div>
      <label className="modo-perg">
        <input
          type="checkbox"
          id="modo-perguntar"
          checked={perguntar}
          onChange={(e) => setPerguntar(e.target.checked)}
        />{' '}
        perguntar sempre que abrir um jogo
      </label>
      <p className="dica">
        dá pra trocar no meio do jogo pelo menu rápido<span className="so-pc"> (F2)</span> ou em Estados salvos → Opções
        de emulação
      </p>
    </section>
  );
}
