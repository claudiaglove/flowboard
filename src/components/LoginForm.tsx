import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { magicLink, signIn, signUp } from '../auth';
import logoLarge from '../assets/logo-large.svg';

type Mode = 'password' | 'magic' | 'signup';

const TABS: { id: Mode; label: string }[] = [
  { id: 'password', label: 'Password' },
  { id: 'magic', label: 'Magic link' },
  { id: 'signup', label: 'Sign up' },
];

const SUBMIT_LABEL: Record<Mode, string> = {
  password: 'Sign in',
  magic: 'Send magic link',
  signup: 'Create account',
};

interface Props {
  onAuth: (email: string) => void;
}

export default function LoginForm({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [pending, setPending] = useState(false);

  const selectTab = (id: Mode) => {
    setMode(id);
    setError('');
    setInfo('');
  };

  const onTabKeyDown = (e: KeyboardEvent, index: number) => {
    const target =
      e.key === 'ArrowRight' ? index + 1
      : e.key === 'ArrowLeft' ? index - 1
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : null;
    if (target === null) return;
    e.preventDefault();
    const next = TABS[(target + TABS.length) % TABS.length];
    selectTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setInfo('');
    try {
      const user =
        mode === 'password'
          ? await signIn(email.trim(), password)
          : mode === 'signup'
            ? await signUp(email.trim(), password)
            : magicLink(email.trim());
      onAuth(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPending(false);
    }
  };

  const invalid = error ? true : undefined;
  const describedBy = error ? 'login-error' : undefined;

  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="login-logo">
          <img src={logoLarge} alt="" width={24} height={24} />
        </span>
        <h1>FlowBoard</h1>
        <p>Sign in to manage your boards</p>
      </div>
      <form className="login-card" onSubmit={submit}>
        <div className="toggle" role="tablist" aria-label="Sign-in method">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              aria-controls="login-panel"
              tabIndex={mode === t.id ? 0 : -1}
              className={mode === t.id ? 'active' : ''}
              onClick={() => selectTab(t.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="panel" role="tabpanel" id="login-panel" aria-labelledby={`tab-${mode}`}>
          <p className="hint">All fields are required.</p>
          <div className="field">
            <label className="label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              autoComplete={mode === 'signup' ? 'email' : 'username'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          </div>
          {mode !== 'magic' && (
            <div className="field">
              <label className="label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={mode === 'signup' ? 6 : undefined}
                aria-invalid={invalid}
                aria-describedby={[mode === 'signup' ? 'password-hint' : '', describedBy ?? ''].filter(Boolean).join(' ') || undefined}
              />
              {mode === 'signup' && <span id="password-hint" className="hint">Use at least 6 characters.</span>}
            </div>
          )}
          {mode === 'password' && (
            <div className="forgot">
              <button type="button" className="link" onClick={() => setInfo('Password reset is not available in this demo.')}>
                Forgot password?
              </button>
            </div>
          )}
          {mode === 'magic' && (
            <p className="hint">Demo only: no email is sent, you'll be signed in right away.</p>
          )}
          {info && <p className="hint" role="alert">{info}</p>}
        </div>
        {error && <p id="login-error" className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn primary block" disabled={pending}>
          {SUBMIT_LABEL[mode]}
        </button>
      </form>
    </main>
  );
}
