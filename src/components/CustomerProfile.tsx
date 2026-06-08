import { useState, useEffect, FormEvent, useMemo } from 'react';
import { Customer } from '../types';
import { ArrowLeft, CheckCircle2, Calculator, Loader2, Settings, MoreVertical, Bell, Pencil, FileText, Trash2, X, Printer, Search } from 'lucide-react';
import { appendRow, updateRow, setupSpreadsheet, getSheetData } from '../lib/sheets';
import { getCachedAccessToken } from '../lib/firebase';

export function CustomerProfile({ customer, onBack }: { customer: Customer, onBack: () => void }) {
  const [transactionType, setTransactionType] = useState<'দিলাম' | 'পেলাম' | null>(null);
  const [amountStr, setAmountStr] = useState('0');
  const [details, setDetails] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Feature Modals
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editPhone, setEditPhone] = useState(customer.phone);

  const [showReminder, setShowReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState(`প্রিয় ${customer.name}, আপনার বর্তমান বকেয়া ৳${customer.currentDue.toLocaleString('en-IN')}। দয়া করে পরিশোধ করুন। - ${localStorage.getItem('businessName')}`);

  const [showReport, setShowReport] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

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

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = getCachedAccessToken();
      if(!token) return;
      await updateRow(`Customers!B${customer.rowIndex}:C${customer.rowIndex}`, [[editName, editPhone]], token);
      customer.name = editName; // Optimistic update
      customer.phone = editPhone;
      setShowEdit(false);
      alert('কাস্টমার তথ্য আপডেট হয়েছে!');
    } catch(err) {
      alert("Error editing customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      const token = getCachedAccessToken();
      if(!token) return;
      setIsSubmitting(true);
      
      if (customer.currentDue !== 0) {
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        const isReceive = customer.currentDue > 0;
        const amount = Math.abs(customer.currentDue);
        const cbRow = [
          dateStr,
          `${customer.name} ডিলিট - বকেয়া ${isReceive ? 'আদায়' : 'পরিশোধ'}`,
          isReceive ? 'পেলাম' : 'দিলাম',
          amount
        ];
        await appendRow(`Cashbox!A:D`, [cbRow], token);
      }
      
      await updateRow(`Customers!A${customer.rowIndex}:F${customer.rowIndex}`, [['DELETED', 'DELETED', '', '', '', '']], token);
      onBack();
    } catch(err) {
      alert("Error deleting customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminderSMS = () => {
    window.location.href = `sms:${customer.phone}?body=${encodeURIComponent(reminderMsg)}`;
    alert('SMS অ্যাপ্লিকেশন খোলা হচ্ছে...');
    setShowReminder(false);
  };
  
  const handleSendReminderMessage = () => {
    const api = localStorage.getItem('smsApi');
    if (api && api.includes('[number]')) {
      let finalApi = api.replace('[number]', customer.phone).replace('[message]', encodeURIComponent(reminderMsg));
      fetch(finalApi).then(() => alert('তাগাদা পাঠানো সফল হয়েছে!')).catch(() => alert('API এর মাধ্যমে পাঠাতে সমস্যা হয়েছে।'));
    } else {
      alert('সেটিংস থেকে মেসেজ API সেটআপ করুন।');
    }
    setShowReminder(false);
  };
  
  const handleSendReminderWhatsApp = () => {
    let phoneNum = String(customer.phone || '').replace(/[^0-9]/g, '');
    if (!phoneNum.startsWith('88')) {
      phoneNum = '88' + phoneNum;
    }
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(reminderMsg)}`, '_blank');
    alert('WhatsApp অ্যাপ্লিকেশন খোলা হচ্ছে...');
    setShowReminder(false);
  };

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const handleSearch = () => {
    setFilterFromDate(fromDate);
    setFilterToDate(toDate);
  };

  const loadReport = async () => {
    setShowReport(true);
    setLoadingReport(true);
    try {
      const token = getCachedAccessToken();
      if(!token) {
        alert('গুগল শিট কানেক্ট করা নেই। অনুগ্রহ করে সেটিংস থেকে শিট তৈরি করুন।');
        setShowReport(false);
        setLoadingReport(false);
        return;
      }
      const data = await getSheetData('Transactions!A2:G', token);
      const filtered = data.filter(row => row[1] === customer.id);
      setTransactions(filtered.reverse());
    } catch(e: any) {
      console.error(e);
      if (e.message === "No token" || e.message === "No auth token") {
        alert('গুগল শিট কানেকশন হারানো গেছে, দয়া করে আবার লগইন করুন।');
      } else {
        alert('রিপোর্ট লোড করতে সমস্যা হয়েছে');
      }
    } finally {
      setLoadingReport(false);
    }
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const bizName = localStorage.getItem('bizName') || '';
      const bizAddress = localStorage.getItem('bizAddress') || '';
      const bizMobile = localStorage.getItem('bizMobile') || '';
      const bizLogo = localStorage.getItem('bizLogo') || '';

      let html = `<html><head><title>${customer.name} - Report</title><style>
        body { font-family: sans-serif; padding: 20px; } 
        table { width: 100%; border-collapse: collapse; margin-top: 20px;} 
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .receive { color: green; } .give { color: red; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .header img { max-height: 80px; margin-bottom: 10px; object-fit: contain; }
        .header h1 { margin: 0; font-size: 28px; color: #111; }
        .header p { margin: 5px 0 0; color: #555; font-size: 16px; }
      </style></head><body>`;
      
      const fDate = filterFromDate ? new Date(filterFromDate).toLocaleDateString('en-GB') : 'শুরু';
      const tDate = filterToDate ? new Date(filterToDate).toLocaleDateString('en-GB') : 'আজ পর্যন্ত';
      
      html += `<div class="header">`;
      if (bizLogo) html += `<img src="${bizLogo}" alt="Logo" />`;
      if (bizName) html += `<h1>${bizName}</h1>`;
      if (bizAddress) html += `<p>${bizAddress}</p>`;
      if (bizMobile) html += `<p>মোবাইল: ${bizMobile}</p>`;
      html += `</div>`;

      html += `<h2>${customer.name} - লেজার খাতা</h2>`;
      html += `<p>তারিখ: ${fDate} হতে ${tDate}</p>`;
      html += `<table><tr><th>তারিখ</th><th>ধরণ</th><th>বিবরণ</th><th>পরিমাণ</th></tr>`;
      
      filteredTransactions.forEach(ptx => {
        const tx = ptx.original;
        const isReceive = tx[3] === 'পেলাম';
        html += `<tr>
          <td>${ptx.dateStr}</td>
          <td>${tx[3]}</td>
          <td>${tx[5] || ''}</td>
          <td class="${isReceive ? 'receive' : 'give'}">৳${Number(tx[4]).toLocaleString('en-IN')}</td>
        </tr>`;
      });
      html += `</table></body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const parseSheetDate = (val: any) => {
    if (typeof val === 'number') {
      const utcDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds());
    }
    const strVal = String(val);
    const nativeDate = new Date(strVal);
    if (!isNaN(nativeDate.getTime())) {
      return nativeDate;
    }
    const match = strVal.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
    if (match) {
      let p1 = parseInt(match[1], 10);
      let p2 = parseInt(match[2], 10);
      let p3 = parseInt(match[3], 10);
      let y, m, d;
      if (p1 > 1000) { 
        y = p1; m = p2; d = p3;
      } else if (p3 > 1000) {
        if (p1 > 12) {
          d = p1; m = p2; y = p3;
        } else {
          m = p1; d = p2; y = p3;
        }
      } else {
        y = new Date().getFullYear(); d = p1; m = p2;
      }
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    return new Date(0);
  };

  const processedTransactions = useMemo(() => {
    return transactions.map(tx => {
      const dateObj = parseSheetDate(tx[6]);
      return {
        original: tx,
        time: dateObj.getTime(),
        dateStr: dateObj.toLocaleDateString('en-GB')
      };
    }).sort((a, b) => b.time - a.time);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let fTime = 0;
    if (filterFromDate) {
      const [y, m, d] = filterFromDate.split('-');
      fTime = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 0, 0, 0).getTime();
    }
    
    let tTime = 9999999999999;
    if (filterToDate) {
      const [y, m, d] = filterToDate.split('-');
      tTime = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 23, 59, 59, 999).getTime();
    }

    return processedTransactions
      .filter(ptx => {
        if (!filterFromDate && !filterToDate) return true;
        if (!ptx.original[6]) return false;
        if (isNaN(ptx.time) || ptx.time === 0) return false;
        return ptx.time >= fTime && ptx.time <= tTime;
      });
  }, [processedTransactions, filterFromDate, filterToDate]);

  const handleKeypad = (val: string) => {
    if (val === 'AC') {
      setAmountStr('0');
    } else if (val === 'C') {
      setAmountStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (['+', '-', '*', '/'].includes(val)) {
      const lastChar = amountStr.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        setAmountStr(prev => prev.slice(0, -1) + val);
      } else {
        setAmountStr(prev => prev + val);
      }
    } else if (val === '=') {
      try {
        // Safe evaluation of basic math
        // eslint-disable-next-line no-new-func
        const res = new Function(`return ${amountStr}`)();
        setAmountStr(String(res));
      } catch (e) {
        setAmountStr('Error');
        setTimeout(() => setAmountStr('0'), 1000);
      }
    } else {
      setAmountStr(prev => prev === '0' ? val : prev + val);
    }
  };

  const keys = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    'C', '0', '=', '+'
  ];

  const handleSubmit = async () => {
    let finalAmount = 0;
    try {
      // eslint-disable-next-line no-new-func
      finalAmount = new Function(`return ${amountStr}`)();
    } catch {
      alert("Invalid math expression");
      return;
    }

    if (finalAmount <= 0) {
      alert("হিসাবের পরিমাণ ০ থেকে বেশি হতে হবে");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const token = getCachedAccessToken();
      if (!token) throw new Error("No auth token");

      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
      const transactionId = Date.now().toString();

      // Transactioin sheet cols: id | customer_id | customer_name | type | amount | details | date
      const newTransaction = [
        transactionId,
        customer.id,
        customer.name,
        transactionType,
        finalAmount,
        details,
        dateStr
      ];

      let newDue = customer.currentDue;
      if (transactionType === 'দিলাম') {
        newDue += finalAmount; // Due increased
      } else {
        newDue -= finalAmount; // Due decreased
      }

      // 1. Update Customers current_due
      // Col F is the 6th column = index 5. We update just F.
      await updateRow(`Customers!F${customer.rowIndex}`, [[newDue]], token);
      
      // 2. Append Transaction
      await appendRow(`Transactions!A:G`, [newTransaction], token);

      setSuccessMode(true);
    } catch (err: any) {
      console.error(err);
      if (err.message === "No token" || err.message === "No auth token") {
        setErrorMsg("গুগল ডাটাবেজের কানেকশন নেই। হোম পেজ থেকে কানেক্ট করুন।");
      } else if (err.message.includes('Unable to parse range')) {
        setErrorMsg("গুগল শিটে 'Transactions' বা 'Customers' শিট নেই। দয়া করে তৈরি করুন।");
      } else {
        setErrorMsg("Error saving transaction: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">লেনদেন সফল!</h2>
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100 max-w-sm w-full space-y-3 font-mono">
          <p className="text-gray-500">কাস্টমার: <span className="font-bold text-gray-900">{customer.name}</span></p>
          <p className="text-gray-500">ধরণ: <span className="font-bold text-gray-900">{transactionType}</span></p>
          <p className="text-gray-500 border-b pb-3">পরিমাণ: <span className="font-bold text-gray-900">৳ {amountStr}</span></p>
          <p className="text-gray-500 pt-1">নতুন বকেয়া: <span className={`font-bold ${customer.currentDue > 0 ? 'text-primary' : 'text-green-600'}`}>৳ {Math.abs(
            transactionType === 'দিলাম' ? customer.currentDue + Number(amountStr) : customer.currentDue - Number(amountStr)
          ).toLocaleString('en-IN')}</span></p>
        </div>
        <button 
          onClick={onBack}
          className="bg-primary text-white px-8 py-3 rounded-xl font-medium"
        >
          ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium">
          <span>{errorMsg}</span>
          {errorMsg.includes('Transactions') && (
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
      <div className="flex items-center justify-between gap-4 mb-6 relative">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{customer.name}</h2>
            <p className="text-sm text-gray-500">{customer.phone}</p>
          </div>
        </div>

        <div>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreVertical className="w-6 h-6 text-gray-700" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
              />
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowReminder(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors text-left"
                >
                  <Bell className="w-4 h-4" />
                  <span className="font-medium text-sm">তাগাদা পাঠান</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowEdit(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors text-left"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="font-medium text-sm">এডিট</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); loadReport(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors text-left"
                >
                  <FileText className="w-4 h-4" />
                  <span className="font-medium text-sm">রিপোর্ট</span>
                </button>
                <div className="my-1 border-t border-gray-100"></div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium text-sm">ডিলিট</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">কাস্টমার ডিলিট করুন</h3>
            <p className="text-gray-600 mb-6 font-medium">সত্যিই কি <strong>{customer.name}</strong> কে মুছে ফেলতে চান? এতে করে বকেয়া/পাওনা ক্যাশবক্সে অ্যাডজাস্ট হয়ে যাবে।</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">বাতিল</button>
              <button 
                onClick={() => { setShowDeleteConfirm(false); handleDelete(); }} 
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ডিলিট'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card-bg w-full max-w-md rounded-2xl p-6 shadow-xl relative">
            <button onClick={() => setShowEdit(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full p-1"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">কাস্টমার এডিট</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">নাম</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 focus:outline-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ফোন নম্বর</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 focus:outline-primary/50" />
              </div>
              <button disabled={isSubmitting} className="w-full bg-primary text-white py-3 rounded-xl font-medium mt-4 disabled:opacity-50">
                {isSubmitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Notification Modal */}
      {showReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card-bg w-full max-w-md rounded-2xl p-6 shadow-xl relative">
            <button onClick={() => setShowReminder(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full p-1"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">তাগাদা পাঠান</h3>
            <div className="space-y-4">
              <textarea 
                value={reminderMsg} 
                onChange={e => setReminderMsg(e.target.value)} 
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 resize-none focus:outline-primary/50 text-gray-900"
              />
              <div className="flex flex-col gap-3 mt-4">
                <button onClick={handleSendReminderSMS} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                  <Bell className="w-5 h-5" /> SMS (মোবাইল অ্যাপ)
                </button>
                <button onClick={handleSendReminderMessage} className="w-full bg-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                  <Bell className="w-5 h-5" /> SMS (API মেসেজ)
                </button>
                <button onClick={handleSendReminderWhatsApp} className="w-full bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                  <Bell className="w-5 h-5" /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex flex-col bg-card-bg">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-primary text-white">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowReport(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><ArrowLeft className="w-5 h-5"/></button>
              <h3 className="font-bold text-lg">{customer.name} - লেজার খাতা</h3>
            </div>
            <button onClick={printReport} disabled={loadingReport || filteredTransactions.length === 0} className="p-2 bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-50">
              <Printer className="w-5 h-5"/>
            </button>
          </div>
          
          <div className="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs text-gray-500 mb-1">হতে</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs text-gray-500 mb-1">পর্যন্ত</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
            </div>
            <button 
              onClick={handleSearch}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors h-[42px] font-medium"
            >
              <Search className="w-4 h-4" />
              সার্চ
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-bg-light">
            {loadingReport ? (
              <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">কোনো লেনদেন পাওয়া যায়নি</p>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((ptx, idx) => {
                  const tx = ptx.original;
                  return (
                  <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{tx[3]}</p> {/* type: দিলাম/পেলাম */}
                      <p className="text-sm text-gray-500">{ptx.dateStr}</p> {/* date */}
                      {tx[5] && <p className="text-xs text-gray-400 mt-1">{tx[5]}</p>}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-xl ${tx[3] === 'পেলাম' ? 'text-green-600' : 'text-primary'}`}>
                        ৳{Number(tx[4]).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-card-bg rounded-2xl p-6 shadow-sm border border-gray-100 text-center mb-6">
        <p className="text-gray-500 text-sm font-medium mb-1">বর্তমান বকেয়া</p>
        {customer.currentDue > 0 ? (
          <h3 className="text-3xl font-bold text-primary">পাবো ৳ {customer.currentDue.toLocaleString('en-IN')}</h3>
        ) : customer.currentDue < 0 ? (
          <h3 className="text-3xl font-bold text-green-600">দেবো ৳ {Math.abs(customer.currentDue).toLocaleString('en-IN')}</h3>
        ) : (
          <h3 className="text-3xl font-bold text-gray-400">৳ ০</h3>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => setTransactionType('দিলাম')}
          className={`py-4 rounded-2xl border-2 transition-colors font-bold text-lg ${
            transactionType === 'দিলাম' 
              ? 'bg-primary border-primary text-white' 
              : 'bg-white border-gray-200 text-gray-600 hover:border-primary/50'
          }`}
        >
          দিলাম / বেচা
        </button>
        <button 
          onClick={() => setTransactionType('পেলাম')}
          className={`py-4 rounded-2xl border-2 transition-colors font-bold text-lg ${
            transactionType === 'পেলাম' 
              ? 'bg-green-600 border-green-600 text-white' 
              : 'bg-white border-gray-200 text-gray-600 hover:border-green-600/50'
          }`}
        >
          পেলাম
        </button>
      </div>

      {transactionType && (
        <div className="animate-in slide-in-from-bottom flex flex-col items-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 w-full mb-4 shadow-sm relative overflow-hidden group">
            <input 
              readOnly
              value={amountStr}
              className="text-right text-4xl font-mono w-full font-bold text-gray-900 bg-transparent focus:outline-none"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
              <Calculator className="w-6 h-6" />
            </div>
          </div>
          
          <input 
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="বিবরণ (অপশনাল)..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-primary"
          />

          <div className="grid grid-cols-4 gap-2 w-full mb-6">
            {keys.map(k => (
              <button 
                key={k}
                onClick={() => handleKeypad(k)}
                className={`py-4 rounded-xl text-xl font-medium transition-all active:scale-95 ${
                  ['/', '*', '-', '+', '='].includes(k) 
                    ? 'bg-gray-100 text-gray-800'
                    : k === 'C'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-white border border-gray-100 shadow-sm text-gray-900 hover:bg-gray-50'
                }`}
              >
                {k}
              </button>
            ))}
            <button
               onClick={() => handleKeypad('AC')}
               className="col-span-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium mt-1 active:scale-95"
            >
              Clear All (AC)
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || amountStr === '0' || amountStr === 'Error'}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'হিসাব যুক্ত করুন'}
          </button>
        </div>
      )}
    </div>
  );
}
