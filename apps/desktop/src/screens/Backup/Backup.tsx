// 💾 Backup dos saves (.kofsave): as duas caixinhas do antigo (com savestates / trazer configurações) e os botões.
// No antigo isso morava na tela de Estatísticas (que chega no M10); aqui abre pelo menu Arquivo.
import { acao } from '../../app/acoes';
import { usarBackup } from '../../stores/backup';

export function Backup() {
  const b = usarBackup();
  if (!b.aberto) return null;
  return (
    <section id="backup-tela" className="janela">
      <div className="titulo-j">
        <span>💾 Backup dos saves</span>
        <button className="x" title="fechar" onClick={() => b.fechar()}>
          ×
        </button>
      </div>
      <p className="dica">
        Um arquivo <b>.kofsave</b> leva os saves, as estatísticas e (se quiser) os estados e as configurações. Abre no
        app antigo e no novo; trazer junta com o que já tem (o save mais novo vence, o outro vira cópia).
      </p>
      <div className="bk-ops">
        <label>
          <input
            type="checkbox"
            id="bk-estados"
            checked={b.comEstados}
            onChange={(e) => b.mudar({ comEstados: e.target.checked })}
          />{' '}
          com savestates
        </label>
        <label>
          <input
            type="checkbox"
            id="bk-config"
            checked={b.comConfig}
            onChange={(e) => b.mudar({ comConfig: e.target.checked })}
          />{' '}
          trazer configurações
        </label>
      </div>
      <div className="bib-botoes">
        <button className="grande" data-acao="bk-fazer" onClick={() => void b.exportar()}>
          💾 Fazer backup
        </button>
        <button className="grande sec" data-acao="bk-trazer" onClick={() => b.escolherArquivo()}>
          📥 Trazer backup…
        </button>
        <button className="grande sec" onClick={() => acao('guia')}>
          ❓ como funciona
        </button>
      </div>
    </section>
  );
}
