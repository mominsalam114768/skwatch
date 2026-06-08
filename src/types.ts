export interface Customer {
  id: string; // cell A: uid
  name: string; // cell B
  phone: string; // cell C
  type: string; // cell D: 'customer' | 'supplier' (কাস্টমার | সাপ্লায়ার)
  previousDue: number; // cell E
  currentDue: number; // cell F
  rowIndex: number; // to keep track for updates
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: string; // 'dilam' | 'pelam' (দিলাম | পেলাম)
  amount: number;
  details: string;
  date: string;
}

export interface StockItem {
  id: string;
  productName: string;
  unit: string;
  purchaseQty: number;
  totalPurchasePrice: number;
  currentStock: number;
  rowIndex: number;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: string; // 'sell' | 'buy' | 'expense' | 'owner_given' | 'owner_taken' (বেচা | কেনা | খরচ | মালিক দিল | মালিক নিল)
  amount: number;
}
