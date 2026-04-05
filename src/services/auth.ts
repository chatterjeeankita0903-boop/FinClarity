// Auth service — TODO: Replace all localStorage calls with Supabase auth

export interface User {
  id: string;
  email: string;
  fullName: string;
}

const STORAGE_KEYS = {
  session: 'finclarity_session',
  userId: 'finclarity_user_id',
  users: 'finclarity_users',
};

function getUsers(): Record<string, { email: string; password: string; fullName: string }> {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  return raw ? JSON.parse(raw) : {};
}

function saveUsers(users: Record<string, { email: string; password: string; fullName: string }>) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

// TODO: Replace with supabase.auth.signUp({ email, password })
export async function signUp(email: string, password: string, fullName: string): Promise<User> {
  const users = getUsers();
  const existing = Object.values(users).find(u => u.email === email);
  if (existing) throw new Error('User already exists');

  const id = crypto.randomUUID();
  users[id] = { email, password, fullName };
  saveUsers(users);

  const user: User = { id, email, fullName };
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.userId, id);
  return user;
}

// TODO: Replace with supabase.auth.signInWithPassword({ email, password })
export async function signIn(email: string, password: string): Promise<User> {
  const users = getUsers();
  const entry = Object.entries(users).find(([, u]) => u.email === email && u.password === password);
  if (!entry) throw new Error('Invalid email or password');

  const [id, u] = entry;
  const user: User = { id, email: u.email, fullName: u.fullName };
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.userId, id);
  return user;
}

// TODO: Replace with supabase.auth.signOut()
export async function signOut(): Promise<void> {
  localStorage.removeItem(STORAGE_KEYS.session);
  localStorage.removeItem(STORAGE_KEYS.userId);
}

// TODO: Replace with supabase.auth.getSession()
export async function getSession(): Promise<User | null> {
  const raw = localStorage.getItem(STORAGE_KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

// TODO: Replace with supabase.auth.onAuthStateChange()
export function getCurrentUserId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.userId);
}
