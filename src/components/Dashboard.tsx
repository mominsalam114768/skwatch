import { useState, useMemo } from 'react';
import { Customer } from '../types';
import { Search, Plus, ArrowUpRight, ArrowDownRight, User } from 'lucide-react';

export function Dashboard({ 
  customers, 
  onAddCustomer, 
  onCustomerClick 
}: { 
  customers: Customer[], 
  onAddCustomer: () => void,
  onCustomerClick: (c: Customer) => void
}) {
  const [search, setSearch] = useState('');

  const totalPabo = useMemo(() => {
    return customers.reduce((sum, c) => c.currentDue > 0 ? sum + c.currentDue : sum, 0);
  }, [customers]);

  const totalDebo = useMemo(() => {
    return customers.reduce((sum, c) => c.currentDue < 0 ? sum + Math.abs(c.currentDue) : sum, 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search)
    );
  }, [search, customers]);

  // Color generator for avatar based on name
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  return (
    <div className="space-y-6 relative h-full">
      {/* Counters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card-bg rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 text-gray-500 mb-2">
            <ArrowDownRight className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">মোট পাবো</span>
          </div>
          <span className="text-2xl md:text-3xl font-bold text-primary">৳ {totalPabo.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-card-bg rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 text-gray-500 mb-2">
            <ArrowUpRight className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">মোট দেবো</span>
          </div>
          <span className="text-2xl md:text-3xl font-bold text-green-600">৳ {totalDebo.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="কাস্টমার খুঁজুন (নাম বা নম্বর)..."
          className="w-full pl-11 pr-4 py-4 bg-card-bg border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm text-lg"
        />
      </div>

      {/* List */}
      <div className="bg-card-bg rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>কোনো কাস্টমার পাওয়া যায়নি</p>
            </div>
          ) : (
            filteredCustomers.map(c => (
              <button 
                key={c.id || c.rowIndex} 
                onClick={() => onCustomerClick(c)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${getAvatarColor(c.name)}`}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{c.name}</h3>
                    <p className="text-sm text-gray-500">{c.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  {c.currentDue > 0 ? (
                    <p className="text-primary font-bold">পাবো ৳{c.currentDue.toLocaleString('en-IN')}</p>
                  ) : c.currentDue < 0 ? (
                    <p className="text-green-600 font-bold">দেবো ৳{Math.abs(c.currentDue).toLocaleString('en-IN')}</p>
                  ) : (
                    <p className="text-gray-400 font-medium">হিসাব শূন্য</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 md:bottom-10 right-6 z-10">
        <button
          onClick={onAddCustomer}
          className="flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
