import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, subDays } from 'date-fns';

export type Category = 'Food' | 'Transport' | 'Shopping' | 'Bills' | 'Rent' | 'Entertainment' | 'Health' | 'SIP' | 'Travel' | 'Education' | 'Other';
export type PaymentMode = 'UPI' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Net Banking';
export type TransactionSource = 'sms' | 'manual' | 'ocr';

export interface SplitMember {
  id: string;
  name: string;
  share: number;
  settled: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  merchant: string;
  category: Category;
  paymentMode: PaymentMode;
  source: TransactionSource;
  isSplit: boolean;
  userShare: number;
  isIgnored: boolean;
  groupId: string | null;
  splits: SplitMember[];
  note?: string;
}

export interface Group {
  id: string;
  name: string;
  members: { id: string; name: string }[];
  createdAt: string;
}

export interface Budget {
  overall: number;
  categories: Partial<Record<Category, number>>;
}

export interface AppSettings {
  smsIntelligence: boolean;
  aiCategorisation: boolean;
  ocrReceiptScan: boolean;
  budgetAlerts: boolean;
  duplicateDetection: boolean;
  monthlyBudget: boolean;
}

interface AppState {
  transactions: Transaction[];
  groups: Group[];
  budget: Budget;
  settings: AppSettings;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  ignoreTransaction: (id: string) => void;
  deleteTransaction: (id: string) => void;
  splitTransaction: (id: string, splits: SplitMember[], groupId?: string | null) => void;
  settleUp: (groupId: string, memberId: string) => void;
  addGroup: (g: Omit<Group, 'id' | 'createdAt'>) => void;
  deleteGroup: (id: string) => void;
  setBudget: (b: Budget) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  isDuplicate: (amount: number, merchant: string, date: string) => boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const d = (daysAgo: number) => format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: '0', amount: 75000, date: d(28), merchant: 'Salary Credit - TCS', category: 'Other', paymentMode: 'Net Banking', source: 'sms', isSplit: false, userShare: 75000, isIgnored: false, groupId: null, splits: [], note: 'Monthly salary credited' },
  { id: '1', amount: 450, date: d(0), merchant: 'Swiggy', category: 'Food', paymentMode: 'UPI', source: 'sms', isSplit: false, userShare: 450, isIgnored: false, groupId: null, splits: [] },
  { id: '2', amount: 1200, date: d(1), merchant: 'Amazon', category: 'Shopping', paymentMode: 'Credit Card', source: 'sms', isSplit: false, userShare: 1200, isIgnored: false, groupId: null, splits: [] },
  { id: '3', amount: 2500, date: d(2), merchant: 'Uber', category: 'Transport', paymentMode: 'UPI', source: 'sms', isSplit: true, userShare: 1250, isIgnored: false, groupId: null, splits: [{ id: 's1', name: 'Rahul', share: 1250, settled: false }] },
  { id: '4', amount: 15000, date: d(3), merchant: 'Landlord', category: 'Rent', paymentMode: 'Net Banking', source: 'manual', isSplit: true, userShare: 7500, isIgnored: false, groupId: null, splits: [{ id: 's2', name: 'Amit', share: 7500, settled: false }] },
  { id: '5', amount: 599, date: d(4), merchant: 'Netflix', category: 'Entertainment', paymentMode: 'Credit Card', source: 'sms', isSplit: false, userShare: 599, isIgnored: false, groupId: null, splits: [] },
  { id: '6', amount: 3200, date: d(5), merchant: 'Apollo Pharmacy', category: 'Health', paymentMode: 'Debit Card', source: 'sms', isSplit: false, userShare: 3200, isIgnored: false, groupId: null, splits: [] },
  { id: '7', amount: 800, date: d(6), merchant: 'Zomato', category: 'Food', paymentMode: 'UPI', source: 'sms', isSplit: false, userShare: 800, isIgnored: false, groupId: null, splits: [] },
  { id: '8', amount: 5000, date: d(7), merchant: 'Zerodha Coin', category: 'SIP', paymentMode: 'Net Banking', source: 'sms', isSplit: false, userShare: 5000, isIgnored: false, groupId: null, splits: [] },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      transactions: SAMPLE_TRANSACTIONS,
      groups: [
        { id: 'g1', name: 'Flatmates', members: [{ id: 'm1', name: 'Rahul' }, { id: 'm2', name: 'Amit' }], createdAt: '2026-03-01' },
        { id: 'g2', name: 'Trip Goa', members: [{ id: 'm3', name: 'Priya' }, { id: 'm4', name: 'Sneha' }], createdAt: '2026-03-15' },
      ],
      budget: { overall: 50000, categories: { Food: 8000, Transport: 5000, Shopping: 10000, Entertainment: 3000 } },
      settings: { smsIntelligence: true, aiCategorisation: true, ocrReceiptScan: true, budgetAlerts: true, duplicateDetection: true, monthlyBudget: true },

      addTransaction: (t) => {
        const state = get();
        if (state.isDuplicate(t.amount, t.merchant, t.date)) return;
        set({ transactions: [{ ...t, id: generateId() }, ...state.transactions] });
      },

      updateTransaction: (id, updates) => set({
        transactions: get().transactions.map(t => t.id === id ? { ...t, ...updates } : t)
      }),

      ignoreTransaction: (id) => set({
        transactions: get().transactions.map(t => t.id === id ? { ...t, isIgnored: !t.isIgnored } : t)
      }),

      deleteTransaction: (id) => set({
        transactions: get().transactions.filter(t => t.id !== id)
      }),

      splitTransaction: (id, splits, groupId) => {
        const totalOtherShares = splits.reduce((sum, s) => sum + s.share, 0);
        set({
          transactions: get().transactions.map(t => {
            if (t.id !== id) return t;
            return { ...t, isSplit: true, splits, userShare: t.amount - totalOtherShares, groupId: groupId ?? t.groupId };
          })
        });
      },

      settleUp: (groupId, memberId) => set({
        transactions: get().transactions.map(t => {
          if (t.groupId !== groupId) return t;
          return { ...t, splits: t.splits.map(s => s.id === memberId ? { ...s, settled: true } : s) };
        })
      }),

      addGroup: (g) => set({
        groups: [...get().groups, { ...g, id: generateId(), createdAt: new Date().toISOString().split('T')[0] }]
      }),

      deleteGroup: (id) => set({ groups: get().groups.filter(g => g.id !== id) }),

      setBudget: (b) => set({ budget: b }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),

      isDuplicate: (amount, merchant, date) => {
        return get().transactions.some(t =>
          t.amount === amount && t.merchant.toLowerCase() === merchant.toLowerCase() && t.date === date
        );
      },
    }),
    { name: 'finclarity-store' }
  )
);

// Pure helper functions — use with useMemo in components
export function getActiveTransactions(transactions: Transaction[]) {
  return transactions.filter(t => !t.isIgnored);
}

export function getTotalSpend(transactions: Transaction[], month?: string) {
  const txns = transactions.filter(t => !t.isIgnored);
  const filtered = month ? txns.filter(t => t.date.startsWith(month)) : txns;
  return filtered.reduce((sum, t) => sum + t.userShare, 0);
}

export function getCategoryBreakdown(transactions: Transaction[], month?: string) {
  const txns = transactions.filter(t => !t.isIgnored);
  const filtered = month ? txns.filter(t => t.date.startsWith(month)) : txns;
  const map: Record<string, number> = {};
  filtered.forEach(t => { map[t.category] = (map[t.category] || 0) + t.userShare; });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function getPaymentModeBreakdown(transactions: Transaction[], month?: string) {
  const txns = transactions.filter(t => !t.isIgnored);
  const filtered = month ? txns.filter(t => t.date.startsWith(month)) : txns;
  const map: Record<string, number> = {};
  filtered.forEach(t => { map[t.paymentMode] = (map[t.paymentMode] || 0) + t.userShare; });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
