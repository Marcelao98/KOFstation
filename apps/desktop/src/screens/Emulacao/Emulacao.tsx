// ⚙ Opções de emulação (tarefa E): uma tela grande como a dos Controles. Abas: Geral (o perfil de todos os consoles e
// as opções do app) e uma por console com opções (PS2, PS1, N64, SNES…), cada uma com os perfis prontos e as seções
// como no PCSX2. Abre no console do jogo aberto (botão direito no jogo → ⚙ Opções de emulação). A janela rola inteira.
import { OPCOES_DE_NUCLEO, SISTEMAS, type SistemaId } from '@kof/domain';
import { useState } from 'react';
import { acao } from '../../app/acoes';
import { usarEmulacao } from '../../stores/emulacao';
import { usarJogo } from '../../stores/jogo';
import { OpcoesGerais } from './OpcoesGerais';
import { PainelDoConsole } from './PainelDoConsole';

/** Os consoles com opções, na ordem da lista de sistemas (Mega, Master e Game Gear: o mesmo núcleo, ajustes separados). */
const CONSOLES = SISTEMAS.filter((s) => OPCOES_DE_NUCLEO[s.id as SistemaId]?.length).map((s) => s.id as SistemaId);
const nomeDe = (s: string) => SISTEMAS.find((x) => x.id === s)?.nome ?? s;

export function Emulacao() {
  const jogoSis = usarJogo((j) => j.info?.sistema) as SistemaId | undefined;
  const [aba, setAba] = useState<SistemaId | 'geral'>(() => {
    const pedida = usarEmulacao.getState().abaInicial;
    if (pedida === 'geral' || CONSOLES.includes(pedida as SistemaId)) return pedida as SistemaId | 'geral';
    return jogoSis && CONSOLES.includes(jogoSis) ? jogoSis : 'geral';
  });
  return (
    <section id="emulacao" className="janela">
      <div className="titulo-j">
        ⚙ Opções de emulação{' '}
        <button className="x" data-acao="fechar-emulacao" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <div id="emu-abas" className="ct-abas">
        <button data-sis="geral" className={aba === 'geral' ? 'ativo' : ''} onClick={() => setAba('geral')}>
          Geral
        </button>
        {CONSOLES.map((s) => (
          <button key={s} data-sis={s} className={aba === s ? 'ativo' : ''} onClick={() => setAba(s)}>
            {nomeDe(s)}
            {s === jogoSis && ' 🎮'}
          </button>
        ))}
      </div>
      {aba === 'geral' ? <OpcoesGerais /> : <PainelDoConsole key={aba} sistema={aba} nome={nomeDe(aba)} />}
    </section>
  );
}
