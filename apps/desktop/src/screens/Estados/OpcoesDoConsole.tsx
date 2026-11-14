// Opções de emulação do console (M16.4): perfis ⚡ Rápido / ⚖ Equilibrado / 🎯 Fiel, ajuste fino e Avançado, valendo
// pro console todo ou só pro jogo aberto. Cada opção diz se vale na hora ou só ao reabrir.
import {
  DICA_DO_PERFIL,
  NOME_DO_PERFIL,
  OPCOES_DE_NUCLEO,
  PERFIS,
  SISTEMAS,
  perfilEfetivo,
  resolverOpcoes,
  type OpcaoResolvida,
  type Perfil,
  type SistemaId,
} from '@kof/domain';
import { useState } from 'react';
import { usarEmulacao } from '../../stores/emulacao';
import { usarJogo } from '../../stores/jogo';

const GRUPOS: [string, string][] = [
  ['imagem', 'Imagem'],
  ['velocidade', 'Velocidade'],
  ['som', 'Som'],
  ['precisao', 'Precisão'],
  ['outros', 'Outros'],
];

const sistemasComCatalogo = (Object.keys(OPCOES_DE_NUCLEO) as SistemaId[]).filter((s) => OPCOES_DE_NUCLEO[s]?.length);
const nomeDe = (s: string) => SISTEMAS.find((x) => x.id === s)?.nome ?? s;

function Linha({
  o,
  escopo,
  onMudar,
}: {
  o: OpcaoResolvida;
  escopo: 'console' | 'jogo';
  onMudar: (valor: string | null) => void;
}) {
  const herdado = o.origem === 'perfil' || (escopo === 'console' && o.origem === 'jogo') ? 'perfil' : o.origem;
  const meu = o.origem === escopo;
  return (
    <label className="emu-op emu-op-nucleo" data-chave={o.def.chave}>
      <span>
        {o.def.nome} {meu && <b title="ajustado por você aqui">•</b>}
      </span>
      <select value={o.valor} onChange={(e) => onMudar(e.target.value)} id={'emuc-' + o.def.chave}>
        {o.def.valores.map((v) => (
          <option key={v.valor} value={v.valor}>
            {v.nome}
          </option>
        ))}
      </select>
      <small className="dica">
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

export function OpcoesDoConsole() {
  const escolhas = usarEmulacao((s) => s.escolhas);
  const { perfil, opcao, limpar } = usarEmulacao.getState();
  const jogoSis = usarJogo((j) => j.info?.sistema);
  const jogoId = usarJogo((j) => j.registro?.id);
  const jogoNome = usarJogo((j) => j.registro?.titulo || j.nome);
  const [escolhido, setEscolhido] = useState<SistemaId | null>(null);
  const [escopo, setEscopo] = useState<'console' | 'jogo'>('console');

  const sistema: SistemaId =
    escolhido ?? (jogoSis && sistemasComCatalogo.includes(jogoSis) ? jogoSis : (sistemasComCatalogo[0] as SistemaId));
  if (!sistema) return null;
  const temJogo = !!jogoId && jogoSis === sistema;
  const esc = temJogo ? escopo : 'console';
  const idJogo = temJogo ? jogoId : undefined;
  const resolvidas = resolverOpcoes(escolhas, sistema, idJogo);
  const efetivo = perfilEfetivo(escolhas, sistema, idJogo);
  const daCamada = (esc === 'jogo' ? escolhas.jogos[idJogo ?? '']?.[sistema] : escolhas.consoles[sistema]) ?? {};
  const mostrar = (avancada: boolean) => resolvidas.filter((o) => !!o.def.avancada === avancada);

  const lista = (itens: OpcaoResolvida[]) =>
    GRUPOS.map(([g, nome]) => {
      const doGrupo = itens.filter((o) => o.def.grupo === g);
      return (
        doGrupo.length > 0 && (
          <fieldset key={g} className="emu-grupo">
            <legend>{nome}</legend>
            {doGrupo.map((o) => (
              <Linha
                key={o.def.chave}
                o={o}
                escopo={esc}
                onMudar={(v) => opcao(esc, sistema, idJogo, o.def.chave, v)}
              />
            ))}
          </fieldset>
        )
      );
    });

  return (
    <section id="emu-console">
      <h3>Opções do console</h3>
      <label className="emu-op">
        <span>Perfil geral (todos os consoles)</span>
        <select
          id="emu-perfil-geral"
          value={escolhas.geral}
          onChange={(e) => perfil('geral', sistema, undefined, e.target.value as Perfil)}
        >
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {NOME_DO_PERFIL[p]}
            </option>
          ))}
        </select>
        <small className="dica">{DICA_DO_PERFIL[escolhas.geral]}</small>
      </label>

      <label className="emu-op">
        <span>Console</span>
        <select id="emu-console-sis" value={sistema} onChange={(e) => setEscolhido(e.target.value as SistemaId)}>
          {sistemasComCatalogo.map((s) => (
            <option key={s} value={s}>
              {nomeDe(s)}
            </option>
          ))}
        </select>
      </label>

      {temJogo && (
        <label className="emu-op">
          <span>Valer para</span>
          <select id="emu-escopo" value={esc} onChange={(e) => setEscopo(e.target.value as 'console' | 'jogo')}>
            <option value="console">o {nomeDe(sistema)} todo</option>
            <option value="jogo">só este jogo ({jogoNome})</option>
          </select>
          <small className="dica">o ajuste do jogo vence o do console</small>
        </label>
      )}

      <label className="emu-op">
        <span>Perfil {esc === 'jogo' ? 'deste jogo' : 'do ' + nomeDe(sistema)}</span>
        <select
          id="emu-perfil"
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
        <small className="dica">
          valendo agora: {NOME_DO_PERFIL[efetivo]} — {DICA_DO_PERFIL[efetivo]}. Mexer numa opção abaixo ajusta só ela.
        </small>
      </label>

      {lista(mostrar(false))}

      <details id="emu-avancado">
        <summary>Avançado</summary>
        {lista(mostrar(true))}
      </details>

      {(daCamada.perfil || daCamada.opcoes) && (
        <button type="button" id="emu-limpar" onClick={() => limpar(esc, sistema, idJogo)}>
          Apagar os ajustes {esc === 'jogo' ? 'deste jogo' : 'do console'}
        </button>
      )}
    </section>
  );
}
