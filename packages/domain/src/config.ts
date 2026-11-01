// Configurações em camadas, como no antigo: Geral (`chave`) → console (`chave.<sis>`) → só este jogo
// (`chave.jogo.<jogoId>`). Vale a mais específica que existir. As chaves são as do antigo (sem o `kofnes.`).

export type LerConfig = (k: string) => string | null;

export const chaveDaCamada = (base: string, camada: 'geral' | 'console' | 'jogo', sis?: string, jogo?: string) =>
  camada === 'geral' ? base : camada === 'console' ? `${base}.${sis ?? ''}` : `${base}.jogo.${jogo ?? ''}`;

/** O valor que vale pra este jogo (o do jogo, senão o do console, senão o geral). */
export function valorEmCamadas(ler: LerConfig, base: string, sis?: string, jogo?: string): string | null {
  return (jogo ? ler(`${base}.jogo.${jogo}`) : null) ?? (sis ? ler(`${base}.${sis}`) : null) ?? ler(base);
}

/** Objetos JSON em camadas juntados (o geral por baixo, o do jogo por cima). JSON estragado conta como vazio. */
export function objetoEmCamadas<T extends object>(
  ler: LerConfig,
  base: string,
  sis?: string,
  jogo?: string,
): Partial<T> {
  const um = (k: string): Partial<T> => {
    try {
      const v = JSON.parse(ler(k) ?? 'null') as unknown;
      return v && typeof v === 'object' ? (v as Partial<T>) : {};
    } catch {
      return {}; // valor estragado: ignora essa camada
    }
  };
  return {
    ...um(base),
    ...(sis ? um(`${base}.${sis}`) : {}),
    ...(jogo ? um(`${base}.jogo.${jogo}`) : {}),
  };
}

/** Configurações que não viajam no .kofsave (a lição do Perfil do antigo: mudo/volume). */
export const NAO_LEVAR = /^(sram\.|aparelho|mudo$|volume$)/;
