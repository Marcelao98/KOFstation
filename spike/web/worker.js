// Roda um núcleo libretro do kofstation-old num Web Worker e mede quantos quadros por segundo ele faz, sem limite.
// Os núcleos foram compilados com ENVIRONMENT=web,node: aqui o Worker se passa por "web".
self.window = self;
onmessage = async ({ data }) => {
  const { url, nucleo, rom, arquivo, caminho, segundos } = data;
  try {
    importScripts(url);
    const log = [];
    const m = await self['Nucleo_' + nucleo]({ print: (s) => log.push(s), printErr: (s) => log.push(s) });
    m._lr_init();
    const cstr = (s) => { const b = new TextEncoder().encode(s + '\0'); const p = m._lr_alloc(b.length); m.HEAPU8.set(b, p); return p; };
    const p = m._lr_alloc(rom.length);
    m.HEAPU8.set(rom, p);
    let ok;
    if (caminho) { m._lr_arquivo(cstr(caminho), p, rom.length); ok = m._lr_load(0, 0, cstr(caminho)); }
    else ok = m._lr_load(p, rom.length, cstr(arquivo));
    if (!ok) { postMessage({ nucleo, erro: 'o núcleo não aceitou a ROM', log: log.slice(-4) }); return; }
    for (let i = 0; i < 30; i++) m._lr_run(1, 1);
    const t0 = performance.now();
    let n = 0;
    while (performance.now() - t0 < segundos * 1000) { m._lr_run(1, 1); n++; }
    const ms = performance.now() - t0;
    postMessage({ nucleo, fps: Math.round((n * 1000) / ms), largura: m._lr_w(), altura: m._lr_h() });
  } catch (e) {
    postMessage({ nucleo, erro: String(e && e.message || e) });
  }
};
