import { useState, useEffect, useMemo } from 'react';
import { Customer } from '../types';
import { getSheetData } from '../lib/sheets';
import { getCachedAccessToken } from '../lib/firebase';
import { FileText, Loader2, Printer, Search } from 'lucide-react';

export function GlobalReport({ customers }: { customers: Customer[] }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleSearch = () => {
    setFilterFromDate(fromDate);
    setFilterToDate(toDate);
  };

  const loadTransactions = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = getCachedAccessToken();
      if (!token) throw new Error("No token");
      const data = await getSheetData('Transactions!A2:G', token);
      setTransactions(data);
    } catch (err: any) {
      if (err.message === "No token" || err.message === "No auth token") {
        setErrorMsg("গুগল ডাটাবেজের কানেকশন নেই। হোম পেজ থেকে কানেক্ট করুন।");
      } else if (err.message.includes('Unable to parse range')) {
        setErrorMsg("Transactions শিট পাওয়া যায়নি।");
      } else {
        setErrorMsg("লেনদেন লোড করতে সমস্যা: " + err.message);
      }
    } finally {
      setLoading(false);
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

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const bizName = localStorage.getItem('bizName') || '';
      const bizAddress = localStorage.getItem('bizAddress') || '';
      const bizMobile = localStorage.getItem('bizMobile') || '';
      const bizLogo = localStorage.getItem('bizLogo') || '';

      let html = `<html><head><title>সর্বমোট লেনদেন রিপোর্ট</title><style>
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

      html += `<h2>সর্বমোট লেনদেন রিপোর্ট</h2>`;
      html += `<p>তারিখ: ${fDate} হতে ${tDate}</p>`;
      html += `<table><tr><th>তারিখ</th><th>কাস্টমার</th><th>ধরণ</th><th>বিবরণ</th><th>পরিমাণ</th></tr>`;
      
      filteredTransactions.forEach(ptx => {
        const tx = ptx.original;
        const isReceive = tx[3] === 'পেলাম';
        html += `<tr>
          <td>${ptx.dateStr}</td>
          <td>${tx[2]}</td>
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 justify-between rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">লেনদেন রিপোর্ট</h2>
            <p className="text-gray-500 text-sm">সব কাস্টমারের লেনদেন একসাথে</p>
          </div>
        </div>
        <button 
          onClick={printReport}
          disabled={loading || filteredTransactions.length === 0}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
        >
          <Printer className="w-5 h-5" />
          ডাউনলোড/প্রিন্ট
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">শুরুর তারিখ</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary text-gray-900" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">শেষ তারিখ</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary text-gray-900" />
          </div>
          <button 
            onClick={handleSearch}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors h-[50px] font-medium"
          >
            <Search className="w-5 h-5" />
            সার্চ করুন
          </button>
        </div>

        {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">{errorMsg}</div>}

        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-gray-500 py-10">কোনো লেনদেনের তথ্য পাওয়া যায়নি</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="py-3 px-4 font-medium min-w-[100px]">তারিখ</th>
                  <th className="py-3 px-4 font-medium">কাস্টমার</th>
                  <th className="py-3 px-4 font-medium min-w-[80px]">বিবরণ</th>
                  <th className="py-3 px-4 font-medium text-right min-w-[120px]">আমাউন্ট</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((ptx, idx) => {
                  const tx = ptx.original;
                  const isReceive = tx[3] === 'পেলাম';
                  return (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-600">
                        {ptx.dateStr}
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-900">
                        {tx[2]}
                      </td>
                      <td className="py-4 px-4 text-gray-500 text-sm">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${isReceive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {tx[3]}
                        </span>
                        {tx[5]}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-medium">
                        <span className={isReceive ? 'text-green-600' : 'text-red-600'}>
                          {isReceive ? '+' : '-'} ৳{Number(tx[4]).toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
