import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────
export type Category = 'Food' | 'Transport' | 'Shopping' | 'Bills' | 'Rent' | 'Entertainment' | 'Health' | 'SIP' | 'Travel' | 'Education' | 'Other';
export type PaymentMode = 'UPI' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Net Banking';
export type TransactionSource = 'sms' | 'manual' | 'ocr';

export const ALL_CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];

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

export const normalizeBudget = (budget?: Partial<Budget>): Budget => ({
  overall: typeof budget?.overall === 'number' && Number.isFinite(budget.overall) ? Math.max(0, budget.overall) : 0,
  categories: ALL_CATEGORIES.reduce((acc, cat) => {
    const raw = budget?.categories?.[cat];
    acc[cat] = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0;
    return acc;
  }, {} as Record<Category, number>),
});

const DEFAULT_SETTINGS: AppSettings = {
  smsIntelligence: true,
  aiCategorisation: true,
  ocrReceiptScan: true,
  budgetAlerts: true,
  duplicateDetection: true,
  monthlyBudget: true,
};

// ─── DB row → app model mappers ──────────────────────────────
function dbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    amount: Number(row.amount),
    date: row.date,
    merchant: row.name,
    category: row.category as Category,
    paymentMode: row.payment_method as PaymentMode,
    source: (row.source || 'manual') as TransactionSource,
    isSplit: row.is_split ?? false,
    userShare: Number(row.user_share ?? row.amount),
    isIgnored: row.is_ignored ?? false,
    groupId: row.group_id ?? null,
    splits: (row.splits as SplitMember[]) ?? [],
    note: row.note ?? '',
  };
}

function dbToGroup(row: any): Group {
  return {
    id: row.id,
    name: row.name,
    members: (row.members as { id: string; name: string }[]) ?? [],
    createdAt: row.created_at,
  };
}

// ─── Transactions ────────────────────────────────────────────
export function useTransactions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(dbToTransaction);
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async (t: Omit<Transaction, 'id'>) => {
      const { error } = await supabase.from('transactions').insert({
        user_id: user!.id,
        name: t.merchant,
        amount: t.amount,
        date: t.date,
        category: t.category,
        payment_method: t.paymentMode,
        source: t.source,
        is_split: t.isSplit,
        user_share: t.userShare,
        is_ignored: t.isIgnored,
        group_id: t.groupId,
        splits: t.splits as any,
        note: t.note ?? '',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
      const payload: any = {};
      if (updates.merchant !== undefined) payload.name = updates.merchant;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.paymentMode !== undefined) payload.payment_method = updates.paymentMode;
      if (updates.source !== undefined) payload.source = updates.source;
      if (updates.isSplit !== undefined) payload.is_split = updates.isSplit;
      if (updates.userShare !== undefined) payload.user_share = updates.userShare;
      if (updates.isIgnored !== undefined) payload.is_ignored = updates.isIgnored;
      if (updates.groupId !== undefined) payload.group_id = updates.groupId;
      if (updates.splits !== undefined) payload.splits = updates.splits;
      if (updates.note !== undefined) payload.note = updates.note;

      const { error } = await supabase.from('transactions').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const ignoreTransaction = useMutation({
    mutationFn: async ({ id, currentlyIgnored }: { id: string; currentlyIgnored: boolean }) => {
      const { error } = await supabase.from('transactions').update({ is_ignored: !currentlyIgnored }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const splitTransaction = useMutation({
    mutationFn: async ({ id, splits, groupId }: { id: string; splits: SplitMember[]; groupId?: string | null }) => {
      // Find current transaction to compute userShare
      const current = query.data?.find(t => t.id === id);
      if (!current) throw new Error('Transaction not found');
      const totalOtherShares = splits.reduce((sum, s) => sum + s.share, 0);
      const { error } = await supabase.from('transactions').update({
        is_split: true,
        splits: splits as any,
        user_share: current.amount - totalOtherShares,
        group_id: groupId ?? current.groupId,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    addTransaction: addTransaction.mutateAsync,
    updateTransaction: (id: string, updates: Partial<Transaction>) => updateTransaction.mutateAsync({ id, updates }),
    deleteTransaction: deleteTransaction.mutateAsync,
    ignoreTransaction: (id: string, currentlyIgnored: boolean) => ignoreTransaction.mutateAsync({ id, currentlyIgnored }),
    splitTransaction: (id: string, splits: SplitMember[], groupId?: string | null) => splitTransaction.mutateAsync({ id, splits, groupId }),
    isDuplicate: (amount: number, merchant: string, date: string) => {
      return (query.data ?? []).some(t => t.amount === amount && t.merchant.toLowerCase() === merchant.toLowerCase() && t.date === date);
    },
  };
}

// ─── Groups ──────────────────────────────────────────────────
export function useGroups() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(dbToGroup);
    },
    enabled: !!user,
  });

  const addGroup = useMutation({
    mutationFn: async (g: { name: string; members: { id: string; name: string }[] }) => {
      const { error } = await supabase.from('groups').insert({
        user_id: user!.id,
        name: g.name,
        members: g.members as any,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    addGroup: addGroup.mutateAsync,
    deleteGroup: deleteGroup.mutateAsync,
  };
}

// ─── Budgets ─────────────────────────────────────────────────
export function useBudget(month: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['budget', user?.id, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      if (!data) return normalizeBudget();
      return normalizeBudget({
        overall: Number(data.overall_budget),
        categories: data.category_budgets as any,
      });
    },
    enabled: !!user,
  });

  const setBudget = useMutation({
    mutationFn: async (b: Budget) => {
      const normalized = normalizeBudget(b);
      // Upsert: check if exists
      const { data: existing } = await supabase.from('budgets').select('id').eq('user_id', user!.id).eq('month', month).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('budgets').update({
          overall_budget: normalized.overall,
          category_budgets: normalized.categories as any,
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('budgets').insert({
          user_id: user!.id,
          month,
          overall_budget: normalized.overall,
          category_budgets: normalized.categories as any,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget'] }),
  });

  return {
    budget: query.data ?? normalizeBudget(),
    isLoading: query.isLoading,
    setBudget: setBudget.mutateAsync,
  };
}

// ─── Settlements ─────────────────────────────────────────────
export function useSettlements() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const settleUp = useMutation({
    mutationFn: async ({ groupId, amount, transactionIds, memberName }: { groupId: string; amount: number; transactionIds: string[]; memberName: string }) => {
      // Record settlement
      const { error: sErr } = await supabase.from('settlements').insert({
        user_id: user!.id,
        group_id: groupId,
        amount,
      });
      if (sErr) throw sErr;

      // Mark splits as settled for this member in each transaction
      for (const txId of transactionIds) {
        const { data: tx, error: tErr } = await supabase.from('transactions').select('splits').eq('id', txId).single();
        if (tErr || !tx) continue;
        const splits = (tx.splits as unknown as SplitMember[]).map(s =>
          s.name.toLowerCase() === memberName.toLowerCase() ? { ...s, settled: true } : s
        );
        await supabase.from('transactions').update({ splits: splits as any }).eq('id', txId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['settlements'] });
    },
  });

  return { settleUp: settleUp.mutateAsync };
}

// ─── Settings (local-only, no DB table) ──────────────────────
export function useSettings() {
  const key = 'finclarity-settings';
  const stored = localStorage.getItem(key);
  const settings: AppSettings = stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;

  const updateSettings = (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    localStorage.setItem(key, JSON.stringify(next));
    // Force re-render by dispatching storage event
    window.dispatchEvent(new Event('storage'));
    return next;
  };

  return { settings, updateSettings };
}

// ─── Pure helpers ────────────────────────────────────────────
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
