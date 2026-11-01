// 💾 Estados salvos (#estados do antigo): escolher o jogo, a grade com o print de cada estado (clicar carrega, 🗑 apaga),
// o automático como primeiro cartão e a aba ⚙ Opções de emulação.
import { quando } from '@kof/domain';
import { acao } from '../../app/acoes';
import { usarEstados } from '../../stores/estados';
import { OpcoesEmu } from './OpcoesEmu';
import { CartaoAuto } from './CartaoAuto';

export function Estados() {
  const e = usarEstados();
  const temAuto = !!e.registroDaTela?.temAuto;
  return (
    <section id="estados" className="janela">
      <div className="titulo-j">
        <span>
          💾 Estados salvos —{' '}
          <select
            id="estados-jogo"
            value={e.jogoDaTela ?? ''}
            onChange={(ev) => void usarEstados.getState().mostrar(ev.target.value)}
          >
            {e.jogosComEstados.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nome}
              </option>
            ))}
          </select>
        </span>
        <button className="x" data-acao="fechar-estados" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <div className="abas-estados">
        <button
          data-acao="aba-estados"
          className={e.aba === 'estados' ? 'ativo' : ''}
          onClick={() => e.mudarAba('estados')}
        >
          💾 Estados
        </button>
        <button data-acao="aba-emu" className={e.aba === 'emu' ? 'ativo' : ''} onClick={() => e.mudarAba('emu')}>
          ⚙ Opções de emulação
        </button>
      </div>
      {e.aba === 'emu' ? (
        <OpcoesEmu />
      ) : (
        <div id="estados-conteudo">
          <div id="grade-estados">
            {temAuto && e.registroDaTela && <CartaoAuto j={e.registroDaTela} />}
            {e.lista.map((x) => (
              <div className="cartao" key={x.key} onClick={() => void e.carregar(x)}>
                <img src={x.capa || undefined} alt="" />
                <div className="cartao-rot">
                  {quando(x.quando)}
                  <button
                    className="x"
                    title="apagar"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      void e.apagar(x);
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p id="estados-vazio" className="dica" hidden={e.lista.length > 0 || temAuto}>
            Nenhum estado salvo deste jogo.{' '}
            <span className="so-pc">
              Aperte <b>F5</b> durante o jogo.
            </span>
          </p>
          <button className="grande" data-acao="salvar-estado" onClick={() => acao('salvar-estado')}>
            Salvar estado agora<span className="so-pc"> (F5)</span>
          </button>
        </div>
      )}
    </section>
  );
}
