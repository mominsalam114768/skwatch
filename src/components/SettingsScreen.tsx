import { useState, FormEvent, useEffect } from 'react';
import { LogOut, Sun, Moon, Key, UserPlus, Users, Trash2, Store, MapPin, Phone, Image as ImageIcon, Database } from 'lucide-react';
import { createSubUser, logoutUser, getUsers, deleteUser, AppUser } from '../lib/localAuth';
import { createNewSpreadsheet, setupSpreadsheet } from '../lib/sheets';
import { getCachedAccessToken } from '../lib/firebase';

export function SettingsScreen({ onLogout, userRole }: { onLogout: () => void, userRole: string }) {
  const [smsApi, setSmsApi] = useState(localStorage.getItem('smsApi') || '');
  const [bizName, setBizName] = useState(localStorage.getItem('bizName') || '');
  const [bizAddress, setBizAddress] = useState(localStorage.getItem('bizAddress') || '');
  const [bizMobile, setBizMobile] = useState(localStorage.getItem('bizMobile') || '');
  const [bizLogo, setBizLogo] = useState(localStorage.getItem('bizLogo') || '');
  const [sheetId, setSheetId] = useState(localStorage.getItem('my_sheet_id') || '');
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);

  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (userRole === 'admin') {
      setUsers(getUsers());
    }
  }, [userRole]);

  const handleSaveBizInfo = () => {
    localStorage.setItem('bizName', bizName);
    localStorage.setItem('bizAddress', bizAddress);
    localStorage.setItem('bizMobile', bizMobile);
    localStorage.setItem('bizLogo', bizLogo);
    alert('প্রতিষ্ঠানের তথ্য সংরক্ষিত হয়েছে!');
    window.location.reload();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_HEIGHT = 150;
          if (height > MAX_HEIGHT) {
            width = width * (MAX_HEIGHT / height);
            height = MAX_HEIGHT;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setBizLogo(canvas.toDataURL('image/png'));
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveApi = () => {
    localStorage.setItem('smsApi', smsApi);
    alert('SMS API URL সংরক্ষিত হয়েছে!');
  };

  const toggleDarkMode = () => {
    const isDark = !isDarkMode;
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSaveSheetId = async () => {
    if (!sheetId) {
      alert('দয়া করে শিট ID দিন');
      return;
    }
    const token = getCachedAccessToken();
    if (!token) {
      alert('আগে গুগল লগইন করুন। হোম পেজ থেকে ডাটাবেজ কানেক্ট করুন বোতামটি চাপুন।');
      return;
    }
    try {
      setIsCreatingDb(true);
      await setupSpreadsheet(token, sheetId);
      alert('সফলভাবে ডাটাবেজ লিঙ্ক করা হয়েছে!');
      window.location.reload();
    } catch(e: any) {
      alert('লিঙ্ক করতে সমস্যা হয়েছে: ' + e.message);
    } finally {
      setIsCreatingDb(false);
    }
  };

  const handleCreateNewSheet = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      alert('আগে গুগল লগইন করুন। হোম পেজ থেকে ডাটাবেজ কানেক্ট করুন বোতামটি চাপুন।');
      return;
    }
    try {
      setIsCreatingDb(true);
      const newId = await createNewSpreadsheet(token, bizName || 'SK Watch Database');
      await setupSpreadsheet(token, newId);
      setSheetId(newId);
      alert('নতুন ডাটাবেজ সফলভাবে তৈরি হয়েছে!');
    } catch(e: any) {
      alert('ডাটাবেজ তৈরি করতে সমস্যা হয়েছে: ' + e.message);
    } finally {
      setIsCreatingDb(false);
    }
  };

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    if(newUsername && newPassword) {
      try {
        createSubUser(newUsername, newPassword);
        alert(`ইউজার '${newUsername}' সফলভাবে তৈরি হয়েছে!`);
        setNewUsername('');
        setNewPassword('');
        setErrorMsg('');
        setUsers(getUsers());
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
  };

  const handleDeleteUser = (email: string) => {
    deleteUser(email);
    setUsers(getUsers());
    setUserToDelete(null);
  };

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">সেটিংস</h2>
      </div>

      {/* Dark Mode Toggle */}
      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-3 text-gray-900 font-medium">
          {isDarkMode ? <Moon className="w-6 h-6 text-indigo-400" /> : <Sun className="w-6 h-6 text-amber-500" />}
          <span>ডার্ক মোড</span>
        </div>
        <button 
          onClick={toggleDarkMode}
          className={`w-14 h-8 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}
        >
          <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
      </div>

      {/* Business Info Setup */}
      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" /> প্রতিষ্ঠানের তথ্য (রিপোর্টের জন্য)
        </h3>
        <div className="space-y-4">
          <input 
            type="text" 
            value={bizName}
            onChange={e => setBizName(e.target.value)}
            placeholder="প্রতিষ্ঠানের নাম"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 text-sm"
          />
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={bizAddress}
              onChange={e => setBizAddress(e.target.value)}
              placeholder="প্রতিষ্ঠানের ঠিকানা"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={bizMobile}
              onChange={e => setBizMobile(e.target.value)}
              placeholder="মোবাইল নম্বর"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 text-sm"
            />
          </div>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 text-gray-500" /> প্রতিষ্ঠানের লোগো আপলোড
            </label>
            <div className="flex items-center gap-4">
              {bizLogo && <img src={bizLogo} alt="Logo Preview" className="h-12 w-auto object-contain border bg-white p-1 rounded" />}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {bizLogo && (
                <button onClick={() => setBizLogo('')} className="text-sm text-red-500 hover:underline">
                  মুছে ফেলুন
                </button>
              )}
            </div>
          </div>

          <button onClick={handleSaveBizInfo} className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 w-full md:w-auto mt-2">
            তথ্যাদি সেভ করুন
          </button>
        </div>
      </div>

      {/* SMS API Config */}
      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" /> মেসেজ API সেটআপ
        </h3>
        <div className="space-y-3">
          <input 
            type="text" 
            value={smsApi}
            onChange={e => setSmsApi(e.target.value)}
            placeholder="https://api.sms-service.com/send?to=[number]&msg=[message]"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-mono text-sm"
          />
          <button onClick={handleSaveApi} className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 w-full md:w-auto">
            সেভ করুন
          </button>
          <p className="text-xs text-gray-500 mt-2">
            নোট: API URL এ <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">[number]</code> এবং <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">[message]</code> প্লেসহোল্ডার হিসেবে ব্যবহার করুন।
          </p>
        </div>
      </div>

      {/* Database Setup */}
      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6 transition-colors">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> গুগল শিট ডাটাবেজ সেটআপ
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">প্রত্যেক গুগল একাউন্টের জন্য আলাদা ডাটাবেজ ব্যবহার করতে নিচের অপশন ব্যবহার করুন।</p>
          
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">শিট লিংক বা আইডি (বিদ্যমান ডাটাবেজ)</label>
            <input 
              type="text" 
              value={sheetId}
              onChange={e => {
                let val = e.target.value;
                if (val.includes('/d/')) {
                  const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
                  if (match) val = match[1];
                }
                setSheetId(val);
              }}
              placeholder="1l9wm2yDDNHEe..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 font-mono text-sm"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={handleSaveSheetId} 
              disabled={isCreatingDb}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreatingDb ? 'অপেক্ষা করুন...' : 'কানেক্ট করুন'}
            </button>
            <button 
              onClick={handleCreateNewSheet} 
              disabled={isCreatingDb}
              className="flex-1 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {isCreatingDb ? 'তৈরি হচ্ছে...' : '+ নতুন ডাটাবেজ তৈরি করুন'}
            </button>
          </div>
        </div>
      </div>

      {/* Create User Demo */}
      {userRole === 'admin' && (
      <div className="space-y-6">
        <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6 transition-colors">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> সাব-ইউজার তৈরি করুন
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
            <input 
              type="email" 
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="ইউজার ইমেইল"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
            />
            <input 
              type="password" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="পাসওয়ার্ড"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
            />
            <button type="submit" className="w-full md:w-auto bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-black transition-colors">
              ইউজার তৈরি করুন
            </button>
          </form>
        </div>

        <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 p-6 transition-colors">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> ইউজার তালিকা
          </h3>
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.email} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">{u.email}</p>
                  <span className={`text-xs px-2 py-0.5 mt-1 inline-block rounded-full ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                    {u.role === 'admin' ? 'এডমিন' : 'ইউজার'}
                  </span>
                </div>
                {u.role !== 'admin' && (
                  <button onClick={() => setUserToDelete(u.email)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            {users.length === 0 && <p className="text-gray-500 text-sm">কোনো ইউজার নেই</p>}
          </div>
        </div>

        {userToDelete && (
          <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-card-bg rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">ইউজার ডিলিট করুন</h3>
              <p className="text-gray-600 mb-6">সত্যিই কি <strong>{userToDelete}</strong> কে মুছে ফেলতে চান?</p>
              <div className="flex gap-3">
                <button onClick={() => setUserToDelete(null)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200">বাতিল</button>
                <button onClick={() => handleDeleteUser(userToDelete)} className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700">ডিলিট</button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Logout */}
      <div className="pt-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 py-4 rounded-xl font-bold text-lg hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-6 h-6" /> লগ আউট করুন
        </button>
      </div>
    </div>
  );
}
