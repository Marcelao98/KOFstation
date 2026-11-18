// A aba Geral da tela ⚙ Opções de emulação (OPCOES_EMU do antigo + o perfil geral dos consoles): o perfil que vale pra
// todo console (cada console e cada jogo podem mudar por cima), modo, perguntar, rebobinar no Normal, estados por jogo,
// salvar automático, núcleo do PS1 e pausar ao sair da janela.
import { AUTO_SEG, LIMITES_ESTADOS } from '@kof/app-core';
import {
  DICA_DO_PERFIL,
  MODOS,
  NOME_DO_PERFIL,
  PERFIS,
  REBOB_SEG,
  rebobNormalDe,
  somRebobDe,
  type ModoId,
  type Perfil,
} from '@kof/domain';
import { useState } from 'react';
import { autoLigado, autoSeg } from '../../stores/auto';
import { config } from '../../stores/config';
import { maxEstados } from '../../stores/estados';
import { usarEmulacao } from '../../stores/emulacao';
import { usarJogo } from '../../stores/jogo';
import { usarModo } from '../../stores/modo';
import { configurarRebobinar } from '../../stores/rebob';

type Op = [string, string, [string, string][], () => string, (v: string) => void, () => string];

function opcoes(): Op[] {
  const m = usarModo.getState();
  return [
    [
      'Modo de jogo',
      'modo',
      MODOS.map(([k, n]) => [k, n]),
      () => m.modo,
      (v) => usarModo.getState().mudar(v as ModoId),
      () => MODOS.find(([k]) => k === usarModo.getState().modo)?.[2] ?? '',
    ],
    [
      'Perguntar o modo ao abrir um jogo',
      'modoPerguntar',
      [
        ['1', 'sim'],
        ['0', 'não'],
      ],
      () => (config().ler('modoPerguntar') === '0' ? '0' : '1'),
      (v) => config().guardar('modoPerguntar', v),
      () => 'a escolha aparece toda vez que um jogo abre',
    ],
    [
      'Rebobinar no modo Normal',
      'rebobLimite',
      REBOB_SEG.map((s) => [String(s), s + ' segundos']),
      () => String(rebobNormalDe(config().ler('rebobLimite'))),
      (v) => {
        config().guardar('rebobLimite', v);
        usarModo.getState().aplicar();
      },
      () => {
        const s = rebobNormalDe(config().ler('rebobLimite'));
        return `segura Backspace ou Select+Y; recarrega depois de jogar ${s * 6} s. No Só alegria são 30 s sem esperar. Quanto mais tempo, mais memória`;
      },
    ],
    [
      'Som ao rebobinar',
      'somRebob',
      [
        ['fita', '📼 fita (ao contrário)'],
        ['mudo', '🔇 mudo'],
      ],
      () => somRebobDe(config().ler('somRebob')),
      (v) => {
        config().guardar('somRebob', v);
        configurarRebobinar();
      },
      () => 'a música volta de trás pra frente junto com a imagem e, ao soltar, continua de onde parou',
    ],
    [
      'Estados salvos por jogo',
      'maxEstados',
      LIMITES_ESTADOS.map((n) => [String(n), n ? 'até ' + n : 'sem limite']),
      () => String(maxEstados()),
      (v) => config().guardar('maxEstados', v),
      () => 'chegou no limite, o mais antigo sai (cada estado tem de 1 a 16 MB; PS2 bem mais)',
    ],
    [
      'Salvar automático (continuar de onde parou)',
      'autoSeg',
      [['0', 'desligado'], ...AUTO_SEG.map((s): [string, string] => [String(s), 'a cada ' + s + ' s'])],
      () => (autoLigado() ? String(autoSeg()) : '0'),
      (v) => {
        config().guardar('autoSalvar', v !== '0' ? '1' : '0');
        if (v !== '0') config().guardar('autoSeg', v);
      },
      () => 'vale em todos os modos (é o "suspender" do console); PS1/N64/PS2 no mínimo a cada 2 min',
    ],
    [
      'Núcleo do PlayStation',
      'nucleoPs1',
      [
        ['nativo', 'nativo (rápido, com recompilador)'],
        ['wasm', 'WebAssembly (o de antes)'],
      ],
      () => (config().ler('nucleoPs1') === 'wasm' ? 'wasm' : 'nativo'),
      (v) => config().guardar('nucleoPs1', v),
      () =>
        'o nativo roda fora do navegador e lê o CD direto da Kof Games; se faltar ou falhar, o PS1 abre no WebAssembly sozinho (vale no próximo jogo)',
    ],
    [
      'Pausar ao sair da janela',
      'pausaAuto',
      [
        ['1', 'sim'],
        ['0', 'não'],
      ],
      () => (config().ler('pausaAuto') === '0' ? '0' : '1'),
      (v) => config().guardar('pausaAuto', v),
      () => 'trocou de janela ou de app: o jogo espera você',
    ],
  ];
}

export function OpcoesGerais() {
  const [, setVersao] = useState(0);
  usarModo((m) => m.modo);
  const sis = usarJogo((j) => j.info?.sistema);
  const geral = usarEmulacao((s) => s.escolhas.geral);
  const mudarGeral = (p: Perfil) => usarEmulacao.getState().perfil('geral', 'snes', undefined, p);
  return (
    <div id="emu-opcoes">
      <div className="emu-perfis" id="emu-perfis-geral">
        <span>Perfil de todos os consoles:</span>
        {PERFIS.map((p) => (
          <button
            key={p}
            data-perfil={p}
            className={geral === p ? 'ativo' : ''}
            onClick={() => mudarGeral(p)}
            title={DICA_DO_PERFIL[p]}
          >
            {NOME_DO_PERFIL[p]}
          </button>
        ))}
        <select
          id="emu-perfil-geral"
          className="so-leitor"
          value={geral}
          onChange={(e) => mudarGeral(e.target.value as Perfil)}
        >
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {NOME_DO_PERFIL[p]}
            </option>
          ))}
        </select>
      </div>
      <p className="dica">
        {NOME_DO_PERFIL[geral]} — {DICA_DO_PERFIL[geral]}. Cada console (nas abas acima) e cada jogo podem ter o seu.
      </p>
      {opcoes().map(([rotulo, id, escolhas, atual, mudar, dica]) => (
        <label className="emu-op" key={id}>
          <span>{rotulo}</span>
          <select
            id={'emu-' + id}
            value={atual()}
            onChange={(e) => {
              mudar(e.target.value);
              setVersao((v) => v + 1);
            }}
          >
            {escolhas.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          <small className="dica">{dica()}</small>
        </label>
      ))}
      {sis === 'ps1' && (
        <p className="dica">⚠ PlayStation não tem rebobinar em nenhum modo: o estado dele é grande demais.</p>
      )}
    </div>
  );
}
