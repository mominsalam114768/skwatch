import { useEffect, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { initLocalAuth, getLoggedInUser, AppUser } from './lib/localAuth';
import { initAuth } from './lib/firebase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(getLoggedInUser());
  const [businessName, setBusinessName] = useState<string | null>(localStorage.getItem('businessName'));
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    initLocalAuth();
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
    const unsubscribe = initAuth(
      () => setIsFirebaseReady(true),
      () => setIsFirebaseReady(true)
    );
    return () => unsubscribe();
  }, []);

  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />;
  }

  if (!isFirebaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessName) {
    return <SplashScreen onComplete={(name) => {
      localStorage.setItem('businessName', name);
      setBusinessName(name);
    }} />;
  }

  return <Layout businessName={businessName} userRole={user.role} onLogout={() => setUser(null)} />;
}

