import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Budget {
  id: string;
  user_id: string;
  month: string;
  overall_budget: number;
  category_budgets: Record<string, number>;
}

export function useBudget(month: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['budgets', user?.id, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as Budget | null;
    },
    enabled: !!user,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (b: { month: string; overall_budget: number; category_budgets: Record<string, number> }) => {
      const { error } = await supabase
        .from('budgets')
        .upsert({ ...b, user_id: user!.id }, { onConflict: 'user_id,month' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
