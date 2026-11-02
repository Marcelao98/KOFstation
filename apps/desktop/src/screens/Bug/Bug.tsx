// 🐞 Reportar bug (#bug do antigo).
import { useState } from 'react';
import { usarBug } from '../../stores/bug';
import { usarJogo } from '../../stores/jogo';

export function Bug() {
  const b = usarBug();
  const temJogo = usarJogo((j) => !!j.jogo);
  const [desc, setDesc] = useState('');
  const [pacote, setPacote] = useState(true);
  if (!b.aberto) return null;
  return (
    <section id="bug" className="janela">
      <div className="titulo-j">
        <span id="bug-titulo">{b.erro ? '💥 O emulador quebrou: reportar?' : '🐞 Reportar bug'}</span>
        <button className="x" data-acao="bug-fechar" onClick={b.fechar}>
          ×
        </button>
      </div>
      {b.erro && <p id="bug-erro">💥 {b.erro.mensagem}</p>}
      <label className="dica" htmlFor="bug-desc">
        O que aconteceu? (ex.: &quot;travou quando entrei no modo sofá&quot;, &quot;o chão some na fase 2&quot;)
      </label>
      <textarea
        id="bug-desc"
        rows={4}
        autoFocus
        placeholder="conte o que você estava fazendo e o que deu errado…"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <label className="bug-op">
        <input
          type="checkbox"
          id="bug-pacote"
          disabled={!temJogo}
          checked={temJogo && pacote}
          onChange={(e) => setPacote(e.target.checked)}
        />{' '}
        incluir o pacote pra reproduzir (savestate de segundos antes + botões apertados; a ROM não vai)
      </label>
      <div className="bug-botoes">
        <button
          className="grande"
          data-acao="bug-enviar"
          onClick={() => {
            void b.enviar(desc, temJogo && pacote);
            setDesc('');
          }}
        >
          Abrir issue no GitHub
        </button>
        <button className="grande sec" data-acao="bug-fechar" onClick={b.fechar}>
          Agora não
        </button>
      </div>
      <p className="dica">
        Abre a página de issue do KOFstation já preenchida; o pacote é baixado e você arrasta ele pra dentro da issue.
      </p>
    </section>
  );
}
