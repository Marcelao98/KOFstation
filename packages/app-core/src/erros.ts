// Mensagem em português pra cada código de erro (docs/API_CONTRACTS.md). Código desconhecido mostra o próprio código:
// assim o erro nunca some atrás de uma frase genérica.
const MENSAGENS: Record<string, string> = {
  BACKEND_UNREACHABLE: 'Não consegui falar com o serviço do KOFstation. Feche e abra de novo.',
  BACKEND_BAD_RESPONSE: 'O serviço do KOFstation respondeu algo que eu não entendi (versões diferentes?).',
  CONTRACT_MISMATCH: 'O app e o serviço estão em versões diferentes. Atualize o KOFstation.',
  ROOT_MISSING: 'A pasta Kof Games não foi encontrada.',
  PATH_OUTSIDE_SCOPE: 'Esse arquivo está fora das pastas que o KOFstation pode usar.',
};

export function mensagemDoErro(code: string): string {
  return MENSAGENS[code] ?? `Deu um erro inesperado (${code}).`;
}
