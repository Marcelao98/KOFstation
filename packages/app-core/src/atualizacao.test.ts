import { describe, expect, it } from 'vitest';
import { avisoDaAtualizacao, procurarAtualizacao, type SituacaoAtualizacao } from './atualizacao';
import type { Backend } from './backend';

const base: SituacaoAtualizacao = {
  versao: '202611071200',
  commit: 'abc',
  ligado: true,
  situacao: 'parado',
  baixados: 0,
  bytes: 0,
};

describe('atualização', () => {
  it('espera o Rust terminar de baixar', async () => {
    const pedidos: unknown[] = [];
    let vezes = 0;
    const backend = {
      chamar: (cmd: string, a: unknown) => {
        pedidos.push([cmd, a]);
        vezes++;
        return Promise.resolve(
          vezes < 3
            ? { ...base, situacao: 'procurando' }
            : { ...base, situacao: 'pronta', nova: '202611080900', baixados: 2 },
        );
      },
    } as unknown as Backend;
    const s = await procurarAtualizacao(backend, () => Promise.resolve());
    expect(s.situacao).toBe('pronta');
    expect(pedidos[0]).toEqual(['app.atualizacao', { procurar: true }]);
    expect(pedidos[1]).toEqual(['app.atualizacao', {}]);
    expect(avisoDaAtualizacao(s, false)?.texto).toContain('202611080900');
  });

  it('procura sozinha fica quieta se está em dia ou deu erro; a do menu sempre diz', () => {
    const emDia = { ...base, situacao: 'emDia' as const };
    expect(avisoDaAtualizacao(emDia, false)).toBeNull();
    expect(avisoDaAtualizacao(emDia, true)?.texto).toBe('✔ você está na versão mais nova (202611071200)');
    const erro = { ...base, situacao: 'erro' as const, erro: { code: 'NETWORK', message: 'sem internet' } };
    expect(avisoDaAtualizacao(erro, false)).toBeNull();
    expect(avisoDaAtualizacao(erro, true)).toMatchObject({ erro: true });
    const desligado = { ...base, ligado: false, motivo: 'rodando do código' };
    expect(avisoDaAtualizacao(desligado, false)).toBeNull();
    expect(avisoDaAtualizacao(desligado, true)?.texto).toContain('rodando do código');
  });

  it('resposta fora do formato vira erro com código', async () => {
    const backend = { chamar: () => Promise.resolve({ x: 1 }) } as unknown as Backend;
    await expect(procurarAtualizacao(backend)).rejects.toMatchObject({ code: 'BACKEND_BAD_RESPONSE' });
  });
});
