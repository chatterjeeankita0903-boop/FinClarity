import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Wallet, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudget } from '@/hooks/useBudgets';
import { BudgetBar } from '@/components/BudgetBar';
import { NotificationBell } from '@/components/NotificationBell';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getCurrentMonth, getShortMonthLabel, getMonthLabel } from '@/lib/dateUtils';
import { BudgetEditorSheet } from '@/components/BudgetEditorSheet';

const ALL_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4', '#64748b'];
const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

const CHART_TOOLTIP_STYLE = {
  background: 'hsl(var(--chart-tooltip-bg) / 0.96)',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-card)',
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="px-3 py-2" style={CHART_TOOLTIP_STYLE}>
        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--chart-tooltip-foreground))' }}>
          {data.name}: ₹{data.value >= 1000 ? (data.value / 1000).toFixed(1) + 'K' : data.value}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: transactions = [], isLoading } = useTransactions();
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Dynamic month list
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(getCurrentMonth());
    transactions.forEach(t => months.add(t.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const { data: budgetData } = useBudget(selectedMonth);

  const monthTxns = useMemo(() => transactions.filter(t => t.date.startsWith(selectedMonth)), [transactions, selectedMonth]);
  const totalSpend = useMemo(() => monthTxns.reduce((s, t) => s + Number(t.amount), 0), [monthTxns]);
  const totalSpendAllTime = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount), 0), [transactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.forEach(t => { map[t.category] = (map[t.category] || 0) + Number(t.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTxns]);

  const chartData = useMemo(() => categoryData.filter(d => d.value > 0), [categoryData]);
  const categoryChartKey = useMemo(() => chartData.map(({ name, value }) => `${name}:${value}`).join('|'), [chartData]);

  const budget = {
    overall: budgetData?.overall_budget ?? 0,
    categories: (budgetData?.category_budgets ?? {}) as Record<string, number>,
  };

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

  const budgetEnabled = budget.overall > 0;

  if (isLoading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-14 safe-bottom flex flex-col gap-3 overflow-y-auto" style={{ minHeight: '100dvh' }}>
      <div className="flex items-center justify-between">
        <div>
          {/* Month selector */}
          <div className="relative">
            <button onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {getMonthLabel(selectedMonth)}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showMonthPicker && (
              <div className="absolute top-6 left-0 bg-card border border-border rounded-xl shadow-lg z-50 py-1 min-w-[140px]">
                {availableMonths.map(m => (
                  <button key={m} onClick={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-secondary transition-colors ${m === selectedMonth ? 'text-primary font-semibold' : 'text-foreground'}`}>
                    {getMonthLabel(m)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground">FinClarity</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => navigate('/settings')} className="p-2 rounded-xl bg-secondary text-muted-foreground">
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-3 glow">
          <p className="text-[10px] text-muted-foreground mb-0.5">This Month</p>
          <h2 className="text-lg sm:text-xl font-extrabold text-gradient">{formatAmount(totalSpend)}</h2>
          <div className="flex items-center gap-1 text-primary text-[10px] font-medium mt-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {monthTxns.length} txns
          </div>
        </motion.div>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card p-3">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total Spend</p>
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground">{formatAmount(totalSpendAllTime)}</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">All time</p>
        </motion.div>
      </div>

      {budgetEnabled ? (
        <BudgetBar />
      ) : (
        <div className="glass-card p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">No monthly budget set yet.</p>
          <button onClick={() => setShowBudgetEditor(true)} className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Set Now →</button>
        </div>
      )}

      <button onClick={() => setShowBudgetEditor(true)} className="glass-card p-3 flex items-center justify-between gap-3 w-full text-left">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Manage Budgets</span>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Edit →</span>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div className="glass-card p-3">
          <h3 className="text-[10px] font-semibold text-foreground mb-2">By Category</h3>
          {chartData.length > 0 ? (
            <>
              <div className="h-44 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={categoryChartKey || 'empty'}>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius="58%" outerRadius="88%" paddingAngle={chartData.length > 1 ? 3 : 0} minAngle={chartData.length > 1 ? 6 : 0} dataKey="value" stroke="none" isAnimationActive={chartData.length > 1}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-0.5 mt-2 max-h-24 overflow-y-auto">
                {chartData.map((item, i) => (
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
            <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      <BudgetEditorSheet open={showBudgetEditor} onClose={() => setShowBudgetEditor(false)} />
    </div>
  );
};

export default Dashboard;
