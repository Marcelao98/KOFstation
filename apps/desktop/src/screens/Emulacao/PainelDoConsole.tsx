// O painel de um console na tela ⚙ Opções de emulação (tarefa E): valer pro console todo ou só pro jogo aberto, os
// perfis prontos (⚡ Rápido / ⚖ Equilibrado / 🎯 Fiel / ✨ Bonito) e as seções como no PCSX2 (Gráficos, Emulação, Som,
// Cartão de memória, Correções do jogo, Sistema, Controle). Cada seção mostra as principais e depois "mais opções" (o
// resto que o núcleo declara): nada escondido. A busca procura em todas as seções.
import {
  DICA_DO_PERFIL,
  fixasDe,
  GRUPOS_DE_OPCAO,
  NOME_DO_PERFIL,
  PERFIS,
  perfilEfetivo,
  resolverOpcoes,
  type GrupoDeOpcao,
  type OpcaoResolvida,
  type Perfil,
  type SistemaId,
} from '@kof/domain';
import { useState } from 'react';
import { usarEmulacao } from '../../stores/emulacao';
import { usarJogo } from '../../stores/jogo';

type Escopo = 'console' | 'jogo';

function Linha({ o, escopo, onMudar }: { o: OpcaoResolvida; escopo: Escopo; onMudar: (valor: string | null) => void }) {
  const herdado = o.origem === 'perfil' || (escopo === 'console' && o.origem === 'jogo') ? 'perfil' : o.origem;
  const meu = o.origem === escopo;
  return (
    <label className={'emu-op emu-op-nucleo' + (meu ? ' mudada' : '')} data-chave={o.def.chave}>
      <span>
        {o.def.aviso && (
          <b className="emu-aviso" title={o.def.aviso}>
            ⚠{' '}
          </b>
        )}
        {o.def.nome} {meu && <b title="ajustado por você aqui">•</b>}
        {o.def.original && <i className="emu-original"> (nome do núcleo)</i>}
      </span>
      <select value={o.valor} onChange={(e) => onMudar(e.target.value)} id={'emuc-' + o.def.chave}>
        {o.def.valores.map((v) => (
          <option key={v.valor} value={v.valor}>
            {v.nome}
          </option>
        ))}
      </select>
      <small className="dica">
        {o.def.aviso && <b className="emu-aviso">⚠ {o.def.aviso}. </b>}
        {o.def.dica} <i>{o.def.naHora ? '⚡ vale na hora' : '↻ vale ao reabrir o jogo'}</i>
        {!meu && herdado !== 'perfil' && ` · vem do ajuste do ${herdado}`}
        {meu && (
          <>
            {' · '}
            <button type="button" className="link" onClick={(e) => (e.preventDefault(), onMudar(null))}>
              voltar ao perfil
            </button>
          </>
        )}
      </small>
    </label>
  );
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function PainelDoConsole({ sistema, nome }: { sistema: SistemaId; nome: string }) {
  const escolhas = usarEmulacao((s) => s.escolhas);
  const { perfil, opcao, limpar } = usarEmulacao.getState();
  const jogoSis = usarJogo((j) => j.info?.sistema);
  const jogoId = usarJogo((j) => j.registro?.id);
  const jogoNome = usarJogo((j) => j.registro?.titulo || j.nome);
  const [escopo, setEscopo] = useState<Escopo>('console');
  const [secao, setSecao] = useState<GrupoDeOpcao | null>(null);
  const [busca, setBusca] = useState('');

  const temJogo = !!jogoId && jogoSis === sistema;
  const esc: Escopo = temJogo ? escopo : 'console';
  const idJogo = temJogo ? jogoId : undefined;
  const resolvidas = resolverOpcoes(escolhas, sistema, idJogo);
  const efetivo = perfilEfetivo(escolhas, sistema, idJogo);
  const daCamada = (esc === 'jogo' ? escolhas.jogos[idJogo ?? '']?.[sistema] : escolhas.consoles[sistema]) ?? {};
  const secoes = GRUPOS_DE_OPCAO.filter(([g]) => resolvidas.some((o) => o.def.grupo === g));
  const atual = secao && secoes.some(([g]) => g === secao) ? secao : (secoes[0]?.[0] ?? null);
  const termo = semAcento(busca.trim());
  const acha = (o: OpcaoResolvida) => !termo || semAcento(`${o.def.nome} ${o.def.dica} ${o.def.chave}`).includes(termo);
  const mudarOpcao = (o: OpcaoResolvida) => (v: string | null) => opcao(esc, sistema, idJogo, o.def.chave, v);
  const linhas = (l: OpcaoResolvida[]) =>
    l.map((o) => <Linha key={o.def.chave} o={o} escopo={esc} onMudar={mudarOpcao(o)} />);
  const mudadas = Object.keys(daCamada.opcoes ?? {}).length;

  return (
    <section id="emu-console" data-sis={sistema}>
      <div className="ct-abas ct-escopo" id="emu-escopo">
        {(
          [
            ['console', 'Todo o ' + nome],
            ['jogo', temJogo ? 'Só ' + (jogoNome || 'este jogo') : 'Só este jogo (abra o jogo)'],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            className={esc === k ? 'ativo' : ''}
            disabled={k === 'jogo' && !temJogo}
            onClick={() => setEscopo(k)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="emu-perfis" id="emu-perfis">
        <span>Perfil {esc === 'jogo' ? 'deste jogo' : 'do ' + nome}:</span>
        <button
          className={!daCamada.perfil ? 'ativo' : ''}
          onClick={() => perfil(esc, sistema, idJogo, null)}
          title={esc === 'jogo' ? 'o mesmo do console' : 'o mesmo do perfil geral'}
        >
          {esc === 'jogo' ? 'igual ao console' : 'igual ao geral'}
        </button>
        {PERFIS.map((p) => (
          <button
            key={p}
            data-perfil={p}
            className={daCamada.perfil === p ? 'ativo' : ''}
            onClick={() => perfil(esc, sistema, idJogo, p)}
            title={DICA_DO_PERFIL[p]}
          >
            {NOME_DO_PERFIL[p]}
          </button>
        ))}
        {/* o mesmo, em lista (teclado/controle e os testes) */}
        <select
          id="emu-perfil"
          className="so-leitor"
          value={daCamada.perfil ?? ''}
          onChange={(e) => perfil(esc, sistema, idJogo, (e.target.value || null) as Perfil | null)}
        >
          <option value="">{esc === 'jogo' ? 'igual ao do console' : 'igual ao geral'}</option>
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {NOME_DO_PERFIL[p]}
            </option>
          ))}
        </select>
      </div>
      <p className="dica">
        Valendo agora: <b>{NOME_DO_PERFIL[efetivo]}</b> — {DICA_DO_PERFIL[efetivo]}. Mexer numa opção ajusta só ela
        {mudadas > 0 && ` (${mudadas} ${mudadas === 1 ? 'ajustada' : 'ajustadas'} aqui)`}.
      </p>

      <input
        id="emu-busca"
        type="search"
        placeholder="🔎 procurar opção (ex.: resolução, vibração, MTVU)"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {termo ? (
        <div id="emu-resultado">
          {linhas(resolvidas.filter(acha))}
          {!resolvidas.some(acha) && <p className="dica">Nenhuma opção com “{busca}”.</p>}
        </div>
      ) : (
        <>
          <div className="ct-abas" id="emu-secoes">
            {secoes.map(([g, n]) => (
              <button key={g} data-secao={g} className={g === atual ? 'ativo' : ''} onClick={() => setSecao(g)}>
                {n} <small>{resolvidas.filter((o) => o.def.grupo === g).length}</small>
              </button>
            ))}
          </div>
          {atual && (
            <fieldset className="emu-grupo" id={'emu-secao-' + atual}>
              <legend>{secoes.find(([g]) => g === atual)?.[1]}</legend>
              {linhas(resolvidas.filter((o) => o.def.grupo === atual && !o.def.avancada))}
              {resolvidas.some((o) => o.def.grupo === atual && o.def.avancada) && (
                <>
                  <h4 className="emu-mais">Mais opções (o resto que o núcleo oferece)</h4>
                  {linhas(resolvidas.filter((o) => o.def.grupo === atual && o.def.avancada))}
                </>
              )}
              {atual === 'sistema' && fixasDe(sistema).length > 0 && (
                <div id="emu-fixas">
                  <h4 className="emu-mais">Fixas pelo app</h4>
                  {fixasDe(sistema).map(([chave, f]) => (
                    <p key={chave} className="emu-op" data-chave={chave}>
                      <span>{f.nome}</span>
                      <small className="dica">{f.motivo}</small>
                    </p>
                  ))}
                </div>
              )}
            </fieldset>
          )}
        </>
      )}

      {(daCamada.perfil || daCamada.opcoes) && (
        <button type="button" id="emu-limpar" onClick={() => limpar(esc, sistema, idJogo)}>
          Apagar os ajustes {esc === 'jogo' ? 'deste jogo' : 'do ' + nome}
        </button>
      )}
    </section>
  );
}
