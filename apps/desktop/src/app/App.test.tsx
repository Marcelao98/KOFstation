import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { criarBackendTeste } from '../platform/teste';
import { App } from './App';

describe('App mínimo', () => {
  it('mostra a info do backend', async () => {
    render(<App backend={criarBackendTeste()} />);
    expect((await screen.findByTestId('info')).textContent).toContain('Versão 0.1.0');
  });
  it('mostra o erro de comunicação em português, com o detalhe', async () => {
    render(<App backend={criarBackendTeste({ falhar: true })} />);
    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Não consegui falar com o serviço');
    expect(alerta.textContent).toContain('?backend=falha');
  });
});
