import { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudget } from '@/hooks/useBudgets';
import { getCurrentMonth } from '@/lib/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationBell = () => {
  const { data: transactions = [] } = useTransactions();
  const currentMonth = getCurrentMonth();
  const { data: budgetData } = useBudget(currentMonth);
  const [open, setOpen] = useState(false);

  const notifications = useMemo(() => {
    const notes: { id: string; text: string; type: 'warning' | 'info' }[] = [];
    const overall = budgetData?.overall_budget ?? 0;
    const monthTxns = transactions.filter(t => t.date.startsWith(currentMonth));
    const totalSpend = monthTxns.reduce((s, t) => s + Number(t.amount), 0);

    if (overall > 0) {
      const pct = (totalSpend / overall) * 100;
      if (pct >= 100) notes.push({ id: 'over', text: `You've exceeded your monthly budget by ₹${(totalSpend - overall).toLocaleString('en-IN')}`, type: 'warning' });
      else if (pct >= 80) notes.push({ id: 'near', text: `You've used ${Math.round(pct)}% of your monthly budget`, type: 'warning' });
    }

    const catBudgets = (budgetData?.category_budgets ?? {}) as Record<string, number>;
    const catSpend: Record<string, number> = {};
    monthTxns.forEach(t => { catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount); });
    Object.entries(catBudgets).forEach(([cat, limit]) => {
      if (limit > 0 && (catSpend[cat] || 0) > limit) {
        notes.push({ id: `cat-${cat}`, text: `${cat} budget exceeded`, type: 'warning' });
      }
    });

    return notes;
  }, [transactions, budgetData, currentMonth]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 rounded-xl bg-secondary text-muted-foreground relative">
        <Bell className="w-4 h-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full gradient-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 top-12 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">All clear! 🎉</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="px-4 py-3 border-b border-border/50 last:border-0">
                    <p className={`text-xs ${n.type === 'warning' ? 'text-accent' : 'text-foreground'}`}>{n.text}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
