import { useState, FormEvent } from 'react';
import { ArrowLeft, Loader2, Settings } from 'lucide-react';
import { appendRow, setupSpreadsheet } from '../lib/sheets';
import { getCachedAccessToken } from '../lib/firebase';

export function AddCustomer({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('কাস্টমার');
  const [previousDue, setPreviousDue] = useState('');
  const [dueType, setDueType] = useState<'পাবো' | 'দেবো'>('পাবো');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSetupSheets = async () => {
    try {
      const token = getCachedAccessToken();
      if (!token) return;
      setIsSettingUp(true);
      await setupSpreadsheet(token);
      setError('');
    } catch (err: any) {
      alert("Failed to setup sheets: " + err.message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 3) {
      setError('নাম কমপক্ষে ৩ অক্ষরের হতে হবে');
      return;
    }
    if (phone.trim().length !== 11 || !/^\d+$/.test(phone.trim())) {
      setError('সঠিক ১১ ডিজিটের ফোন নম্বর দিন');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getCachedAccessToken();
      if (!token) throw new Error('Authentication required');

      const id = Date.now().toString();
      let initialDueAmount = previousDue ? Number(previousDue) : 0;
      if (initialDueAmount > 0 && dueType === 'দেবো') {
        initialDueAmount = -initialDueAmount;
      }
      
      const newRow = [
        id,
        name.trim(),
        phone.trim(),
        type,
        initialDueAmount,
        initialDueAmount // currentDue same as previousDue initially
      ];

      await appendRow('Customers!A:F', [newRow], token);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.message === "No token") {
        setError('গুগল ডাটাবেজের কানেকশন নেই। হোম পেজ থেকে কানেক্ট করুন।');
      } else if (err.message.includes('Unable to parse range')) {
        setError('গুগল শিটে "Customers" নামের কোনো শিট পাওয়া যায়নি। দয়া করে শিট তৈরি করুন।');
      } else {
        setError('ডেটা সেভ করতে সমস্যা হয়েছে: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">নতুন কাস্টমার/সাপ্লায়ার যোগ করুন</h2>
      </div>

      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">নাম</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="কাস্টমারের নাম (কমপক্ষে ৩ অক্ষর)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ফোন নম্বর</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="০১৭... (১১ ডিজিট)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ক্যাটাগরি</label>
            <div className="flex gap-4">
              <label className="flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary font-medium">
                <input type="radio" name="type" value="কাস্টমার" checked={type === 'কাস্টমার'} onChange={(e) => setType(e.target.value)} className="sr-only" />
                কাস্টমার
              </label>
              <label className="flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary font-medium">
                <input type="radio" name="type" value="সাপ্লায়ার" checked={type === 'সাপ্লায়ার'} onChange={(e) => setType(e.target.value)} className="sr-only" />
                সাপ্লায়ার
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">পূর্বের বকেয়া/জমা (যদি থাকে)</label>
            <div className="flex gap-2 mb-2">
              <button 
                type="button" 
                onClick={() => setDueType('পাবো')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${dueType === 'পাবো' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                পাবো
              </button>
              <button 
                type="button" 
                onClick={() => setDueType('দেবো')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${dueType === 'দেবো' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                দেবো
              </button>
            </div>
            <input
              type="number"
              value={previousDue}
              onChange={(e) => setPreviousDue(e.target.value)}
              placeholder="আ্যামাউন্ট দিন"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
              <span className="font-medium">{error}</span>
              {error.includes('Customers') && (
                <button 
                  type="button"
                  onClick={handleSetupSheets}
                  disabled={isSettingUp}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {isSettingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  শিট তৈরি করুন
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-medium text-lg hover:bg-primary/90 transition-colors disabled:opacity-70 mt-4"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'নিশ্চিত করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}
