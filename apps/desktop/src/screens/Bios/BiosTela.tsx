// 🔑 BIOS dos consoles (#bios-tela do antigo).
import { BIOS, DICA_DA_BIOS, SISTEMAS, SISTEMAS_COM_BIOS } from '@kof/domain';
import { useEffect } from 'react';
import { usarBios } from '../../stores/bios';

const nomeDo = (s: string) => SISTEMAS.find((x) => x.id === s)?.nome ?? s;
const mb = (t: number) => (t / 1048576).toFixed(t < 1048576 ? 2 : 1) + ' MB';

export function BiosTela() {
  const b = usarBios();
  useEffect(() => {
    void usarBios.getState().atualizar(); // aberta pelo menu/Início ou pela falta da BIOS: só relê a lista
  }, []);
  return (
    <section id="bios-tela" className="janela">
      <div className="titulo-j">
        <span id="bios-titulo">
          {b.falta ? (
            <>
              🔑 Falta a BIOS do <b id="bios-nome">{nomeDo(b.falta)}</b>
            </>
          ) : (
            '🔑 BIOS dos consoles'
          )}
        </span>
        <button className="x" data-acao="bios-fechar" onClick={b.fechar}>
          ×
        </button>
      </div>
      {b.falta ? (
        <p id="bios-falta">
          Esse console precisa do programa interno dele (a BIOS) pra ligar: o arquivo{' '}
          <b id="bios-arquivo">{(BIOS[b.falta] ?? []).map((x) => x.arquivo).join(', ')}</b>. O KOFstation não traz BIOS
          junto: escolha a sua uma vez e ela fica guardada.
        </p>
      ) : (
        <p id="bios-geral">
          A BIOS é o programa interno de cada console. O KOFstation não traz nenhuma: escolha a sua uma vez e ela fica
          guardada aqui dentro (pode trocar quando quiser).
        </p>
      )}
      <ul id="bios-lista">
        {SISTEMAS_COM_BIOS.map((s) => {
          const tem = b.lista.find((x) => x.sistema === s);
          return (
            <li key={s} className={tem ? 'tem' : ''}>
              <span>
                <b>{nomeDo(s)}</b>
                <small>{tem ? `✅ guardada: ${tem.nome} (${mb(tem.tamanho)})` : '⚪ ' + (DICA_DA_BIOS[s] ?? '')}</small>
              </span>
              <button className={tem ? 'grande sec' : 'grande'} data-acao={'bios:' + s} onClick={() => b.escolher(s)}>
                {tem ? 'Trocar…' : 'Escolher…'}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="bug-botoes">
        <button className="grande sec" data-acao="bios-fechar" onClick={b.fechar}>
          Fechar
        </button>
      </div>
    </section>
  );
}
