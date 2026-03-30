import { useStore, useTotalSpend } from '@/store/useStore';

export const BudgetBar = () => {
  const budget = useStore(s => s.budget);
  const totalSpend = useTotalSpend('2026-03');
  const percentage = budget.overall > 0 ? Math.min((totalSpend / budget.overall) * 100, 100) : 0;
  const remaining = budget.overall - totalSpend;

  const barColor = percentage >= 100 ? 'gradient-danger' : percentage >= 80 ? 'gradient-accent' : 'gradient-primary';

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">Monthly Budget</span>
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
