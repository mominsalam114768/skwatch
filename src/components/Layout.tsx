import { useState, useEffect } from 'react';
import { Home, Search, Plus, BookOpen, Package, Wallet, FileText, Menu, Settings as SettingsIcon, X, Loader2, Database } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { AddCustomer } from './AddCustomer';
import { CustomerProfile } from './CustomerProfile';
import { GlobalReport } from './GlobalReport';
import { CashboxScreen } from './CashboxScreen';
import { SettingsScreen } from './SettingsScreen';
import { Customer } from '../types';
import { setupSpreadsheet, getSheetData, syncDatabaseToLocal } from '../lib/sheets';
import { getCachedAccessToken, googleSignIn } from '../lib/firebase';

type Screen = 'home' | 'add-customer' | 'customer-profile' | 'stock' | 'cashbox' | 'report' | 'settings';

export function Layout({ businessName, userRole, onLogout }: { businessName: string, userRole: string, onLogout: () => void }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false);

  const [displayBizName, setDisplayBizName] = useState(localStorage.getItem('bizName') || businessName || 'হিসাব খাতা');
  const [displayBizLogo, setDisplayBizLogo] = useState(localStorage.getItem('bizLogo'));

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setNeedsGoogleAuth(false);
    try {
      const token = getCachedAccessToken();
      if (!token) throw new Error("No token");
      
      await syncDatabaseToLocal(token);
      setDisplayBizName(localStorage.getItem('bizName') || businessName || 'হিসাব খাতা');
      setDisplayBizLogo(localStorage.getItem('bizLogo') || null);

      const customerData = await getSheetData('Customers!A2:F', token);
      const parsedCustomers: Customer[] = customerData.map((row: any[], i: number) => ({
        id: row[0] || '',
        name: row[1] || '',
        phone: row[2] || '',
        type: row[3] || 'কাস্টমার',
        previousDue: Number(row[4]) || 0,
        currentDue: Number(row[5]) || 0,
        rowIndex: i + 2
      })).filter(c => c.id !== 'DELETED');
      setCustomers(parsedCustomers);
    } catch (err: any) {
      console.error(err);
      if (err.message === "No token" || err.message.includes("Authentication required") || err.message.includes("UNAUTHENTICATED") || err.message.includes("401")) {
        setErrorMsg('গুগল ডাটাবেজের সাথে সংযোগ বিচ্ছিন্ন। দয়া করে কানেক্ট করুন।');
        setNeedsGoogleAuth(true);
      } else if (err.message.includes('Unable to parse range')) {
        setErrorMsg('গুগল শিটে "Customers" নামের কোনো শট পাওয়া যায়নি। দয়া করে শিটটি তৈরি করুন।');
      } else {
        setErrorMsg('ডাটা লোড করতে সমস্যা হয়েছে: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetupSheets = async () => {
    try {
      const token = getCachedAccessToken();
      if (!token) return;
      setIsSettingUp(true);
      await setupSpreadsheet(token);
      await loadData(); // Reload after setup
    } catch (err: any) {
      alert("Failed to setup sheets: " + err.message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      await googleSignIn();
      await loadData();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        alert("পপ-আপ ব্লক করা হয়েছে। দয়া করে স্ক্রিনের একদম উপরের বারে থাকা 'Open in new tab' (↗️) আইকনে ক্লিক করে অ্যাপটি নতুন ট্যাবে খুলুন এবং সেখান থেকে কানেক্ট করুন।");
      } else {
        alert("কানেক্ট করতে সমস্যা হয়েছে! " + err.message);
      }
    }
  };

  const navigate = (screen: Screen, customer?: Customer) => {
    setCurrentScreen(screen);
    if (customer) setSelectedCustomer(customer);
    setIsSidebarOpen(false);
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'হোম' },
    { id: 'cashbox', icon: Wallet, label: 'ক্যাশবক্স' },
    { id: 'report', icon: FileText, label: 'রিপোর্ট' },
    { id: 'settings', icon: SettingsIcon, label: 'সেটিংস' },
  ];

  return (
    <div className="min-h-screen bg-bg-light font-bengali flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          {displayBizLogo ? (
            <img src={displayBizLogo} alt="Logo" className="w-8 h-8 rounded shrink-0 object-contain bg-white/10" />
          ) : (
            <BookOpen className="w-6 h-6" />
          )}
          <h1 className="text-xl font-bold truncate">{displayBizName}</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Desktop Sidebar & Mobile Drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-card-bg border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:w-64 flex flex-col shadow-xl md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 bg-primary text-white flex justify-between items-center md:block">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-lg shrink-0">
                {displayBizLogo ? (
                  <img src={displayBizLogo} alt="Logo" className="w-6 h-6 object-contain" />
                ) : (
                  <BookOpen className="w-6 h-6" />
                )}
              </div>
              <h1 className="text-xl font-bold truncate">{displayBizName}</h1>
            </div>
            <p className="text-sm text-primary-100 opacity-80">হিসাব খাতা</p>
          </div>
          <button className="md:hidden text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id as Screen)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-semibold' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-lg">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>{errorMsg}</p>
            <div className="flex items-center gap-2">
              {needsGoogleAuth && (
                <button 
                  onClick={handleGoogleConnect}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 flex items-center gap-2 whitespace-nowrap"
                >
                  <Database className="w-4 h-4" />
                  কানেক্ট করুন
                </button>
              )}
              {errorMsg.includes('Customers') && (
                <button 
                  onClick={handleSetupSheets}
                  disabled={isSettingUp}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {isSettingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <SettingsIcon className="w-4 h-4" />}
                  শিট সেটআপ করুন
                </button>
              )}
            </div>
          </div>
        )}
        {isLoading && currentScreen === 'home' ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {currentScreen === 'home' && (
              <Dashboard 
                customers={customers} 
                onAddCustomer={() => navigate('add-customer')}
                onCustomerClick={(c) => navigate('customer-profile', c)}
              />
            )}
            {currentScreen === 'add-customer' && (
              <AddCustomer 
                onBack={() => navigate('home')} 
                onSuccess={() => { loadData(); navigate('home'); }} 
              />
            )}
            {currentScreen === 'customer-profile' && selectedCustomer && (
              <CustomerProfile 
                customer={selectedCustomer}
                onBack={() => { loadData(); navigate('home'); }}
              />
            )}
            {currentScreen === 'cashbox' && (
              <CashboxScreen />
            )}
            {currentScreen === 'settings' && (
              <SettingsScreen onLogout={onLogout} userRole={userRole} />
            )}
            {currentScreen === 'report' && (
              <GlobalReport customers={customers} />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-card-bg border-t border-gray-200 flex justify-around p-2 pb-safe z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id as Screen)}
              className={`flex flex-col items-center p-2 min-w-[4rem] ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  );
}
