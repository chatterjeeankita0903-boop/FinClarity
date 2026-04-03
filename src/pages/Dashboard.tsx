import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Wallet, Settings as SettingsIcon } from 'lucide-react';
import { useStore, getTotalSpend, getCategoryBreakdown, getActiveTransactions, Category } from '@/store/useStore';
import { BudgetBar } from '@/components/BudgetBar';
import { NotificationBell } from '@/components/NotificationBell';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getCurrentMonth, getCurrentMonthLabel } from '@/lib/dateUtils';
import { Switch } from '@/components/ui/switch';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4', '#64748b'];

const ALL_CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg">
        <p className="text-xs font-semibold" style={{ color: 'white' }}>{data.name}: ₹{data.value >= 1000 ? (data.value / 1000).toFixed(1) + 'K' : data.value}</p>
      </div>
    );
  }
  return null;
};

const CATEGORIES_LIST: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];

const Dashboard = () => {
  const navigate = useNavigate();
  const transactions = useStore(s => s.transactions);
  const budget = useStore(s => s.budget);
  const settings = useStore(s => s.settings);
  const { setBudget } = useStore();
  const currentMonth = getCurrentMonth();
  const totalSpend = useMemo(() => getTotalSpend(transactions, currentMonth), [transactions, currentMonth]);
  const totalSpendAllTime = useMemo(() => getTotalSpend(transactions), [transactions]);
  const categoryData = useMemo(() => getCategoryBreakdown(transactions, currentMonth), [transactions, currentMonth]);
  const txns = useMemo(() => getActiveTransactions(transactions), [transactions]);
  const txnCount = useMemo(() => txns.filter(t => t.date.startsWith(currentMonth)).length, [txns, currentMonth]);

  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [editBudget, setEditBudget] = useState(budget);

  const saveBudget = () => { setBudget(editBudget); setShowBudgetEditor(false); };

  // All categories with budget info
  const allCategoryData = useMemo(() => {
    const spendMap: Record<string, number> = {};
    categoryData.forEach(c => { spendMap[c.name] = c.value; });
    return ALL_CATEGORIES.map(cat => ({
      name: cat,
      spent: spendMap[cat] || 0,
      budget: budget.categories[cat] || 0,
    }));
  }, [categoryData, budget]);

  const formatAmount = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const budgetEnabled = settings.monthlyBudget && budget.overall > 0;

  return (
    <div className="px-4 pt-14 pb-20 safe-bottom flex flex-col gap-3 overflow-y-auto" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{getCurrentMonthLabel()}</p>
          <h1 className="text-xl font-bold text-foreground">FinClarity</h1>
        </div>
        <div className="flex items-center gap-2">
          {settings.budgetAlerts && <NotificationBell />}
          <button onClick={() => navigate('/settings')} className="p-2 rounded-xl bg-secondary text-muted-foreground">
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Total Spend Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-3 glow">
          <p className="text-[10px] text-muted-foreground mb-0.5">This Month</p>
          <h2 className="text-lg sm:text-xl font-extrabold text-gradient">{formatAmount(totalSpend)}</h2>
          <div className="flex items-center gap-1 text-primary text-[10px] font-medium mt-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {txnCount} txns
          </div>
        </motion.div>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card p-3">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total Spend</p>
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground">{formatAmount(totalSpendAllTime)}</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">All time</p>
        </motion.div>
      </div>

      {/* Monthly Budget - or prompt to set */}
      {budgetEnabled ? (
        <BudgetBar />
      ) : (
        <div className="glass-card p-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">No monthly budget set yet.</p>
          <button onClick={() => setShowBudgetEditor(true)} className="text-xs font-semibold text-primary">Set Now →</button>
        </div>
      )}

      {/* Manage Budget CTA */}
      {budgetEnabled && (
        <button onClick={() => setShowBudgetEditor(true)} className="glass-card p-3 flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Manage Budgets</span>
          </div>
          <span className="text-xs text-primary font-medium">Edit →</span>
        </button>
      )}

      {/* Side-by-side: Category Budget Usage + Pie Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Category Budget Usage - all categories */}
        <div className="glass-card p-3">
          <h3 className="text-[10px] font-semibold text-foreground mb-2">Category Budget</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {allCategoryData.map(c => {
              const hasBudget = c.budget > 0;
              const pct = hasBudget ? Math.min((c.spent / c.budget) * 100, 100) : 0;
              const over = hasBudget && c.spent > c.budget;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className="text-muted-foreground">{CATEGORY_EMOJI[c.name]} {c.name}</span>
                    {hasBudget ? (
                      <span className={`font-medium ${over ? 'text-destructive' : 'text-foreground'}`}>
                        {formatAmount(c.spent)}/{formatAmount(c.budget)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{c.spent > 0 ? formatAmount(c.spent) : '—'}</span>
                    )}
                  </div>
                  {hasBudget ? (
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${over ? 'gradient-danger' : pct >= 80 ? 'gradient-accent' : 'gradient-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  ) : (
                    <p className="text-[8px] text-muted-foreground/60 italic">No budget set</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category pie - always show */}
        <div className="glass-card p-3">
          <h3 className="text-[10px] font-semibold text-foreground mb-2">By Category</h3>
          {categoryData.length > 0 ? (
            <>
              <div className="w-full" style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={20} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Category list below pie - descending order */}
              <div className="space-y-0.5 mt-2 max-h-24 overflow-y-auto">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{formatAmount(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">No spending data yet</p>
          )}
        </div>
      </div>

      {/* Budget Editor Modal */}
      {showBudgetEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={() => setShowBudgetEditor(false)}>
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">Manage Budgets</h3>
              <button onClick={() => setShowBudgetEditor(false)} className="text-muted-foreground text-sm">Done</button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="mb-5">
                <label className="text-xs text-muted-foreground mb-1.5 block">Overall Monthly Budget</label>
                <input type="number" value={editBudget.overall} onChange={(e) => setEditBudget({ ...editBudget, overall: Number(e.target.value) })}
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none border border-border focus:border-primary" />
              </div>

              <p className="text-xs text-muted-foreground mb-3">Category Budgets</p>
              <div className="space-y-3 mb-4">
                {CATEGORIES_LIST.map(cat => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-28">{cat}</span>
                    <input type="number" value={editBudget.categories[cat] || ''}
                      onChange={(e) => setEditBudget({ ...editBudget, categories: { ...editBudget.categories, [cat]: Number(e.target.value) || 0 } })}
                      placeholder="₹0"
                      className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={saveBudget} className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl flex-shrink-0 mt-2">Set Budget</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
