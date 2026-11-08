// 📡 Aparelhos (o #aparelhos do antigo, web/rede.js): o nome deste PC, os pareados (online ou quando foram vistos),
// parear um celular (QR + código de 6 números, 2 minutos) e os aparelhos achados na rede.
import { quandoFoi } from '@kof/app-core';
import qrcode from 'qrcode-generator';
import { useEffect, useMemo, useState } from 'react';
import { acao } from '../../app/acoes';
import { usarRede } from '../../stores/rede';

function Qr({ texto }: { texto: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(texto);
    q.make();
    return q.createSvgTag({ cellSize: 6, margin: 3, scalable: true });
  }, [texto]);
  return <div id="ap-qr-img" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Tempo({ ate, ip, porta }: { ate: number; ip: string; porta: number }) {
  const [, setT] = useState(0);
  useEffect(() => {
    const r = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(r);
  }, []);
  const s = Math.max(0, Math.round((ate - Date.now()) / 1000));
  return (
    <small id="ap-tempo">
      vale por mais {s} s · {ip}:{porta}
    </small>
  );
}

function NomeDoAparelho({ nome }: { nome: string }) {
  const [v, setV] = useState(nome);
  useEffect(() => setV(nome), [nome]);
  return (
    <label className="ap-nome">
      Nome deste aparelho{' '}
      <input
        id="ap-nome"
        maxLength={40}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() && v.trim() !== nome && usarRede.getState().mandar({ t: 'nome', nome: v.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
}

export function Aparelhos() {
  const r = usarRede();
  useEffect(() => {
    usarRede.getState().setMsg('');
    usarRede.getState().mandar({ t: 'lista' });
    return () => {
      if (usarRede.getState().janela) usarRede.getState().mandar({ t: 'parear-fim' });
      usarRede.setState({ janela: null });
    };
  }, []);
  const achados = (r.achados ?? []).filter((x) => !x.pareado && !r.aparelhos.some((a) => a.id === x.id));
  return (
    <section id="aparelhos" className="janela">
      <div className="titulo-j">
        <span>📡 Aparelhos</span>
        <button className="x" data-acao="aparelhos-fechar" onClick={() => acao('fechar-tela')}>
          ×
        </button>
      </div>
      <div id="ap-sem" hidden={r.ok}>
        <p>
          O serviço de rede do KOFstation não está respondendo agora. Ele abre junto com o KOFstation; se a porta 8650
          estiver com o KOFstation antigo aberto, feche o antigo e abra este de novo. (Tento de novo a cada 10 s.)
        </p>
      </div>
      <div id="ap-com" hidden={!r.ok}>
        <p>
          Pareie o celular com o PC uma vez e depois eles se acham sozinhos na mesma Wi-Fi. Nada passa pela internet: a
          conversa é cifrada e só aparelho pareado entra.
        </p>
        <div className="ap-fases">
          <p>
            <b>✅ Já funciona:</b> parear, ver quem está conectado e <b>usar o celular como controle</b> (no celular:
            Controles → Usar este celular como controle do PC).
          </p>
          <p>
            <b>🔜 Próximas versões:</b> saves e estados sincronizando sozinhos entre os aparelhos.
          </p>
        </div>
        <NomeDoAparelho nome={r.eu?.nome ?? ''} />
        <h3>Pareados</h3>
        <ul id="ap-lista" className="ap-lista">
          {r.aparelhos.map((a) => (
            <li key={a.id} className={a.online ? 'tem' : ''} data-id={a.id}>
              <span>
                <b>{(a.tipo === 'celular' ? '📱 ' : '🖥 ') + a.nome}</b>
                <small>
                  {a.online
                    ? '🟢 conectado' + (a.ip ? ' · ' + a.ip : '')
                    : '⚪ fora da rede · visto ' + quandoFoi(a.visto)}
                </small>
              </span>
              <button
                className="grande sec"
                onClick={() =>
                  confirm(`Remover ${a.nome}? Pra voltar, precisa parear de novo.`) &&
                  r.mandar({ t: 'remover', id: a.id })
                }
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <p id="ap-vazio" className="fraco" hidden={r.aparelhos.length > 0}>
          Nenhum ainda.
        </p>
        <div>
          <button
            className="grande"
            data-acao="ap-parear"
            onClick={() => {
              r.setMsg('');
              r.mandar({ t: 'parear' });
            }}
          >
            ➕ Parear um celular
          </button>
          {r.janela && (
            <div id="ap-qr">
              <Qr texto={r.janela.qr} />
              <div>
                <p>
                  No celular: KOFstation → <b>📡 Aparelhos</b> → <b>Ler o QR do PC</b>.
                </p>
                <p>Sem câmera? Escolha este PC na lista do celular e digite o código:</p>
                <p id="ap-codigo">{r.janela.codigo.slice(0, 3) + ' ' + r.janela.codigo.slice(3)}</p>
                <Tempo ate={r.janela.ate} ip={r.janela.ip} porta={r.janela.porta} />
                <button
                  className="grande sec"
                  data-acao="ap-parear-fim"
                  onClick={() => {
                    r.mandar({ t: 'parear-fim' });
                    usarRede.setState({ janela: null });
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
        <h3>
          Na rede agora{' '}
          <button
            className="grande sec ap-achar"
            data-acao="ap-achar"
            onClick={() => {
              usarRede.setState({ achados: null, msg: '🔎 Procurando na rede…' });
              r.mandar({ t: 'achar' });
              setTimeout(() => usarRede.getState().setMsg(''), 2200);
            }}
          >
            🔎 Procurar
          </button>
        </h3>
        <ul id="ap-achados" className="ap-lista">
          {achados.map((a) => (
            <Achado key={a.id} a={a} />
          ))}
        </ul>
        <p id="ap-achados-vazio" className="fraco" hidden={!r.achados || achados.length > 0}>
          Nenhum aparelho novo achado. Os dois estão na mesma Wi-Fi e com o KOFstation aberto?
        </p>
        <p id="ap-msg" hidden={!r.msg}>
          {r.msg}
        </p>
      </div>
    </section>
  );
}

function Achado({ a }: { a: { id: string; nome: string; ip: string; porta: number } }) {
  const [cod, setCod] = useState('');
  const vai = () => {
    const c = cod.replace(/\D/g, '');
    const r = usarRede.getState();
    if (c.length !== 6) return r.setMsg('Digite os 6 números que aparecem no outro aparelho (📡 Aparelhos → Parear).');
    r.setMsg('Pareando com ' + a.nome + '…');
    r.mandar({ t: 'parear-com', ip: a.ip, porta: a.porta, senha: c, modo: 'c' });
  };
  return (
    <li>
      <span>
        <b>{'🖥 ' + a.nome}</b>
        <small>{a.ip}</small>
      </span>
      <input
        className="ap-cod"
        inputMode="numeric"
        maxLength={6}
        placeholder="código"
        value={cod}
        onChange={(e) => setCod(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && vai()}
      />
      <button className="grande" onClick={vai}>
        Parear
      </button>
    </li>
  );
}
