import { useState } from 'react';
import type { ConsentLocation } from '../lib/communityApi';

type Props = { onClose: () => void; onApprove: (location: ConsentLocation, options: { shareWithCommunity: boolean; shareWithResponders: boolean; liveLocationSharing: boolean }) => Promise<void> };

export function LocationConsentPage({ onClose, onApprove }: Props) {
  const [shareWithCommunity, setShareWithCommunity] = useState(true);
  const [shareWithResponders, setShareWithResponders] = useState(true);
  const [liveLocationSharing, setLiveLocationSharing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');
  const approve = () => {
    if (!navigator.geolocation) { setError('This browser does not support location services.'); setStatus('error'); return; }
    setStatus('saving');
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await onApprove({ longitude: position.coords.longitude, latitude: position.coords.latitude, accuracyM: position.coords.accuracy }, { shareWithCommunity, shareWithResponders, liveLocationSharing });
        onClose();
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not save your consent.'); setStatus('error'); }
    }, () => { setError('Location permission was not granted. You can continue without sharing location.'); setStatus('error'); }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  };
  return <div className="page-overlay">
    <main className="account-page location-consent-page" aria-labelledby="location-consent-title">
      <button className="page-close" type="button" onClick={onClose} aria-label="Close location consent">×</button>
      <p className="section-kicker">Citizen location consent</p>
      <h2 id="location-consent-title">Share location only when it helps you.</h2>
      <p>RootLedger uses a rounded location to match nearby services and opt-in community members when your area has elevated risk. Your exact location and contact details are never shown to other citizens.</p>
      <label className="consent-option"><input type="checkbox" checked={shareWithResponders} onChange={(event) => setShareWithResponders(event.target.checked)} /> <span><b>Nearby help services</b><small>Match emergency, local-government, and organization resources.</small></span></label>
      <label className="consent-option"><input type="checkbox" checked={shareWithCommunity} onChange={(event) => setShareWithCommunity(event.target.checked)} /> <span><b>Opt-in community connections</b><small>Let nearby members send a connection request; no one sees your exact location or contact details.</small></span></label>
      <label className="consent-option live-sharing-option"><input type="checkbox" checked={liveLocationSharing} onChange={(event) => setLiveLocationSharing(event.target.checked)} /> <span><b>Live sharing while this page is open</b><small>Refresh your rounded location after meaningful movement or every 15 minutes to keep nearby matches relevant. You can turn this off at any time.</small></span></label>
      {error && <p className="form-error">{error}</p>}
      <button className="consent-submit" type="button" onClick={approve} disabled={status === 'saving'}>{status === 'saving' ? 'Saving your choice…' : 'Agree and use my location'}</button>
      <p className="consent-footnote">You can withdraw consent and delete this location record at any time from your account settings.</p>
    </main>
  </div>;
}
