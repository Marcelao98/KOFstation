// 🎯 O assistente de calibração do Wiimote (M.4), do lado do CELULAR: abre por cima de tudo (até do modo controle),
// guarda a calibração neste celular e conta pro núcleo ("calibrado"), que liga os sensores da vaga. O núcleo também
// pode pedir "recentrar" (sem abrir o assistente).
import { create } from 'zustand';
import { aoRecentrar, pedirAoNucleo } from './mesa';
import { usarMinhaVaga } from './minhaVaga';
import { calibracaoAtual, recentrarMira } from './sensores';

export const usarCalibracao = create<{ aberto: boolean }>()(() => ({ aberto: false }));

export const abrirCalibracao = (): void => usarCalibracao.setState({ aberto: true });
export const fecharCalibracao = (): void => usarCalibracao.setState({ aberto: false });

/** Conta pro núcleo que este celular está (ou não) calibrado. */
export const contarCalibracao = (): boolean => pedirAoNucleo({ t: 'calibrado', ok: !!calibracaoAtual() });

// conectou num núcleo novo: conta se já está calibrado (a calibração é do celular, vale pra qualquer PC)
let contouPara = '';
usarMinhaVaga.subscribe((s) => {
  if (!s.vista || s.de === contouPara) return;
  contouPara = s.de;
  if (calibracaoAtual()) contarCalibracao();
});

aoRecentrar(recentrarMira);
