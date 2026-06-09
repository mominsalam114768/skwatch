import { useState, useEffect } from 'react';
import { Database, Plus, Store, Copy } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { getCachedAccessToken, fetchStoresFromFirestore, updateCurrentSheetIdInFirestore, StoreDef, syncSheetIdToFirestore } from '../lib/firebase';
import { createNewSpreadsheet, setupSpreadsheet } from '../lib/sheets';

export function MultiStoreScreen() {
  const [stores, setStores] = useState<StoreDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const currentSheetId = localStorage.getItem('my_sheet_id');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setIsLoading(true);
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const data = await fetchStoresFromFirestore(user.uid);
      setStores(data);
    }
    setIsLoading(false);
  };

  const handleCreateStore = async () => {
    if (!newStoreName) return;
    const auth = getAuth();
    const user = auth.currentUser;
    const token = getCachedAccessToken();
    if (!user || !token) {
      alert('আগে গুগল লগইন করুন।');
      return;
    }
    
    setIsCreating(true);
    try {
      const newId = await createNewSpreadsheet(token, newStoreName);
      await setupSpreadsheet(token, newId);
      await syncSheetIdToFirestore(user.uid, newId, newStoreName);
      
      // Update local storage and switch to new store
      localStorage.setItem('my_sheet_id', newId);
      localStorage.setItem('bizName', newStoreName);
      localStorage.removeItem('bizAddress');
      localStorage.removeItem('bizMobile');
      localStorage.removeItem('bizLogo');
      
      alert('নতুন দোকান সফলভাবে তৈরি হয়েছে!');
      window.location.reload();
    } catch(e: any) {
      alert('দোকান তৈরি করতে সমস্যা হয়েছে: ' + e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchStore = async (storeId: string, storeName: string) => {
    if (storeId === currentSheetId) return; // already active
    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      await updateCurrentSheetIdInFirestore(storeId);
      localStorage.setItem('my_sheet_id', storeId);
      localStorage.setItem('bizName', storeName);
      // Clear specific details until they load
      localStorage.removeItem('bizAddress');
      localStorage.removeItem('bizMobile');
      localStorage.removeItem('bizLogo');
      
      alert(`'${storeName}' দোকানে সুইচ করা হয়েছে।`);
      window.location.reload();
    } catch (e: any) {
      alert('দোকান সুইচ করতে সমস্যা হয়েছে: ' + e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600 font-medium">দোকানের তালিকা লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">আমার দোকানসমূহ (মাল্টিস্টোর)</h2>
          <p className="text-sm text-gray-500 mt-2">আপনার তৈরি করা সবগুলো দোকানের তালিকা। যেকোনো দোকানে ক্লিক করে সুইচ করতে পারবেন।</p>
        </div>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-primary text-white border-2 border-primary hover:bg-white hover:text-primary transition-colors px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" /> নতুন দোকান যোগ করুন
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">নতুন দোকানের নাম</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="দোকানের নাম লিখুন..."
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 font-medium rounded-xl hover:bg-gray-200 transition-colors flex-1"
              disabled={isCreating}
            >
              বাতিল
            </button>
            <button 
              onClick={handleCreateStore}
              disabled={!newStoreName || isCreating}
              className={`bg-primary text-white px-4 py-2 rounded-xl flex-1 font-medium transition flex items-center justify-center gap-2 ${(!newStoreName || isCreating) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'}`}
            >
              {isCreating ? <span className="animate-pulse">তৈরি হচ্ছে...</span> : 'তৈরি করুন'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {stores.map((store, idx) => {
          const isActive = store.id === currentSheetId;
          return (
            <div 
              key={idx} 
              onClick={() => handleSwitchStore(store.id, store.name)}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isActive ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-gray-100 hover:border-primary/50 shadow-sm hover:shadow-md'}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Store className="w-6 h-6" />
                  </div>
                  {isActive && (
                    <span className="bg-primary text-white text-xs px-3 py-1 rounded-full font-medium">বর্তমান</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{store.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                  <Database className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{store.id}</span>
                </div>
              </div>
            </div>
          );
        })}
        {stores.length === 0 && !isLoading && (
          <div className="col-span-full py-10 text-center text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
            <Store className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>আপনার কোনো দোকানের তালিকা পাওয়া যায়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
}
