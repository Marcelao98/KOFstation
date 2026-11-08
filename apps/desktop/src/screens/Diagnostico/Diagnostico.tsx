// 🩺 Modo diagnóstico (M16.3): liga/desliga e exporta as sessões gravadas num .zip pra mandar.
import { useEffect, useState } from 'react';
import { usarDiagnostico } from '../../stores/diagnostico';

const kb = (b: number) =>
  b < 1 << 20 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / (1 << 20)).toFixed(1)} MB`;

export function Diagnostico() {
  const d = usarDiagnostico();
  const [escolhidas, setEscolhidas] = useState<Set<string>>(new Set());
  // abriu a janela: a sessão mais nova já vem marcada (é a que normalmente se manda)
  const maisNova = d.sessoes[0]?.sessao;
  useEffect(() => {
    if (d.aberto && maisNova) setEscolhidas(new Set([maisNova]));
  }, [d.aberto, maisNova]);
  if (!d.aberto) return null;
  const marcar = (s: string, sim: boolean) => {
    const n = new Set(escolhidas);
    if (sim) n.add(s);
    else n.delete(s);
    setEscolhidas(n);
  };
  return (
    <section id="diagnostico" className="janela">
      <div className="titulo-j">
        <span>🩺 Modo diagnóstico</span>
        <button className="x" data-acao="diagnostico-fechar" onClick={d.fechar}>
          ×
        </button>
      </div>
      <label className="bug-op">
        <input type="checkbox" id="diag-ligado" checked={d.ligado} onChange={d.alternar} /> gravar cada jogo que eu
        abrir (quadro a quadro, engasgos, máquina e opções de emulação)
      </label>
      {d.gravando && <p className="dica">● gravando agora: {d.gravando}</p>}
      <p className="dica">
        Fica em &lt;dados&gt;/diagnostico, uma pasta por jogo aberto. Não vai ROM, BIOS nem caminho de pasta: só o nome
        do jogo. Sessões com mais de 30 dias são apagadas.
      </p>
      <div id="diag-lista">
        {d.sessoes.length === 0 && <p className="dica">nenhuma sessão gravada ainda</p>}
        {d.sessoes.map((s) => (
          <label key={s.sessao} className="diag-sessao">
            <input
              type="checkbox"
              checked={escolhidas.has(s.sessao)}
              onChange={(e) => marcar(s.sessao, e.target.checked)}
            />{' '}
            <b>{s.sessao}</b> · {kb(s.bytes)}
            {s.resumo ? <span className="diag-resumo">{s.resumo.split('\n').slice(2, 5).join('\n')}</span> : null}
          </label>
        ))}
      </div>
      <div className="bug-botoes">
        <button
          className="grande"
          id="diag-exportar"
          disabled={escolhidas.size === 0}
          onClick={() => void d.exportar([...escolhidas])}
        >
          Exportar relatório (.zip)
        </button>
        <button className="grande sec" data-acao="diagnostico-fechar" onClick={d.fechar}>
          Fechar
        </button>
      </div>
    </section>
  );
}
