// 🇧🇷 Patch de tradução (Arquivo → Aplicar tradução, ou arrastar o .ips/.bps/.ups): com jogo aberto aplica nele; senão
// pede a ROM. O jogo traduzido abre na hora e fica na biblioteca, separado do original (outra ROM, outro save).
import { lerArquivoDeJogo, lerPatch, mudarJogo, registrar, textoDoErro, traduzir } from '@kof/app-core';
import { EXTENSOES } from '@kof/domain';
import { usarAvisos } from './avisos';
import { jogoAbertoAgora, usarJogo } from './jogo';
import { servicos } from './servicos';

function escolherArquivo(aceita: string): Promise<File | null> {
  return new Promise((ok) => {
    const e = document.createElement('input');
    e.type = 'file';
    e.accept = aceita;
    e.onchange = () => ok(e.files?.[0] ?? null);
    e.oncancel = () => ok(null);
    e.click();
  });
}

export async function aplicarTraducao(nomePatch: string, patch: Uint8Array): Promise<void> {
  const av = usarAvisos.getState();
  try {
    let rom = jogoAbertoAgora();
    if (!rom) {
      av.avisar('agora escolha a ROM do jogo pra aplicar a tradução', 4000);
      const f = await escolherArquivo(['zip', ...EXTENSOES].map((x) => '.' + x).join(','));
      if (!f) return;
      rom = await lerArquivoDeJogo(f.name, new Uint8Array(await f.arrayBuffer()));
    }
    const t = traduzir(rom, patch);
    const arq = new File([t.bytes as Uint8Array<ArrayBuffer>], t.arquivo);
    await usarJogo.getState().abrirArquivo(arq);
    // o registro do jogo traduzido é gravado logo depois de abrir: marca a tradução quando ele existir
    const id = usarJogo.getState().registro?.id;
    const { armazem } = servicos();
    for (let i = 0; id && i < 30 && !(await armazem.meta('jogos', id)); i++)
      await new Promise((ok) => setTimeout(ok, 100));
    if (id)
      await mudarJogo(armazem, id, (j) => ({
        ...j,
        traducao: nomePatch.replace(/^.*[\\/]/, ''),
        original: t.original,
      }));
    av.avisar(
      `🇧🇷 tradução aplicada (${t.tipo.toUpperCase()}): o jogo traduzido ficou na biblioteca, separado do original`,
      5000,
    );
  } catch (e) {
    registrar('warn', 'traducao', textoDoErro(e));
    av.avisar('não consegui aplicar a tradução: ' + (e instanceof Error ? e.message : String(e)), 5000);
  }
}

/** Arquivo → Aplicar tradução: escolhe o .ips/.bps/.ups (ou um .zip com ele). */
export async function escolherTraducao(): Promise<void> {
  const f = await escolherArquivo('.ips,.bps,.ups,.zip');
  if (!f) return;
  await abrirPatch(f);
}

/** Um arquivo que é patch (ou zip com patch): aplica. false = não é patch. */
export async function abrirPatch(f: File): Promise<boolean> {
  const p = await lerPatch(f.name, new Uint8Array(await f.arrayBuffer()));
  if (!p) {
    if (/\.(ips|bps|ups)$/i.test(f.name) || f.name.endsWith('.zip'))
      usarAvisos.getState().avisar('não achei nenhum patch (.ips/.bps/.ups) nesse arquivo', 3500);
    return false;
  }
  await aplicarTraducao(p.nome, p.patch);
  return true;
}
