// Lugar das telas que ainda não chegaram no app novo: a janela existe (o menu leva pra cá) e diz a etapa.
import { acao, ETAPA } from '../../app/acoes';
import type { TelaId } from '../../stores/telas';

const NOMES: Record<string, string> = {
  biblioteca: '☕ Biblioteca',
  estados: '💾 Estados salvos',
  jukebox: '🎵 Jukebox',
  estatisticas: '📊 Estatísticas',
  teclas: '🎮 Controles e teclas',
  'bios-tela': '🔑 BIOS dos consoles',
  aparelhos: '📡 Aparelhos',
  jogadores: '🎮 Jogadores',
};

export function Pendente({ tela }: { tela: TelaId }) {
  return (
    <section id={tela} className="janela">
      <div className="titulo-j">
        {NOMES[tela] ?? tela}
        <button className="x" data-acao="fechar-tela" title="fechar (Esc)" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <p className="dica" style={{ padding: 16 }}>
        ⏳ Esta tela chega no app novo na etapa <b>{ETAPA[tela] ?? '?'}</b>. Enquanto isso, ela continua funcionando no
        app antigo.
      </p>
    </section>
  );
}
