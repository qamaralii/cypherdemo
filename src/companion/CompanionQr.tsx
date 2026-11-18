import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useCompanion } from './CompanionProvider';

/** Opening-screen pairing card: the QR code until a phone joins, then a welcome line. */
export function CompanionQr() {
  const { enabled, joinUrl, deciderName } = useCompanion();
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!joinUrl) { setSvg(null); return; }
    let cancelled = false;
    QRCode.toString(joinUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2b1d14', light: '#ffffff' } })
      .then((markup) => { if (!cancelled) setSvg(markup); })
      .catch(() => { if (!cancelled) setSvg(null); });
    return () => { cancelled = true; };
  }, [joinUrl]);

  if (!enabled || !joinUrl) return null;

  if (deciderName) {
    return <div className="landing-companion joined" role="status">
      <span className="landing-companion-wave" aria-hidden="true">👋</span>
      <p><b>{deciderName} joined <span>#incident-hld-2407-a</span></b><small>They can start the walkthrough from their phone. The agents will ask them for every approval.</small></p>
    </div>;
  }

  return <div className="landing-companion" data-join-url={joinUrl}>
    {svg ? <span className="landing-companion-qr" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="landing-companion-qr" />}
    <p><b>Be the human in the loop</b><small>Scan to join the incident channel on your phone. The agents will ask you for every approval.</small></p>
  </div>;
}
