// B.3: a sinopse e a nota na ficha do jogo (Wikidata + Wikipédia, com o crédito). Jogo do catálogo também tem.
import { resumoDasNotas, type ItemBiblioteca } from '@kof/domain';
import { useEffect } from 'react';
import { usarFicha } from '../../stores/sobre';

export function SinopseENota({ item }: { item: ItemBiblioteca | undefined }) {
  const { estado, pedir } = usarFicha();
  useEffect(() => pedir(item), [item, pedir]);
  if (!item || estado.tipo === 'nada') return null;
  if (estado.tipo === 'buscando')
    return (
      <p id="info-sinopse" className="dica">
        📖 procurando a sinopse…
      </p>
    );
  if (estado.tipo === 'nao-achou')
    return (
      <p id="info-sinopse" className="dica">
        📖 sem sinopse: a Wikipédia não tem um artigo desse jogo
      </p>
    );
  if (estado.tipo === 'sem-rede')
    return (
      <p id="info-sinopse" className="dica" title={estado.motivo}>
        📖 sem internet agora: a sinopse aparece quando tiver conexão
      </p>
    );
  const { sobre } = estado;
  const nota = resumoDasNotas(sobre.notas);
  return (
    <div id="info-sinopse">
      <p className="ficha-nota">
        {nota ? (
          <>
            ★ <b>{nota.media}</b>/100
            <small className="dica">
              {' '}
              · {nota.quantas === 1 ? '1 crítica' : `média de ${nota.quantas} críticas`}
              {nota.por.length ? ` (${nota.por.slice(0, 3).join(', ')})` : ''}
            </small>
          </>
        ) : (
          <small className="dica">sem nota da crítica no Wikidata</small>
        )}
      </p>
      {sobre.sinopse && <p className="ficha-sinopse">{sobre.sinopse}</p>}
      <p className="dica ficha-fonte">
        Fonte:{' '}
        <a href={sobre.url} target="_blank" rel="noreferrer">
          Wikipédia{sobre.lingua === 'en' ? ' (em inglês)' : ''}
        </a>{' '}
        · CC BY-SA · notas do Wikidata
      </p>
    </div>
  );
}
