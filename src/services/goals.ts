// Goals service — TODO: Replace with Supabase queries filtered by auth.uid()

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  deadline: string;
  created_at: string;
}

const KEY = 'finclarity_goals';

function getAll(): Goal[] {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveAll(data: Goal[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export async function getGoals(userId: string): Promise<Goal[]> {
  // TODO: Replace with: return supabase.from('goals').select('*').eq('user_id', userId)
  return getAll().filter(g => g.user_id === userId);
}

export async function addGoal(userId: string, goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'saved_amount'>): Promise<Goal> {
  // TODO: Replace with: return supabase.from('goals').insert({...goal, user_id: userId})
  const all = getAll();
  const newGoal: Goal = {
    ...goal,
    saved_amount: 0,
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  all.push(newGoal);
  saveAll(all);
  return newGoal;
}

export async function updateGoal(userId: string, id: string, updates: Partial<Goal>): Promise<void> {
  // TODO: Replace with: return supabase.from('goals').update(updates).eq('id', id).eq('user_id', userId)
  const all = getAll();
  const idx = all.findIndex(g => g.id === id && g.user_id === userId);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    saveAll(all);
  }
}

export async function deleteGoal(userId: string, id: string): Promise<void> {
  // TODO: Replace with: return supabase.from('goals').delete().eq('id', id).eq('user_id', userId)
  const all = getAll().filter(g => !(g.id === id && g.user_id === userId));
  saveAll(all);
}
