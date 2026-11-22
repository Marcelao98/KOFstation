// Painel de desempenho (F3), como o #desempenho do antigo: quadros por segundo e de onde vem o atraso. M16.2: mais o
// quadro a quadro (p50/p99, pior quadro, engasgos por minuto e o culpado), a CPU de cada linha do processo e o gráfico
// dos últimos 600 quadros (barras empilhadas por etapa, como o do PCSX2).
import { intervalos, LIMITE_ENGASGO, NOME_DA_ETAPA, type RegistroQuadro } from '@kof/domain';
import { useEffect, useRef } from 'react';
import { medidorDoJogo, usarJogo } from '../stores/jogo';

/** Cores das etapas no gráfico (fixas: o painel é sempre preto, como o do antigo). */
export const CORES_DAS_ETAPAS = {
  nucleo: '#5c5',
  leitura: '#dd4',
  envio: '#49f',
  pagina: '#d5d',
} as const;

const ALTURA = 72;

/** Desenha o gráfico: cada quadro uma coluna de 1 px; em cinza o intervalo desde o anterior, por cima as etapas. */
export function desenharGrafico(cv: HTMLCanvasElement, quadros: RegistroQuadro[], periodoMs: number) {
  const g = cv.getContext('2d');
  if (!g) return;
  const W = cv.width;
  const H = cv.height;
  g.clearRect(0, 0, W, H);
  const teto = periodoMs * 3; // 50 ms a 60 Hz: acima disso a coluna fica cortada (com a ponta vermelha)
  const y = (ms: number) => H - Math.min(H, (ms / teto) * H);
  const iv = intervalos(quadros);
  const x0 = W - quadros.length;
  quadros.forEach((q, i) => {
    const x = x0 + i;
    const total = iv[i] ?? 0;
    const engasgou = total > LIMITE_ENGASGO * periodoMs || q.faltas > 0;
    g.fillStyle = engasgou ? '#a335' : '#fff2';
    g.fillRect(x, y(total), 1, H - y(total));
    let base = 0;
    for (const [etapa, ms] of [
      ['nucleo', Math.max(0, q.nucleo - q.leitura)],
      ['leitura', q.leitura],
      ['envio', q.envio],
      ['pagina', q.pagina],
    ] as const) {
      if (ms <= 0) continue;
      g.fillStyle = CORES_DAS_ETAPAS[etapa];
      g.fillRect(x, y(base + ms), 1, y(base) - y(base + ms));
      base += ms;
    }
    if (engasgou) {
      g.fillStyle = '#f44';
      g.fillRect(x, 0, 1, 3);
    }
  });
  // linhas: o tempo de um quadro e o limite do engasgo
  g.fillStyle = '#9f98';
  g.fillRect(0, Math.round(y(periodoMs)), W, 1);
  g.fillStyle = '#f448';
  g.fillRect(0, Math.round(y(periodoMs * LIMITE_ENGASGO)), W, 1);
}

export function Desempenho() {
  const { desempenho, medicao, leitura, jogo } = usarJogo();
  const grafico = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = grafico.current;
    const med = medidorDoJogo();
    if (cv && med && leitura) desenharGrafico(cv, med.historico.lista(), med.periodoMs);
  }, [leitura]);
  if (!desempenho || !jogo || !medicao) return null;
  const m = medicao;
  const r = leitura?.resumo;
  return (
    <div id="desempenho">
      <div>
        {m.fps} fps · núcleo {m.nucleoMs} ms · engasgos {m.atrasos}/s · falta de som {m.faltasDeSom} · som na fila{' '}
        {m.somNaFilaMs} ms
        {m.leituraMs !== undefined ? ` · leitura da placa ${m.leituraMs} ms` : ''}
        {m.imagemMs !== undefined ? ` · imagem pra página ${m.imagemMs} ms` : ''}
        {jogo.comSom ? '' : ' · sem som'}
      </div>
      {r && (
        <div id="desempenho-quadros">
          quadro p50 {r.p50} · p99 {r.p99} · pior {r.max} ms · engasgos {r.engasgosPorMinuto}/min
          {r.culpadoMaisComum ? ` (culpa: ${NOME_DA_ETAPA[r.culpadoMaisComum]})` : ''}
          {r.porEtapa.pagina.media > 0 ? ` · desenho ${r.porEtapa.pagina.media} ms` : ''}
        </div>
      )}
      {leitura && leitura.cpu.length > 0 && (
        <div id="desempenho-cpu">CPU: {leitura.cpu.map((c) => `${c.linha} ${Math.round(c.pct)}%`).join(' · ')}</div>
      )}
      {leitura && (
        <>
          <canvas id="desempenho-grafico" ref={grafico} width={600} height={ALTURA} />
          <div className="desempenho-legenda">
            {Object.entries(CORES_DAS_ETAPAS).map(([e, cor]) => (
              <span key={e} style={{ color: cor }}>
                ■ {NOME_DA_ETAPA[e as keyof typeof CORES_DAS_ETAPAS]}{' '}
              </span>
            ))}
            <span style={{ color: '#f44' }}>▮ engasgo</span>
          </div>
        </>
      )}
    </div>
  );
}
