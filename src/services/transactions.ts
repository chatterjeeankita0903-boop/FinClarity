// Transactions service — TODO: Replace with Supabase queries filtered by auth.uid()

export interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note: string;
  created_at: string;
}

const KEY = 'finclarity_transactions';

function getAll(): Transaction[] {
  // TODO: Replace with: return supabase.from('transactions').select('*').eq('user_id', userId)
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveAll(data: Transaction[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  // TODO: Replace with Supabase query filtered by auth.uid()
  return getAll().filter(t => t.user_id === userId);
}

export async function addTransaction(userId: string, tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>): Promise<Transaction> {
  // TODO: Replace with: return supabase.from('transactions').insert({...tx, user_id: userId})
  const all = getAll();
  const newTx: Transaction = {
    ...tx,
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  all.push(newTx);
  saveAll(all);
  return newTx;
}

export async function updateTransaction(userId: string, id: string, updates: Partial<Transaction>): Promise<void> {
  // TODO: Replace with: return supabase.from('transactions').update(updates).eq('id', id).eq('user_id', userId)
  const all = getAll();
  const idx = all.findIndex(t => t.id === id && t.user_id === userId);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    saveAll(all);
  }
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  // TODO: Replace with: return supabase.from('transactions').delete().eq('id', id).eq('user_id', userId)
  const all = getAll().filter(t => !(t.id === id && t.user_id === userId));
  saveAll(all);
}

export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'Education', 'Travel', 'Other'] as const;
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other'] as const;
