// O estado automático como 1º cartão da tela de estados (clicar continua de onde parou).
import { quando, type RegistroJogo } from '@kof/domain';
import { usarAvisos } from '../../stores/avisos';
import { continuar } from '../../stores/auto';

export function CartaoAuto({ j }: { j: RegistroJogo }) {
  return (
    <div
      className="cartao auto"
      onClick={() =>
        void continuar(j).catch((e: unknown) =>
          usarAvisos.getState().avisar(e instanceof Error ? e.message : String(e), 4000),
        )
      }
    >
      <img src={j.autoCapa} alt="" />
      <div className="cartao-rot">⟳ automático · {j.autoQuando ? quando(j.autoQuando) : ''}</div>
    </div>
  );
}
