import { useState } from 'react';

type Props = { onClose: () => void; onLogin: (organization: string) => void };
const DEMO_EMAIL = 'planner@nepal.gov.np';
const DEMO_PASSWORD = 'rootledger2026';

/** Separate from citizen sign-in: this unlocks the planning workspace. */
export function GovernmentLoginPage({ onClose, onLogin }: Props) {
  const [error, setError] = useState('');
  return <div className="page-overlay government-login-overlay">
    <main className="account-page government-access" aria-labelledby="government-login-title">
      <button className="page-close" type="button" onClick={onClose} aria-label="Close government access">×</button>
      <div className="account-mark" aria-hidden="true">R</div>
      <p className="section-kicker">Government access</p>
      <h2 id="government-login-title">Plan investment across Nepal.</h2>
      <p>Identify interventions and assess their local impact using the same environmental intelligence.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (data.get('email') === DEMO_EMAIL && data.get('password') === DEMO_PASSWORD) {
          onLogin(String(data.get('organization') || 'Nepal planning team'));
          onClose();
          return;
        }
        setError('Use the government demo credentials shown below.');
      }}>
        <label>Organization<input name="organization" placeholder="Ministry of Forests and Environment" required /></label>
        <label>Department / Agency<input name="department" placeholder="Climate Resilience Unit" required /></label>
        <label>Official email<input name="email" type="email" placeholder="planner@agency.gov.np" required /></label>
        <label>Password<input name="password" type="password" placeholder="••••••••" required /></label>
        <button type="submit">Open planning system</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <p className="demo-credentials"><strong>Government demo</strong><span>{DEMO_EMAIL}</span><span>{DEMO_PASSWORD}</span></p>
    </main>
  </div>;
}
