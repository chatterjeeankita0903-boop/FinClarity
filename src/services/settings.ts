// Settings service — TODO: Replace with Supabase queries filtered by auth.uid()

export interface UserSettings {
  currency: string;
  theme: 'dark' | 'light';
  notifications_enabled: boolean;
}

const KEY = 'finclarity_settings';

const DEFAULT_SETTINGS: UserSettings = {
  currency: 'INR',
  theme: 'dark',
  notifications_enabled: true,
};

function getAllSettings(): Record<string, UserSettings> {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveAllSettings(data: Record<string, UserSettings>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export async function getSettings(userId: string): Promise<UserSettings> {
  // TODO: Replace with: return supabase.from('user_settings').select('*').eq('user_id', userId).single()
  const all = getAllSettings();
  return all[userId] || { ...DEFAULT_SETTINGS };
}

export async function updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
  // TODO: Replace with: return supabase.from('user_settings').upsert({ user_id: userId, ...updates })
  const all = getAllSettings();
  const current = all[userId] || { ...DEFAULT_SETTINGS };
  const updated = { ...current, ...updates };
  all[userId] = updated;
  saveAllSettings(all);
  return updated;
}
