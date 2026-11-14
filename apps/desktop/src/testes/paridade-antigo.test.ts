// T.1: comparações automáticas com o código do antigo. Com KOF_ANTIGO=<pasta do kofstation-old> (só leitura):
//  - o menu rápido tem os mesmos itens, na mesma ordem (ITENS_RAPIDO do app.js);
//  - cada aviso literal do antigo (avisar/avisarErro) existe no novo, com o mesmo texto, ou está em DIFERENCAS
//    com o motivo (decisão de produto, não esquecimento).
// Sem KOF_ANTIGO os testes são ignorados (o CI não tem o antigo).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const antigo = process.env.KOF_ANTIGO;
const raiz = join(import.meta.dirname, '../../../..');
const appJs = () => readFileSync(join(antigo ?? '', 'web/app.js'), 'utf8');

/** Avisos do antigo que o novo diz de outro jeito (ou não precisa dizer), com o motivo. */
const DIFERENCAS: Record<string, string> = {
  'abrindo o CD de dentro do zip…': 'o novo abre o CD do zip sem aviso (a leitura é pelo Rust e é rápida)',
  'escolha também': 'o novo acha os .bin do .cue sozinho na Kof Games ou pede na tela de abrir (jogo.ts)',
  'este navegador não deixa escolher pasta; use Adicionar arquivo': 'o app novo sempre tem pasta (Rust)',
  'não consegui falar com o GitHub agora': 'o atualizador novo é do Rust e diz o motivo (atualizacao.ts)',
  '🆕 tem versão nova do KOFstation no GitHub: feche e abra o KOFstation pra atualizar':
    'o atualizador novo baixa e avisa "versão nova baixada" (atualizacao.ts)',
  '📱 o navegador está bloqueando o acesso à rede local: libere "Acesso à rede local" no cadeado/configurações do site, ou abra o KOFstation pelo KOFstation.exe/kofnes.sh atualizados. Sigo tentando…':
    'o novo usa o celular pelo Rust, sem o bloqueio do navegador (celular.ts tem texto próprio)',
  '✔ você está na versão mais nova (': 'o texto é montado em atualizacao.ts com a versão',
  'não reconheci essa BIOS (': 'montado em app-core/bios.ts com o nome do arquivo',
  'esse arquivo não parece a BIOS do': 'montado em app-core/bios.ts',
  '✅ BIOS do': 'montado em app-core/bios.ts',
};

function fonteDoNovo(): string {
  return execSync(
    "cat $(git ls-files 'apps/desktop/src/**/*.ts' 'apps/desktop/src/**/*.tsx' 'packages/*/src/**/*.ts' ':!*.test.ts')",
    { cwd: raiz, encoding: 'utf8', maxBuffer: 64 << 20 },
  );
}

describe.skipIf(!antigo)('paridade com o código do antigo', () => {
  it('menu rápido: os mesmos itens (ITENS_RAPIDO), na mesma ordem', () => {
    const js = appJs();
    const bloco = js.slice(js.indexOf('const ITENS_RAPIDO = ['), js.indexOf('function montarRapido'));
    const doAntigo = [...bloco.matchAll(/\{ t: '([^']+)'/g)].map((m) => m[1]);
    expect(doAntigo.length).toBeGreaterThan(15);
    const tsx = readFileSync(join(raiz, 'apps/desktop/src/components/MenuRapido.tsx'), 'utf8');
    const itens = tsx.slice(tsx.indexOf('function itens()'), tsx.indexOf('export function itensRemotos'));
    const doNovo = [...itens.matchAll(/\bt: '([^']+)'/g)]
      .map((m) => m[1])
      // só no novo: Jogar no PC (M13). 🏠 Início e 🎮 Controle virtual só entram no celular, como o ITENS_RAPIDO.splice do android.js do antigo
      .filter(
        (t) => !['📱 Levar pro celular', '📺 Voltar pra TV', '🏠 Início', '🎮 Controle virtual'].includes(t ?? ''),
      );
    expect(doNovo).toEqual(doAntigo);
  });

  it('cada aviso literal do antigo existe no novo, igual, ou tem motivo em DIFERENCAS', () => {
    const novo = fonteDoNovo();
    const mensagens = new Set<string>();
    for (const m of appJs().matchAll(/avisar(?:Erro)?\((['`])((?:\\.|(?!\1).)*)\1/g)) {
      const t =
        (m[2] ?? '')
          .split(/\$\{|'\s*\+/)[0]
          ?.trim()
          .replaceAll("\\'", "'")
          .replaceAll('\\"', '"') ?? '';
      if (t.length >= 8) mensagens.add(t);
    }
    expect(mensagens.size).toBeGreaterThan(40);
    const faltando = [...mensagens].filter((t) => !novo.includes(t) && !(t in DIFERENCAS));
    expect(faltando, 'avisos do antigo sem equivalente no novo (copie o texto ou explique em DIFERENCAS)').toEqual([]);
    const velhas = Object.keys(DIFERENCAS).filter((t) => novo.includes(t) || !mensagens.has(t));
    expect(velhas, 'DIFERENCAS que não precisam mais estar aqui').toEqual([]);
  });
});
