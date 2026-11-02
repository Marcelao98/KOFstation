// 📊 Estatísticas (#estatisticas do antigo): backup, as caixas (tempo total, jogos, sessões, mais jogado), os últimos
// 7 dias, a tabela por jogo e o Espaço usado.
import { duracao, tamanhoTexto } from '@kof/app-core';
import { numDia, quando, textoDia } from '@kof/domain';
import { useEffect } from 'react';
import { acao } from '../../app/acoes';
import { usarBackup } from '../../stores/backup';
import { usarEstatisticas } from '../../stores/estatisticas';

export function Estatisticas() {
  const e = usarEstatisticas();
  useEffect(() => {
    void usarEstatisticas.getState().mostrar();
  }, []);
  const l = e.lista;
  const total = l.reduce((t, x) => t + x.tempo, 0);
  const sess = l.reduce((t, x) => t + x.sessoes, 0);
  const dias: [string, Date][] = [];
  for (let i = 6; i >= 0; i--) {
    const t = Date.now() - i * 864e5;
    dias.push([textoDia(numDia(t)), new Date(t)]);
  }
  const porDia = dias.map(([k]) => l.reduce((t, x) => t + (x.dias[k] ?? 0), 0));
  const maxD = Math.max(60000, ...porDia);
  const maxT = Math.max(1, l[0]?.tempo ?? 1);
  return (
    <section id="estatisticas" className="janela">
      <div className="titulo-j">
        📊 Estatísticas{' '}
        <button className="x" data-acao="fechar-estat" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <div id="corpo-estat">
        <div className="est-acoes">
          <button data-acao="exportar-saves" onClick={() => usarBackup.getState().abrir()}>
            💾 Fazer backup (.kofsave)
          </button>
          <button data-acao="importar-saves" onClick={() => usarBackup.getState().abrir()}>
            📥 Trazer backup
          </button>
          <button data-acao="espaco" onClick={() => void e.calcularEspaco()}>
            🗄 Espaço usado
          </button>
        </div>
        <p className="dica">
          O backup (.kofsave) leva seus saves e estatísticas pro outro aparelho: faça aqui, mande o arquivo (WhatsApp,
          Drive, pendrive) e abra no KOFstation de lá. Nada se perde: o save mais novo fica e o outro vira cópia.
        </p>
        <div id="est-espaco">
          {e.espaco && (
            <>
              <h3>Espaço usado</h3>
              <table className="est-tab">
                <tbody>
                  <tr>
                    <th>O quê</th>
                    <th>Itens</th>
                    <th>Tamanho</th>
                    <th></th>
                  </tr>
                  {e.espaco.map((x) => (
                    <tr key={x.store}>
                      <td>{x.nome}</td>
                      <td>{x.items}</td>
                      <td>{tamanhoTexto(x.bytes)}</td>
                      <td>
                        {x.store === 'autos' && (
                          <button data-acao="limpar-autos" onClick={() => void e.limparAutos()}>
                            apagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="dica">
                No total: {tamanhoTexto(e.espaco.reduce((t, x) => t + x.bytes, 0))}, em arquivos na pasta de dados do
                KOFstation (o navegador não apaga nada).
              </p>
            </>
          )}
        </div>
        <div className="est-caixas">
          <Caixa rot="Tempo total" val={duracao(total)} />
          <Caixa rot="Jogos" val={String(l.length)} />
          <Caixa rot="Sessões" val={String(sess)} />
          <Caixa rot="Mais jogado" val={l[0]?.nome ?? '—'} />
        </div>
        <h3>Últimos 7 dias</h3>
        <div className="est-dias">
          {dias.map(([k, d], i) => {
            const v = porDia[i] ?? 0;
            return (
              <div key={k} className="est-dia" title={`${d.toLocaleDateString('pt-BR')}: ${duracao(v)}`}>
                <span className="est-val">{v >= 60000 ? duracao(v) : ''}</span>
                <span className="est-coluna">
                  <i style={{ height: ((v / maxD) * 100).toFixed(1) + '%' }}></i>
                </span>
                <small>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small>
              </div>
            );
          })}
        </div>
        <h3>Por jogo</h3>
        {!l.length ? (
          <p className="dica">Ainda não tem nada aqui: jogue um pouco e volte.</p>
        ) : (
          <table className="est-tab">
            <tbody>
              <tr>
                <th>Jogo</th>
                <th>Tempo jogado</th>
                <th>Sessões</th>
                <th>Última vez</th>
                <th>Primeira vez</th>
              </tr>
              {l.map((x) => (
                <tr key={x.id}>
                  <td>{x.nome}</td>
                  <td>
                    <span className="est-barra" title={duracao(x.tempo)}>
                      <i style={{ width: ((x.tempo / maxT) * 100).toFixed(1) + '%' }}></i>
                    </span>
                    {duracao(x.tempo)}
                  </td>
                  <td>{x.sessoes}</td>
                  <td>{x.ultimo ? quando(x.ultimo) : '—'}</td>
                  <td>{x.primeiro ? quando(x.primeiro) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function Caixa({ rot, val }: { rot: string; val: string }) {
  return (
    <div className="est-caixa">
      <small>{rot}</small>
      <b>{val}</b>
    </div>
  );
}
