import { useMemo } from 'react';
import { useTransactions, useBudget } from '@/hooks/useSupabaseData';
import { getActiveTransactions } from '@/store/useStore';

interface BudgetBarProps {
  from: string;
  to: string;
  label?: string;
}

export const BudgetBar = ({ from, to, label = 'Monthly Budget' }: BudgetBarProps) => {
  const { data: transactions = [] } = useTransactions();
  const { data: budget = { overall: 0, categories: {} } } = useBudget();
  const totalSpend = useMemo(
    () => getActiveTransactions(transactions).filter(t => t.date >= from && t.date <= to).reduce((s, t) => s + t.userShare, 0),
    [transactions, from, to]
  );
  const percentage = budget.overall > 0 ? Math.min((totalSpend / budget.overall) * 100, 100) : 0;
  const remaining = budget.overall - totalSpend;

  const barColor = percentage >= 100 ? 'gradient-danger' : percentage >= 80 ? 'gradient-accent' : 'gradient-primary';

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground">₹{totalSpend.toLocaleString('en-IN')} / ₹{budget.overall.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className={`text-xs mt-1.5 font-medium ${remaining < 0 ? 'text-destructive' : remaining < budget.overall * 0.2 ? 'text-warning' : 'text-primary'}`}>
        {remaining < 0 ? `Over budget by ₹${Math.abs(remaining).toLocaleString('en-IN')}` : `₹${remaining.toLocaleString('en-IN')} remaining`}
      </p>
    </div>
  );
};
