import { useState } from 'react';

type Props = { onClose: () => void; onLogin: (name: string) => void };

const DEMO_EMAIL = 'demo@rootledger.org';
const DEMO_PASSWORD = 'rootledger2026';

/** A focused sign-in screen that can later post to the team's authentication API. */
export function LoginPage({ onClose, onLogin }: Props) {
  const [error, setError] = useState('');

  return <div className="page-overlay">
    <main className="account-page" aria-labelledby="login-title">
      <button className="page-close" type="button" onClick={onClose} aria-label="Close login">×</button>
      <div className="account-mark" aria-hidden="true">R</div>
      <p className="section-kicker">RootLedger account</p>
      <h2 id="login-title">Welcome back</h2>
      <p>Save places, receive local risk updates, and keep track of your community actions.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (data.get('email') === DEMO_EMAIL && data.get('password') === DEMO_PASSWORD) {
          onLogin('Demo planner');
          onClose();
          return;
        }
        setError('Use the demo credentials shown below.');
      }}>
        <label>Email address<input name="email" type="email" placeholder="you@example.org" required /></label>
        <label>Password<input name="password" type="password" placeholder="••••••••" required /></label>
        <button type="submit">Continue</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <p className="demo-credentials"><strong>Demo access</strong><span>{DEMO_EMAIL}</span><span>{DEMO_PASSWORD}</span></p>
      <button className="text-button" type="button">Create an account</button>
    </main>
  </div>;
}
