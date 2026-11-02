// O ícone do KOFstation (a xícara de cappuccino do empacotar/icone.py do antigo), desenhado com as mesmas formas em SVG
// (o antigo gerava um PNG com o PIL e a abertura mostrava esse PNG).
export function IconeApp({ tamanho = 96, className }: { tamanho?: number; className?: string }) {
  const [mocha, latte, espuma, caramelo, espresso] = ['#6f4e37', '#d9b99b', '#f3e5d0', '#c08552', '#2b1d14'];
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 64 64" role="img" aria-label="KOFstation">
      <rect x="1" y="1" width="62" height="62" rx="12" fill={espresso} />
      <ellipse cx="32" cy="54.5" rx="27" ry="5.5" fill={mocha} />
      <circle cx="49" cy="33" r="7.5" fill="none" stroke={latte} strokeWidth="5" />
      <rect x="9" y="18" width="38" height="37" rx="14" fill={latte} />
      <rect x="9" y="18" width="38" height="14" fill={latte} />
      <ellipse cx="28" cy="18" rx="19" ry="6" fill={espuma} />
      <ellipse cx="28" cy="18" rx="16" ry="4" fill={caramelo} />
      <ellipse cx="25.25" cy="16.75" rx="3.25" ry="2.25" fill={espuma} />
      <ellipse cx="30.75" cy="16.75" rx="3.25" ry="2.25" fill={espuma} />
      <polygon points="22.3,17.5 33.7,17.5 28,21.5" fill={espuma} />
    </svg>
  );
}
