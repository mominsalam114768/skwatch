import { BookOpen } from 'lucide-react';
import { useState, FormEvent } from 'react';

export function SplashScreen({ onComplete }: { onComplete: (name: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('দয়া করে সঠিক নাম দিন (কমপক্ষে ৩ অক্ষর)');
      return;
    }
    onComplete(name.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-light font-bengali p-6">
      <div className="bg-card-bg p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">স্বাগতম</h1>
        <p className="text-gray-500 mb-8">আপনার ব্যবসা প্রতিষ্ঠানের নাম লিখুন</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="ব্যবসার নাম..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary text-white py-3 md:py-4 rounded-xl font-medium text-lg hover:bg-primary/90 transition-colors"
          >
            নিশ্চিত করুন
          </button>
        </form>
      </div>
    </div>
  );
}
