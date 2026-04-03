import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Group {
  id: string;
  user_id: string;
  name: string;
  members: { name: string }[];
  created_at: string;
}

export interface GroupExpense {
  id: string;
  group_id: string;
  user_id: string;
  description: string;
  amount: number;
  paid_by: string;
  split_among: { name: string; share: number }[];
  date: string;
}

export interface Settlement {
  id: string;
  group_id: string;
  user_id: string;
  settled_at: string;
  amount: number;
}

export function useGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Group[];
    },
    enabled: !!user,
  });
}

export function useAddGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (g: { name: string; members: { name: string }[] }) => {
      const { error } = await supabase.from('groups').insert({ ...g, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
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
  });
}

export function useGroupExpenses(groupId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['group_expenses', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('group_expenses').select('*').eq('group_id', groupId);
      if (error) throw error;
      return (data ?? []) as GroupExpense[];
    },
    enabled: !!user && !!groupId,
  });
}

export function useAddGroupExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (e: Omit<GroupExpense, 'id' | 'user_id'>) => {
      const { error } = await supabase.from('group_expenses').insert({ ...e, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group_expenses'] }),
  });
}

export function useSettlements(groupId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['settlements', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from('settlements').select('*').eq('group_id', groupId);
      if (error) throw error;
      return (data ?? []) as Settlement[];
    },
    enabled: !!user && !!groupId,
  });
}

export function useAddSettlement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (s: { group_id: string; amount: number }) => {
      const { error } = await supabase.from('settlements').insert({ ...s, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      qc.invalidateQueries({ queryKey: ['group_expenses'] });
    },
  });
}
