// 🎲 A Mesa de aparelhos (tarefa M.1), a tela inteira: os aparelhos da rede, o 🧠 Núcleo e a 📺 Tela, e J1..J4. O
// painel compacto (o mesmo, sem os cartões) fica no 📡 do menu lateral; esta abre pelo menu rápido (☰) e pelo 📡.
import { MAX_APARELHOS } from '@kof/domain';
import { acao } from '../../app/acoes';
import { PainelMesa } from '../../components/PainelMesa';

export function Mesa() {
  return (
    <section id="mesa" className="janela">
      <div className="titulo-j">
        <span>
          🎲 Mesa de aparelhos <small>até {MAX_APARELHOS}: núcleo, tela e 4 jogadores</small>
        </span>
        <button className="x" data-acao="mesa-fechar" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <PainelMesa />
    </section>
  );
}
