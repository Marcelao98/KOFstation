// O backend e o armazém desta abertura do app (escolhidos uma vez no main.tsx). As stores usam daqui; as telas não.
import { criarArmazem, type Armazem, type Backend } from '@kof/app-core';

let backend: Backend | null = null;
let armazem: Armazem | null = null;

export function ligarServicos(b: Backend): void {
  backend = b;
  armazem = criarArmazem(b);
}

export function servicos(): { backend: Backend; armazem: Armazem } {
  if (!backend || !armazem) throw new Error('serviços não ligados (ligarServicos no main.tsx)');
  return { backend, armazem };
}
