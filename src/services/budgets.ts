// Budgets service — TODO: Replace with Supabase queries filtered by auth.uid()

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  period: string;
  created_at: string;
}

const KEY = 'finclarity_budgets';

function getAll(): Budget[] {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveAll(data: Budget[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export async function getBudgets(userId: string): Promise<Budget[]> {
  // TODO: Replace with: return supabase.from('budgets').select('*').eq('user_id', userId)
  return getAll().filter(b => b.user_id === userId);
}

export async function addBudget(userId: string, budget: Omit<Budget, 'id' | 'user_id' | 'created_at'>): Promise<Budget> {
  // TODO: Replace with: return supabase.from('budgets').insert({...budget, user_id: userId})
  const all = getAll();
  const newBudget: Budget = {
    ...budget,
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  all.push(newBudget);
  saveAll(all);
  return newBudget;
}

export async function updateBudget(userId: string, id: string, updates: Partial<Budget>): Promise<void> {
  // TODO: Replace with: return supabase.from('budgets').update(updates).eq('id', id).eq('user_id', userId)
  const all = getAll();
  const idx = all.findIndex(b => b.id === id && b.user_id === userId);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    saveAll(all);
  }
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  // TODO: Replace with: return supabase.from('budgets').delete().eq('id', id).eq('user_id', userId)
  const all = getAll().filter(b => !(b.id === id && b.user_id === userId));
  saveAll(all);
}
