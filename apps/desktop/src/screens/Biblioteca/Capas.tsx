// Capa do jogo: a oficial (libretro-thumbnails, pelo Rust, com cache), senão o print de quando parou. Na ficha, com a
// oficial aparece também o print de onde você parou (#parou-img). No sofá/lista, a miniatura só é pedida quando aparece.
import type { ItemBiblioteca } from '@kof/domain';
import { useEffect, useRef } from 'react';
import { capasDoApp, usarCapas } from '../../stores/capas';

export function srcCapa(r: ItemBiblioteca): string | null {
  return capasDoApp().url(r) ?? r.jogo?.autoCapa ?? r.jogo?.capa ?? null;
}

export function Capa({ item }: { item: ItemBiblioteca | undefined }) {
  usarCapas((s) => s.versao);
  useEffect(() => {
    if (item) capasDoApp().pedir(item);
  }, [item]);
  const oficial = item ? capasDoApp().url(item) : null;
  const src = item ? srcCapa(item) : null;
  const parou = oficial ? item?.jogo?.autoCapa : undefined;
  return (
    <>
      <img id="capa-img" alt="" hidden={!src} src={src ?? undefined} className={oficial ? 'oficial' : undefined} />
      <img id="parou-img" alt="onde você parou" title="onde você parou" hidden={!parou} src={parou} />
    </>
  );
}

export function Mini({ item, texto }: { item: ItemBiblioteca; texto: string }) {
  usarCapas((s) => s.versao);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = el.current;
    if (!d) return;
    if (typeof IntersectionObserver !== 'function') return void capasDoApp().pedir(item);
    const o = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          o.disconnect();
          capasDoApp().pedir(item);
        }
      },
      { root: d.closest('#roms'), rootMargin: '200px' },
    );
    o.observe(d);
    return () => o.disconnect();
  }, [item]);
  const src = srcCapa(item);
  return (
    <div className="mini" ref={el}>
      {src ? <img src={src} alt="" loading="lazy" /> : texto}
    </div>
  );
}
