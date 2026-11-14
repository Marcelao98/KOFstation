// Modo celular (M14.2): a página ganha a classe `celular` no <html> (o styles/celular.css só vale com ela): controle de
// toque na tela, barra de baixo, telas em coluna. Liga quando o aparelho é de toque com tela pequena/Android, com
// `?celular=1` na URL (pra testar no navegador do PC) ou dentro do APK (backend android).
const CHAVE = 'kofstation.celular';

export function ehCelular(url: URL = new URL(location.href), g: typeof globalThis = globalThis): boolean {
  const p = url.searchParams.get('celular');
  try {
    if (p === '1') sessionStorage.setItem(CHAVE, '1');
    else if (p === '0') sessionStorage.removeItem(CHAVE);
    else if (sessionStorage.getItem(CHAVE) === '1') return true;
  } catch {
    // sem sessionStorage: vale só o que veio na URL
  }
  if (p === '1') return true;
  if (p === '0') return false;
  if ((g as { KofAndroid?: unknown }).KofAndroid) return true; // dentro do APK
  const ua = g.navigator?.userAgent ?? '';
  const toque = (g.navigator?.maxTouchPoints ?? 0) > 0 && !!g.matchMedia?.('(pointer: coarse)').matches;
  return toque && /Android|iPhone|iPad/i.test(ua);
}

export function ligarModoCelular(): boolean {
  const sim = ehCelular();
  document.documentElement.classList.toggle('celular', sim);
  return sim;
}

export const emModoCelular = (): boolean => document.documentElement.classList.contains('celular');

/**
 * Botão Voltar do Android (a casca chama `window.__kofVoltar()` antes de sair): fecha o menu rápido; no jogo, abre o
 * menu rápido; numa tela, volta uma; no Início devolve `false` e a casca fecha o app. Devolve se tratou o botão.
 */
export async function ligarVoltarDoAndroid(): Promise<void> {
  const [{ usarJogo }, { usarTelas }] = await Promise.all([import('../stores/jogo'), import('../stores/telas')]);
  (globalThis as { __kofVoltar?: () => boolean }).__kofVoltar = () => {
    const j = usarJogo.getState();
    const t = usarTelas.getState();
    if (j.rapidoAberto) {
      j.fecharRapido();
      return true;
    }
    if (t.atual === 'jogo' && j.jogo) {
      j.abrirRapido();
      return true;
    }
    if (t.atual !== 'home') {
      t.voltar();
      return true;
    }
    return false;
  };
}
