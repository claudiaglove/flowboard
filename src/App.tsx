import { Suspense, lazy, useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import Navbar from './components/Navbar';
import { getSession, signOut } from './auth';
import { PAGE_META, applyPageMeta } from './seo';

// Loaded only after sign-in, so the sign-in page doesn't download the board and drag-and-drop code.
const Board = lazy(() => import('./components/Board'));

export default function App() {
  const [user, setUser] = useState<string | null>(getSession);

  useEffect(() => {
    applyPageMeta(user ? PAGE_META.signedIn : PAGE_META.signedOut);
  }, [user]);

  if (!user) return <LoginForm onAuth={setUser} />;

  return (
    <>
      <Navbar
        email={user}
        onSignOut={() => {
          signOut();
          setUser(null);
        }}
      />
      <Suspense
        fallback={
          <main className="loading">
            <p role="status">Loading your board…</p>
          </main>
        }
      >
        <Board key={user} user={user} />
      </Suspense>
    </>
  );
}
