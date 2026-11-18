import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useCompanion } from './CompanionProvider';
import { AGENT_CHANNEL } from '../../shared/protocol';
import './companion.css';

/** Pairing card on the human-team summary: the QR code until a phone joins, then a welcome line. */
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
      <p><b>{deciderName} joined <span>#{AGENT_CHANNEL}</span></b><small>They can unleash the agents from their phone. Each agent will ask them for its approvals.</small></p>
    </div>;
  }

  return <div className="landing-companion" data-join-url={joinUrl}>
    {svg ? <span className="landing-companion-qr" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="landing-companion-qr" />}
    <p><b>Now you take over</b><small>Scan to join the agents’ incident channel on your phone. You’ll be the human in the loop for every critical decision.</small></p>
  </div>;
}
