import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Wallet, Settings } from 'lucide-react';
import { useStore, getTotalSpend, getCategoryBreakdown, getPaymentModeBreakdown, getActiveTransactions } from '@/store/useStore';
import { BudgetBar } from '@/components/BudgetBar';
import { NotificationBell } from '@/components/NotificationBell';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getCurrentMonth, getCurrentMonthLabel } from '@/lib/dateUtils';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4', '#64748b'];

const Dashboard = () => {
  const navigate = useNavigate();
  const transactions = useStore(s => s.transactions);
  const budget = useStore(s => s.budget);
  const settings = useStore(s => s.settings);
  const currentMonth = getCurrentMonth();
  const totalSpend = useMemo(() => getTotalSpend(transactions, currentMonth), [transactions, currentMonth]);
  const totalSpendAllTime = useMemo(() => getTotalSpend(transactions), [transactions]);
  const categoryData = useMemo(() => getCategoryBreakdown(transactions, currentMonth), [transactions, currentMonth]);
  const txns = useMemo(() => getActiveTransactions(transactions), [transactions]);
  const txnCount = useMemo(() => txns.filter(t => t.date.startsWith(currentMonth)).length, [txns, currentMonth]);

  // Category budget usage data
  const categoryBudgetData = useMemo(() => categoryData.map(c => ({
    name: c.name,
    spent: c.value,
    budget: budget.categories[c.name as keyof typeof budget.categories] || 0,
  })).filter(c => c.budget > 0), [categoryData, budget]);

  const formatAmount = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  return (
    <div className="px-4 pt-14 pb-20 safe-bottom flex flex-col gap-3" style={{ minHeight: 'calc(100vh - 56px)', maxHeight: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{getCurrentMonthLabel()}</p>
          <h1 className="text-xl font-bold text-foreground">FinClarity</h1>
        </div>
        <div className="flex items-center gap-2">
          {settings.budgetAlerts && <NotificationBell />}
          <button onClick={() => navigate('/settings')} className="p-2 rounded-xl bg-secondary text-muted-foreground">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Total Spend Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-3 glow">
          <p className="text-[10px] text-muted-foreground mb-0.5">This Month</p>
          <h2 className="text-xl font-extrabold text-gradient">{formatAmount(totalSpend)}</h2>
          <div className="flex items-center gap-1 text-primary text-[10px] font-medium mt-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {txnCount} txns
          </div>
        </motion.div>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card p-3">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total Spend</p>
          <h2 className="text-xl font-extrabold text-foreground">{formatAmount(totalSpendAllTime)}</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">All time</p>
        </motion.div>
      </div>

      {settings.budgetAlerts && <BudgetBar />}

      {/* Category Budget Usage - compact */}
      {categoryBudgetData.length > 0 && (
        <div className="glass-card p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Category Budget Usage</h3>
          <div className="space-y-1.5">
            {categoryBudgetData.slice(0, 4).map(c => {
              const pct = Math.min((c.spent / c.budget) * 100, 100);
              const over = c.spent > c.budget;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className={`font-medium ${over ? 'text-destructive' : 'text-foreground'}`}>
                      {formatAmount(c.spent)} / {formatAmount(c.budget)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${over ? 'gradient-danger' : pct >= 80 ? 'gradient-accent' : 'gradient-primary'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Category pie - compact */}
      {settings.aiCategorisation && (
        <div className="glass-card p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">By Category</h3>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={18} outerRadius={36} paddingAngle={3} dataKey="value" stroke="none">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1 max-h-20 overflow-y-auto">
              {categoryData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{formatAmount(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
