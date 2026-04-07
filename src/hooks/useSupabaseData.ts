import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Transaction, Group, Budget, Category, PaymentMode, TransactionSource, SplitMember, normalizeBudget } from '@/store/useStore';
import { toast } from 'sonner';

// DB row → app type mappers
const mapTransaction = (row: any): Transaction => ({
  id: row.id,
  amount: Number(row.amount),
  date: row.date,
  merchant: row.merchant,
  category: row.category as Category,
  paymentMode: row.payment_mode as PaymentMode,
  source: row.source as TransactionSource,
  isSplit: row.is_split,
  userShare: Number(row.user_share),
  isIgnored: row.is_ignored,
  groupId: row.group_id,
  splits: (row.splits || []) as SplitMember[],
  note: row.note,
});

const mapGroup = (row: any): Group => ({
  id: row.id,
  name: row.name,
  members: (row.members || []) as { id: string; name: string }[],
  createdAt: row.created_at?.split('T')[0] || '',
});

// ─── Transactions ───

export function useTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapTransaction);
    },
    enabled: !!user,
    staleTime: 0,
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (t: Omit<Transaction, 'id'>) => {
      const { error } = await supabase.from('transactions').insert({
        user_id: user!.id,
        amount: t.amount,
        date: t.date,
        merchant: t.merchant,
        category: t.category,
        payment_mode: t.paymentMode,
        source: t.source,
        is_split: t.isSplit,
        user_share: t.userShare,
        is_ignored: t.isIgnored,
        group_id: t.groupId,
        splits: t.splits as any,
        note: t.note,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
      const payload: any = {};
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.merchant !== undefined) payload.merchant = updates.merchant;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.paymentMode !== undefined) payload.payment_mode = updates.paymentMode;
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
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Groups ───

export function useGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapGroup);
    },
    enabled: !!user,
    staleTime: 0,
  });
}

export function useAddGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (g: Omit<Group, 'id' | 'createdAt'>) => {
      const { error } = await supabase.from('groups').insert({
        user_id: user!.id,
        name: g.name,
        members: g.members as any,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Budget ───

export function useBudget() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['budget', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*').maybeSingle();
      if (error) throw error;
      if (!data) return normalizeBudget();
      return normalizeBudget({ overall: Number(data.overall), categories: data.categories as any });
    },
    enabled: !!user,
    staleTime: 0,
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (b: Budget) => {
      const normalized = normalizeBudget(b);
      const { error } = await supabase.from('budgets').upsert({
        user_id: user!.id,
        overall: normalized.overall,
        categories: normalized.categories as any,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget'] }),
    onError: (e: any) => toast.error(e.message),
  });
}
