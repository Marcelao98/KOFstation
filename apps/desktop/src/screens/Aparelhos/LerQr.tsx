// 📷 Ler o QR do PC (só no celular, `.so-cel`): abre a câmera e procura o QR do pareamento (`kofstation://parear?...`).
// Usa o BarcodeDetector do navegador quando existe; senão o jsQR (carregado só quando precisa). Sem câmera: avisa e
// procura os PCs na rede pra parear pelo código (o `Achado` da tela).
import { pedidoDoQr } from '@kof/app-core';
import { useEffect, useRef, useState } from 'react';
import { usarRede } from '../../stores/rede';

export function LerQr() {
  const [aberta, setAberta] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const cam = useRef<MediaStream | null>(null);

  const parar = () => {
    cam.current?.getTracks().forEach((t) => t.stop());
    cam.current = null;
    setAberta(false);
  };
  useEffect(() => parar, []);

  const ler = async () => {
    const r = usarRede.getState();
    r.setMsg('');
    try {
      const Detector = (
        globalThis as {
          BarcodeDetector?: new (o: { formats: string[] }) => {
            detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector;
      const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      cam.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setAberta(true);
      await new Promise((ok) => setTimeout(ok, 0)); // o <video> aparece no próximo desenho
      const v = video.current;
      if (!v) throw new Error('sem tela de vídeo');
      v.srcObject = cam.current;
      await v.play();
      const c = document.createElement('canvas');
      const g = c.getContext('2d', { willReadFrequently: true });
      const olhar = async () => {
        if (!cam.current) return;
        if (v.videoWidth) {
          let texto: string | null = null;
          if (detector) texto = (await detector.detect(v).catch(() => []))[0]?.rawValue ?? null;
          else if (jsQR && g) {
            const k = Math.min(1, 640 / v.videoWidth);
            c.width = v.videoWidth * k;
            c.height = v.videoHeight * k;
            g.drawImage(v, 0, 0, c.width, c.height);
            texto =
              jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'dontInvert' })
                ?.data ?? null;
          }
          const p = texto ? pedidoDoQr(texto) : null;
          if (p) {
            r.setMsg('Pareando com ' + (p.nome || 'o PC') + '…');
            r.mandar({ t: 'parear-com', ip: p.ip, porta: p.porta, senha: p.senha, modo: 'q' });
            parar();
            return;
          }
        }
        setTimeout(() => void olhar(), 150);
      };
      void olhar();
    } catch (e) {
      parar();
      r.setMsg(
        `📷 Não deu pra usar a câmera (${e instanceof Error ? e.message : String(e)}). Procure o PC na lista abaixo e digite o código.`,
      );
      r.mandar({ t: 'achar' });
    }
  };

  return (
    <div className="so-cel">
      <button className="grande" data-acao="ap-ler-qr" onClick={() => void ler()}>
        📷 Ler o QR do PC
      </button>
      {aberta && (
        <div id="ap-camera">
          <video id="ap-video" ref={video} playsInline muted />
          <button className="grande sec" data-acao="ap-camera-fim" onClick={parar}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
