import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudget } from '@/hooks/useBudgets';
import { getCurrentMonth } from '@/lib/dateUtils';

export const BudgetBar = () => {
  const { data: transactions = [] } = useTransactions();
  const currentMonth = getCurrentMonth();
  const { data: budgetData } = useBudget(currentMonth);

  const totalSpend = useMemo(() =>
    transactions.filter(t => t.date.startsWith(currentMonth)).reduce((s, t) => s + Number(t.amount), 0),
    [transactions, currentMonth]
  );

  const overall = budgetData?.overall_budget ?? 0;
  const percentage = overall > 0 ? Math.min((totalSpend / overall) * 100, 100) : 0;
  const remaining = overall - totalSpend;
  const barColor = percentage >= 100 ? 'gradient-danger' : percentage >= 80 ? 'gradient-accent' : 'gradient-primary';

  if (!overall) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">Monthly Budget</span>
        <span className="text-sm font-bold text-foreground">₹{totalSpend.toLocaleString('en-IN')} / ₹{overall.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className={`text-xs mt-1.5 font-medium ${remaining < 0 ? 'text-destructive' : remaining < overall * 0.2 ? 'text-warning' : 'text-primary'}`}>
        {remaining < 0 ? `Over budget by ₹${Math.abs(remaining).toLocaleString('en-IN')}` : `₹${remaining.toLocaleString('en-IN')} remaining`}
      </p>
    </div>
  );
};
