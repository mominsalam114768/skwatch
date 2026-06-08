import { useState, FormEvent } from 'react';
import { Package, Loader2, CheckCircle2 } from 'lucide-react';
import { appendRow, setupSpreadsheet } from '../lib/sheets';
import { getCachedAccessToken } from '../lib/firebase';

export function StockScreen() {
  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState('পিস');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSetupSheets = async () => {
    try {
      const token = getCachedAccessToken();
      if (!token) return;
      setIsSettingUp(true);
      await setupSpreadsheet(token);
      setErrorMsg(null);
    } catch (err: any) {
      alert("Failed to setup sheets: " + err.message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!productName || !purchaseQty || !totalPrice) {
      alert("সব তথ্য সঠিকভাবে পূরণ করুন");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getCachedAccessToken();
      if (!token) throw new Error("No token");

      const id = Date.now().toString();
      const qtyNum = Number(purchaseQty);
      const priceNum = Number(totalPrice);
      
      const newRow = [
        id,
        productName,
        unit,
        qtyNum,
        priceNum,
        qtyNum // initial stock is purchase qty
      ];

      await appendRow('Stock!A:F', [newRow], token);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setProductName('');
        setPurchaseQty('');
        setTotalPrice('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      if (err.message === "No token") {
        setErrorMsg("গুগল ডাটাবেজের কানেকশন নেই। হোম পেজ থেকে কানেক্ট করুন।");
      } else if (err.message.includes('Unable to parse range')) {
        setErrorMsg('গুগল শিটে "Stock" নামের কোনো শিট পাওয়া যায়নি।');
      } else {
        setErrorMsg('Error saving stock: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">স্টক এন্ট্রি</h2>
          <p className="text-gray-500">নতুন কেনা পণ্য স্টকে যুক্ত করুন</p>
        </div>
      </div>

      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
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
        {success ? (
          <div className="text-center py-10 animate-in fade-in">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">স্টক সফলভাবে যুক্ত হয়েছে!</h3>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">পণ্যের নাম</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="যেমন: চাল, ডাল, সাবান..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">পরিমাণ</label>
                <input
                  type="number"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  placeholder="কতটুকু কিনলেন?"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">একক</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                >
                  <option value="পিস">পিস (Pc)</option>
                  <option value="কেজি">কেজি (Kg)</option>
                  <option value="লিটার">লিটার (L)</option>
                  <option value="ডজন">ডজন (Dozen)</option>
                  <option value="বক্স">বক্স (Box)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">মোট কেনা মূল্য</label>
              <input
                type="number"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                placeholder="মোট কত টাকা?"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-medium text-lg hover:bg-primary/90 transition-colors disabled:opacity-70 mt-6"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'স্টকে যুক্ত করুন'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
