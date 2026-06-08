import { useState, useEffect, FormEvent } from 'react';
import { Wallet, Loader2, Plus } from 'lucide-react';
import { appendRow, getSheetData, setupSpreadsheet } from '../lib/sheets';
import { getCachedAccessToken } from '../lib/firebase';

export function CashboxScreen() {
  const [type, setType] = useState('বেচা');
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const loadBalance = async () => {
    setErrorMsg(null);
    try {
      const token = getCachedAccessToken();
      if (!token) return;
      const data = await getSheetData('Cashbox!A2:E', token);
      
      let sum = 0;
      data.forEach((row: any[]) => {
        const transType = row[2];
        const val = Number(row[3]) || 0;
        // Inflows
        if (['বেচা', 'মালিক দিল'].includes(transType)) {
          sum += val;
        } 
        // Outflows
        else if (['কেনা', 'খরচ', 'মালিক নিল'].includes(transType)) {
          sum -= val;
        }
      });
      setBalance(sum);
    } catch (err: any) {
      console.error(err);
      if (err.message === "No token") {
        alert("গুগল ডাটাবেজের কানেকশন নেই। হোম পেজ থেকে কানেক্ট করুন।");
      } else if (err.message.includes('Unable to parse range')) {
        setErrorMsg('গুগল শিটে "Cashbox" নামের কোনো শিট পাওয়া যায়নি।');
      } else {
        setErrorMsg('ব্যালেন্স লোড করতে সমস্যা: ' + err.message);
      }
      setBalance(0);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const handleSetupSheets = async () => {
    try {
      const token = getCachedAccessToken();
      if (!token) return;
      setIsSettingUp(true);
      await setupSpreadsheet(token);
      await loadBalance(); // Reload after setup
    } catch (err: any) {
      alert("Failed to setup sheets: " + err.message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert("সঠিক পরিমাণ দিন");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getCachedAccessToken();
      if (!token) throw new Error("No token");

      const id = Date.now().toString();
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      const val = Number(amount);
      
      const newRow = [id, dateStr, type, val, details];
      await appendRow('Cashbox!A:E', [newRow], token);
      
      setAmount('');
      setDetails('');
      loadBalance(); // Refresh balance
      alert("লেনদেন সফল!");
    } catch (err: any) {
      console.error(err);
      if (err.message === "No token") {
        alert("গুগল ডাটাবেজের কানেকশন নেই। হোম পেজ থেকে কানেক্ট করুন।");
      } else {
        alert("Error saving transaction: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>{errorMsg}</p>
          <button 
            onClick={handleSetupSheets}
            disabled={isSettingUp}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {isSettingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'শিট সেটআপ করুন'}
          </button>
        </div>
      )}
      {/* Header & Balance Card */}
      <div className="bg-primary text-white rounded-2xl shadow-lg border border-primary p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <Wallet className="w-5 h-5 opacity-80" />
          <h2 className="font-semibold opacity-90">ক্যাশবক্স ব্যালেন্স</h2>
        </div>
        <div className="relative z-10 text-4xl md:text-5xl font-bold tracking-tight">
          {balance === null ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            `৳ ${balance.toLocaleString('en-IN')}`
          )}
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> ক্যাশ এন্ট্রি করুন
        </h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">লেনদেনের ধরণ</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['বেচা', 'কেনা', 'খরচ', 'মালিক দিল', 'মালিক নিল'].map(t => (
                <label 
                  key={t}
                  className="flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary font-medium text-sm text-center"
                >
                  <input type="radio" name="type" value={t} checked={type === t} onChange={(e) => setType(e.target.value)} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">পরিমাণ</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="টাকার পরিমাণ..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">বিবরণ</label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="কি বাবদ? (ঐচ্ছিক)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-xl font-medium text-lg hover:bg-black transition-colors disabled:opacity-70 mt-4"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'যুক্ত করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}
