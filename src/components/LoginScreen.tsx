import { useState, FormEvent } from 'react';
import { loginUser } from '../lib/localAuth';
import { LogIn, AlertCircle } from 'lucide-react';

export function LoginScreen({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    const user = loginUser(email, pass);
    if (user) {
      onLogin(user);
    } else {
      setError('ইমেইল বা পাসওয়ার্ড ভুল হয়েছে!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light p-4 font-bengali">
      <div className="bg-card-bg w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-primary p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {localStorage.getItem('bizLogo') ? (
              <img src={localStorage.getItem('bizLogo') as string} alt="Logo" className="w-12 h-12 object-contain" />
            ) : (
              <LogIn className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">{localStorage.getItem('bizName') || localStorage.getItem('businessName') || 'হিসাব খাতা'}</h2>
          <p className="text-primary-100 mt-1">অনুগ্রহ করে লগইন করুন</p>
        </div>
        
        <div className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ইমেইল / একাউন্ট</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">পাসওয়ার্ড</label>
              <input
                type="password"
                required
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900"
              />
            </div>
            
            <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors mt-2">
              লগইন
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
