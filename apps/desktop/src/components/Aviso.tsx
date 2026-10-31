import { usarAvisos } from '../stores/avisos';

export function Aviso() {
  const { texto, erro, fechar } = usarAvisos();
  if (!texto) return <div id="aviso" hidden />;
  if (!erro)
    return (
      <div id="aviso" role="status">
        {texto}
      </div>
    );
  return (
    <div id="aviso" className="erro" role="alert">
      <div>⚠️ {texto}</div>
      <div className="aviso-botoes">
        <button onClick={() => void navigator.clipboard?.writeText(texto)}>📋 copiar</button>
        <button onClick={fechar}>fechar</button>
      </div>
    </div>
  );
}
