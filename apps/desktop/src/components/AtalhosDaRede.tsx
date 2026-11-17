// Atalhos da rede entre aparelhos, à mão no Início e no 📡 Aparelhos (o Marcelo pediu em 16/11: "ver o jogo aqui" e
// "usar o celular como controle" sem ter que procurar em Controles). Só aparece quando o outro aparelho está conectado:
//  - no celular, com um PC pareado online: 📺 ver o jogo do PC aqui (Jogar no PC) e 🎮 usar este celular como controle
//    do PC (o controle total: mexe no KOFstation inteiro do PC, menus e jogo);
//  - no PC, com um celular pareado online e um jogo aberto: 📱 levar o jogo pro celular / 📺 voltar pra TV.
// Não faz nada novo: chama as mesmas funções do menu rápido, do 📡 Aparelhos e do Controles.
import { acao } from '../app/acoes';
import { emModoCelular } from '../app/celular';
import { entrarModoControle } from '../stores/modoControle';
import { usarJogo } from '../stores/jogo';
import { usarRede } from '../stores/rede';
import { levarProCelular, pararTransmissao, usarTransmissao } from '../stores/transmissao';

/** O que o celular pode fazer com o PC conectado (também usado no menu rápido). */
export const ATALHOS_DO_CELULAR = {
  ver: { t: '📺 Ver o jogo do PC aqui', s: 'o jogo roda no PC e aparece neste celular, com som' },
  controle: { t: '🎮 Usar como controle do PC', s: 'este celular vira o controle: menus e jogo do PC' },
};

export function verJogoDoPc(pcId: string): void {
  entrarModoControle({ pc: pcId });
}

export function usarComoControle(): void {
  entrarModoControle(); // com um PC pareado online, vai pela rede (sem endereço e senha)
}

export function AtalhosDaRede({ onde }: { onde: 'inicio' | 'aparelhos' }) {
  const aparelhos = usarRede((r) => r.aparelhos);
  const redeOk = usarRede((r) => r.ok);
  const jogo = usarJogo((j) => j.jogo);
  const transmitindo = usarTransmissao((t) => t.ligada);
  if (!redeOk) return null;
  const celular = emModoCelular();
  const outro = aparelhos.find((a) => a.online && a.tipo === (celular ? 'pc' : 'celular'));
  if (!outro) return null;
  if (!celular && !jogo) return null;
  // do 📡 Aparelhos, fecha a tela antes, como o 🎮 Jogar no PC de lá já fazia
  const sair = () => onde === 'aparelhos' && acao('fechar-tela');
  return (
    <article className="hm-rede" id={'atalhos-rede-' + onde}>
      <small className="hm-rotulo">{(celular ? '🖥 ' : '📱 ') + outro.nome + ' conectado'}</small>
      {celular ? (
        <div className="hm-rede-botoes">
          <button
            className="grande"
            data-acao="rede-ver-jogo"
            onClick={() => {
              sair();
              verJogoDoPc(outro.id);
            }}
          >
            {ATALHOS_DO_CELULAR.ver.t}
            <small>{ATALHOS_DO_CELULAR.ver.s}</small>
          </button>
          <button
            className="grande sec"
            data-acao="rede-controle"
            onClick={() => {
              sair();
              usarComoControle();
            }}
          >
            {ATALHOS_DO_CELULAR.controle.t}
            <small>{ATALHOS_DO_CELULAR.controle.s}</small>
          </button>
        </div>
      ) : (
        <div className="hm-rede-botoes">
          {transmitindo ? (
            <button
              className="grande"
              data-acao="rede-voltar-tv"
              onClick={() => pararTransmissao('o jogo voltou pra TV')}
            >
              📺 Voltar o jogo pra TV
            </button>
          ) : (
            <button className="grande" data-acao="rede-levar" onClick={() => levarProCelular()}>
              📱 Levar o jogo pro celular
            </button>
          )}
        </div>
      )}
    </article>
  );
}
