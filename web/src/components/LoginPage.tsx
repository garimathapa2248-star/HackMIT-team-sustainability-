import { useState } from 'react';

type Props = { onClose: () => void; onLogin: (name: string) => void; onRemoteLogin: (input: { email: string; password: string }) => Promise<void>; onRegister: (input: { displayName: string; email: string; password: string }) => Promise<void> };

const DEMO_EMAIL = 'demo@rootledger.org';
const DEMO_PASSWORD = 'rootledger2026';

/** A focused sign-in screen that can later post to the team's authentication API. */
export function LoginPage({ onClose, onLogin, onRemoteLogin, onRegister }: Props) {
  const [error, setError] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return <div className="page-overlay">
    <main className="account-page" aria-labelledby="login-title">
      <button className="page-close" type="button" onClick={onClose} aria-label="Close login">×</button>
      <div className="account-mark" aria-hidden="true">R</div>
      <p className="section-kicker">Citizen account</p>
      <h2 id="login-title">{creatingAccount ? 'Join your local resilience network.' : 'Welcome back'}</h2>
      <p>{creatingAccount ? 'Create an account, then choose whether RootLedger may use your location for nearby help.' : 'Save places, receive local risk updates, and keep track of your community actions.'}</p>
      <form onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (creatingAccount) {
          setSubmitting(true);
          try {
            await onRegister({ displayName: String(data.get('displayName')), email: String(data.get('email')), password: String(data.get('password')) });
            onClose();
          } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create your account.'); }
          finally { setSubmitting(false); }
          return;
        }
        if (data.get('email') === DEMO_EMAIL && data.get('password') === DEMO_PASSWORD) {
          onLogin('Demo planner');
          onClose();
          return;
        }
        setSubmitting(true);
        try { await onRemoteLogin({ email: String(data.get('email')), password: String(data.get('password')) }); onClose(); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.'); }
        finally { setSubmitting(false); }
      }}>
        {creatingAccount && <label>Display name<input name="displayName" placeholder="How neighbours should know you" minLength={2} maxLength={40} required /></label>}
        <label>Email address<input name="email" type="email" placeholder="you@example.org" required /></label>
        <label>Password<input name="password" type="password" placeholder="••••••••" minLength={creatingAccount ? 12 : undefined} required /></label>
        <button type="submit" disabled={submitting}>{submitting ? (creatingAccount ? 'Creating account…' : 'Signing in…') : creatingAccount ? 'Create account' : 'Continue'}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {!creatingAccount && <p className="demo-credentials"><strong>Demo access</strong><span>{DEMO_EMAIL}</span><span>{DEMO_PASSWORD}</span></p>}
      <button className="text-button" type="button" onClick={() => { setCreatingAccount((value) => !value); setError(''); }}>{creatingAccount ? 'I already have an account' : 'Create an account'}</button>
    </main>
  </div>;
}
