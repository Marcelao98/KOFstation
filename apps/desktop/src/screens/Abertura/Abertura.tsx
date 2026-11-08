// Abertura (#abertura do antigo): tela de título → frases → os temas mais nostálgicos passando → apresentação → guia em
// 4 passos (jogos, BIOS, tema, dicas). "Pular" vai pro guia; no guia, fecha.
import { nomeDoTema } from '@kof/domain';
import { useEffect, useRef, useState } from 'react';
import { acao } from '../../app/acoes';
import { IconeApp } from '../../components/IconeApp';
import { usarBios } from '../../stores/bios';
import { usarAbertura } from '../../stores/abertura';
import { usarPrefs } from '../../stores/prefs';

const AB_FRASES = [
  '<i>Shhh…</i>',
  'Eu sei. As coisas andam difíceis.',
  'Tá tudo bem.',
  'Lembra do gosto do café de domingo?\nDo controle na mão, da TV de tubo,\ndo "só mais uma fase, mãe"?',
];
const AB_TEMAS = [
  'cafe',
  'sessao',
  'locadora',
  'casavo',
  'almoco',
  'lanhouse',
  'orkutmsn',
  'chuva',
  'caderno',
  'brasil98',
];
const AB_ESCOLHA = ['cafe', 'escuro', 'casavo', 'sessao', 'locadora', 'lanhouse', 'boteco', 'chuva'];

type Tela = 'titulo' | 'texto' | 'guia';

export function Abertura() {
  const { aberta, fechar } = usarAbertura();
  const prefs = usarPrefs();
  const biosGuardadas = usarBios((b) => b.lista);
  const [tela, setTela] = useState<Tela>('titulo');
  const [frase, setFrase] = useState('');
  const [vis, setVis] = useState(false);
  const [temaNome, setTemaNome] = useState('');
  const [passo, setPasso] = useState(1);
  const vez = useRef(0);

  useEffect(() => {
    if (!aberta) return;
    const contador = vez; // o mesmo objeto o tempo todo (é um contador, não um elemento)
    contador.current++;
    setTela('titulo');
    setPasso(1);
    return () => {
      contador.current++;
      usarPrefs.getState().desfazerExperimento();
    };
  }, [aberta]);

  const irProGuia = () => {
    vez.current++;
    usarPrefs.getState().desfazerExperimento();
    setTela('guia');
    setPasso(1);
  };

  // o filme (abFilme do antigo): qualquer tecla ou toque na tela de título começa
  useEffect(() => {
    if (!aberta || tela !== 'titulo') return;
    const comecar = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const minha = ++vez.current;
      const espera = (ms: number) =>
        new Promise<void>((ok, nao) => setTimeout(() => (minha === vez.current ? ok() : nao(new Error('pulou'))), ms));
      const mostrar = async (html: string, ms: number) => {
        setFrase(html);
        await espera(60);
        setVis(true);
        await espera(ms);
        setVis(false);
        await espera(1500);
      };
      setTela('texto');
      void (async () => {
        await espera(900);
        for (const f of AB_FRASES) await mostrar(f.replace(/\n/g, '<br>'), f.length > 40 ? 5200 : 2600);
        setFrase('Isso ainda mora em você.<br>E agora mora aqui também.');
        setVis(true);
        for (const id of AB_TEMAS) {
          usarPrefs.getState().experimentarTema(id); // só experimenta: o tema da pessoa não muda
          setTemaNome(nomeDoTema(id) ?? '');
          await espera(2400);
        }
        setVis(false);
        setTemaNome('');
        usarPrefs.getState().desfazerExperimento();
        await espera(1500);
        await mostrar(
          '<b>KOFstation.</b><br>Super Nintendo, NES, Game Boy, GBA, Mega Drive,<br>Master System, Game Gear e Neo Geo.<br>Num lugar só. Feito no Brasil. 🇧🇷',
          6000,
        );
        irProGuia();
      })().catch(() => undefined); // "pulou": outro passo já assumiu
    };
    addEventListener('keydown', comecar, true);
    const el = document.getElementById('abertura');
    el?.addEventListener('pointerdown', comecar);
    return () => {
      removeEventListener('keydown', comecar, true);
      el?.removeEventListener('pointerdown', comecar);
    };
  }, [aberta, tela]);

  if (!aberta) return null;
  const proximo = () => (passo >= 4 ? fechar(true) : setPasso(passo + 1));
  return (
    <section id="abertura" aria-label="boas-vindas ao KOFstation">
      <div className="ab-grao"></div>
      <div className="ab-tela" id="ab-titulo" hidden={tela !== 'titulo'}>
        <IconeApp className="ab-logo" />
        <h1>KOFstation</h1>
        <p className="ab-piscar">pressione qualquer botão</p>
      </div>
      <div className="ab-tela" id="ab-texto" hidden={tela !== 'texto'}>
        <p id="ab-frase" className={vis ? 'vis' : ''} dangerouslySetInnerHTML={{ __html: frase }} />
        <small id="ab-tema">{temaNome}</small>
      </div>
      <div className="ab-tela" id="ab-guia" hidden={tela !== 'guia'}>
        <ol className="ab-pontos">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className={i <= passo ? 'feito' : ''}></li>
          ))}
        </ol>
        <div className="ab-passo" data-passo="1" hidden={passo !== 1}>
          <h2>🎮 Seus jogos</h2>
          <p>
            O KOFstation não vem com jogos: traga os seus. Super Nintendo, NES, Game Boy, GBA, Mega Drive, Master
            System, Game Gear e Neo Geo.
          </p>
          <div className="ab-botoes">
            <button className="grande" data-acao="pasta" onClick={() => acao('pasta')}>
              📁 Escolher a pasta Kof Games
            </button>
            <button className="grande sec" data-acao="abrir" onClick={() => acao('abrir')}>
              ＋ Adicionar um arquivo
            </button>
          </div>
        </div>
        <div className="ab-passo" data-passo="2" hidden={passo !== 2}>
          <h2>
            🔑 BIOS <small>(opcional)</small>
          </h2>
          <p>
            Alguns consoles têm um programa interno, a BIOS. O GBA roda sem ela; o Neo Geo precisa do <b>neogeo.zip</b>.
            O KOFstation não traz BIOS: se tiver a sua, escolha uma vez e ela fica guardada.
          </p>
          <ul className="ab-bios">
            <li data-sis="gba">🟢 Game Boy Advance: roda sem BIOS</li>
            <li data-sis="neogeo">
              {biosGuardadas.some((b) => b.sistema === 'neogeo')
                ? '✅ Neo Geo: neogeo.zip guardado'
                : '⚪ Neo Geo: falta o neogeo.zip (só precisa pra jogar Neo Geo)'}
            </li>
          </ul>
          <div className="ab-botoes">
            <button
              className="grande sec"
              data-acao="bios-tela"
              onClick={() => {
                fechar(false);
                acao('bios-tela');
              }}
            >
              Guardar uma BIOS…
            </button>
          </div>
        </div>
        <div className="ab-passo" data-passo="3" hidden={passo !== 3}>
          <h2>🎨 Seu tema</h2>
          <p>Escolha a cara do seu KOFstation. Dá pra trocar quando quiser.</p>
          <div className="ab-temas">
            {AB_ESCOLHA.map((id) => (
              <button
                key={id}
                data-tema={id}
                className={prefs.tema === id ? 'ativo' : ''}
                onClick={() => prefs.escolherTema(id)}
              >
                {nomeDoTema(id) ?? id}
              </button>
            ))}
          </div>
          <div className="ab-botoes">
            <button
              className="grande sec"
              data-acao="ab-todos-temas"
              onClick={() => {
                fechar(false);
                acao('temas');
              }}
            >
              Ver todos os temas ▸
            </button>
          </div>
        </div>
        <div className="ab-passo" data-passo="4" hidden={passo !== 4}>
          <h2>Bem-vindo de volta. ☕</h2>
          <ul className="ab-dicas">
            <li>
              <kbd>F5</kbd> salva o momento, <kbd>F8</kbd> volta nele
            </li>
            <li>
              Segure <kbd>Backspace</kbd> pra voltar no tempo
            </li>
            <li>
              <kbd>F7</kbd> guarda a música que está tocando na Jukebox
            </li>
            <li>Controle USB funciona sozinho</li>
          </ul>
        </div>
        <div className="ab-nav">
          <button
            className="grande sec"
            data-acao="ab-voltar"
            style={{ visibility: passo > 1 ? 'visible' : 'hidden' }}
            onClick={() => setPasso(Math.max(1, passo - 1))}
          >
            ◂ Voltar
          </button>
          <button className="grande" data-acao="ab-proximo" onClick={proximo}>
            {passo === 4 ? 'Começar ▸' : 'Próximo ▸'}
          </button>
        </div>
      </div>
      <button
        className="ab-pular"
        data-acao="ab-pular"
        hidden={tela === 'titulo'}
        onClick={() => (tela === 'guia' ? fechar(true) : irProGuia())}
      >
        {tela === 'guia' ? 'Pular o guia ▸' : 'Pular ▸'}
      </button>
    </section>
  );
}
