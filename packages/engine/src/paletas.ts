// Paletas (app.js 652–670 do antigo): Game Boy original (automática = as do GBC por cartucho, verde, cinza) e NES.
export const PALETAS_GB: [string, string][] = [
  ['auto', 'Cores do Game Boy Color'],
  ['verde', 'Verde (o original)'],
  ['cinza', 'Cinza (Pocket)'],
];
export const OPCOES_PALETA_GB: Record<string, Record<string, string>> = {
  auto: { gambatte_gb_colorization: 'auto', gambatte_gb_internal_palette: 'GBC - Dark Green' },
  verde: { gambatte_gb_colorization: 'internal', gambatte_gb_internal_palette: 'GB - DMG' },
  cinza: { gambatte_gb_colorization: 'disabled' },
};
export const PALETAS_NES: [string, string][] = [
  ['default', 'Padrão'],
  ['composite-direct-fbx', 'TV de tubo'],
  ['wavebeam', 'Viva'],
];
/** As opções do núcleo pra paleta escolhida (vazio nos sistemas sem paleta). */
export function opcoesDePaleta(sistema: string, gb: string, nes: string): Record<string, string> {
  if (sistema === 'gb') return OPCOES_PALETA_GB[gb] ?? OPCOES_PALETA_GB.auto ?? {};
  if (sistema === 'nes') return { fceumm_palette: PALETAS_NES.some(([k]) => k === nes) ? nes : 'default' };
  return {};
}
