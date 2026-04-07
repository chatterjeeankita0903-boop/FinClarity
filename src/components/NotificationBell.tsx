import { useState, useMemo } from 'react';
import { Bell, X, AlertTriangle, MessageSquare, TrendingUp } from 'lucide-react';
import { useTransactions, useBudget } from '@/hooks/useSupabaseData';
import { getTotalSpend, getCategoryBreakdown } from '@/store/useStore';
import { AnimatePresence, motion } from 'framer-motion';

interface Notification {
  id: string;
  icon: typeof Bell;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  time: string;
}

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { data: transactions = [] } = useTransactions();
  const { data: budget = { overall: 0, categories: {} } } = useBudget();

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];
    const totalSpend = getTotalSpend(transactions, '2026-03');
    const pct = budget.overall > 0 ? (totalSpend / budget.overall) * 100 : 0;

    if (pct >= 100) {
      notifs.push({ id: 'over', icon: AlertTriangle, title: 'Budget Exceeded!', message: `You've spent ₹${totalSpend.toLocaleString('en-IN')} — over your ₹${budget.overall.toLocaleString('en-IN')} budget.`, type: 'warning', time: 'Now' });
    } else if (pct >= 80) {
      notifs.push({ id: 'warn', icon: AlertTriangle, title: 'Budget Alert', message: `${pct.toFixed(0)}% of monthly budget used. ₹${(budget.overall - totalSpend).toLocaleString('en-IN')} remaining.`, type: 'warning', time: 'Now' });
    }

    const catData = getCategoryBreakdown(transactions, '2026-03');
    catData.forEach(c => {
      const catBudget = budget.categories[c.name as keyof typeof budget.categories];
      if (catBudget && c.value > catBudget) {
        notifs.push({ id: `cat-${c.name}`, icon: TrendingUp, title: `${c.name} Over Budget`, message: `Spent ₹${c.value.toLocaleString('en-IN')} / ₹${catBudget.toLocaleString('en-IN')}`, type: 'warning', time: 'Today' });
      }
    });

    notifs.push({ id: 'sms', icon: MessageSquare, title: 'New SMS Detected', message: '3 new transactional SMS parsed and ready to review.', type: 'info', time: '2h ago' });

    return notifs;
  }, [transactions, budget]);

  const typeColors = { warning: 'text-accent', info: 'text-info', success: 'text-primary' };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-xl bg-secondary text-muted-foreground">
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 gradient-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 z-50 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h4 className="text-sm font-bold text-foreground">Notifications</h4>
                <button onClick={() => setOpen(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="flex gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                    <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 ${typeColors[n.type]}`}>
                      <n.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
