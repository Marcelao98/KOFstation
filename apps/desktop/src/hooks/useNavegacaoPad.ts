// Liga o controle (e as setas no Início/galeria) à navegação das telas: o direcional escolhe o botão mais perto, segurar
// repete, A clica, B fecha/volta, Start vai pro Início (no Início, A/Start = ação principal e X = biblioteca).
import { observarControle } from '@kof/app-core';
import { BOTAO } from '@kof/domain';
import { bitsDeTodos, controlesDoNavegador } from '@kof/engine';
import { useEffect } from 'react';
import { acao } from '../app/acoes';
import { teclaDoRapido } from '../components/MenuRapido';
import { usarJogo } from '../stores/jogo';
import { maisPerto, REPETE_MS, REPETE_PRIMEIRA_MS } from '../app/foco';
import { usarTelas } from '../stores/telas';

const FOCAVEIS = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
let atual: HTMLElement | null = null;

const visivel = (e: HTMLElement) => {
  if ((e as HTMLButtonElement).disabled || e.closest('[hidden]')) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
};

/** A tela de cima agora (a galeria de temas fica por cima de tudo). */
export function telaDeCima(): HTMLElement | null {
  const t = usarTelas.getState();
  if (t.temasAberto) return document.getElementById('temas');
  return t.atual === 'jogo' ? null : document.getElementById(t.atual);
}

function escolher(e: HTMLElement) {
  atual?.classList.remove('foco-pad');
  atual = e;
  e.classList.add('foco-pad');
  e.focus({ preventScroll: true });
  e.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

export function soltarFoco() {
  atual?.classList.remove('foco-pad');
  atual = null;
}

export function mover(tela: HTMLElement, dx: number, dy: number) {
  const cands = [...tela.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(visivel);
  if (!cands.length) return;
  if (!atual || !tela.contains(atual) || !visivel(atual)) {
    const primeiro = cands.find((e) => e.classList.contains('grande')) ?? cands[0];
    if (primeiro) escolher(primeiro);
    return;
  }
  const a = atual;
  const outros = cands
    .filter((c) => c !== a && !c.contains(a) && !a.contains(c))
    .map((c) => [c, c.getBoundingClientRect()] as const);
  const m = maisPerto(a.getBoundingClientRect(), outros, dx, dy);
  if (m) escolher(m);
}

function principalDoInicio(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#hm-destaque .grande');
}

export function useNavegacaoPad() {
  useEffect(() => {
    let dirAntes = 0;
    let proxima = 0;
    const parar = observarControle({ ler: () => bitsDeTodos(controlesDoNavegador()) }, (b, novos) => {
      if (usarJogo.getState().rapidoAberto) {
        // menu rápido: o direcional anda e ajusta, A confirma, B fecha (com repetição segurando, como nas telas)
        const dirR = b & (BOTAO.Cima | BOTAO.Baixo | BOTAO.Esquerda | BOTAO.Direita);
        const agoraR = performance.now();
        if (!dirR) dirAntes = 0;
        else if (dirR !== dirAntes || agoraR >= proxima) {
          proxima = agoraR + (dirR !== dirAntes ? REPETE_PRIMEIRA_MS : REPETE_MS);
          dirAntes = dirR;
          const code =
            dirR & BOTAO.Baixo
              ? 'ArrowDown'
              : dirR & BOTAO.Cima
                ? 'ArrowUp'
                : dirR & BOTAO.Esquerda
                  ? 'ArrowLeft'
                  : 'ArrowRight';
          teclaDoRapido.tratar?.(code);
        }
        if (novos & BOTAO.A) teclaDoRapido.tratar?.('Enter');
        if (novos & BOTAO.B) teclaDoRapido.tratar?.('Escape');
        return;
      }
      const tela = telaDeCima();
      if (!tela) return soltarFoco();
      if (atual && !tela.contains(atual)) soltarFoco();
      const dir = b & (BOTAO.Cima | BOTAO.Baixo | BOTAO.Esquerda | BOTAO.Direita);
      const agora = performance.now();
      if (!dir) dirAntes = 0;
      else if (dir !== dirAntes || agora >= proxima) {
        proxima = agora + (dir !== dirAntes ? REPETE_PRIMEIRA_MS : REPETE_MS);
        dirAntes = dir;
        const dx = dir & BOTAO.Direita ? 1 : dir & BOTAO.Esquerda ? -1 : 0;
        const dy = dir & BOTAO.Baixo ? 1 : dir & BOTAO.Cima ? -1 : 0;
        const el = atual;
        if (el instanceof HTMLSelectElement && dx) {
          el.selectedIndex = (el.selectedIndex + dx + el.options.length) % el.options.length;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el instanceof HTMLInputElement && el.type === 'range' && dx) {
          if (dx > 0) el.stepUp();
          else el.stepDown();
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else mover(tela, dx, dy);
      }
      const inicio = tela.id === 'home';
      if (novos & BOTAO.A) {
        if (atual) atual.click();
        else if (inicio) principalDoInicio()?.click();
        else mover(tela, 0, 1);
      }
      if (novos & BOTAO.Start) {
        if (inicio) principalDoInicio()?.click();
        else acao('home');
      }
      if (novos & BOTAO.X && inicio) acao('biblioteca');
      if (novos & BOTAO.B) {
        const x = tela.querySelector<HTMLElement>('.titulo-j .x');
        if (x && visivel(x)) x.click();
        else usarTelas.getState().voltar();
      }
    });
    const mouse = () => soltarFoco(); // voltou pro mouse: some o destaque
    addEventListener('pointerdown', mouse, true);
    return () => {
      parar();
      removeEventListener('pointerdown', mouse, true);
    };
  }, []);
}
