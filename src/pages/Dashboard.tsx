import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Wallet, Settings as SettingsIcon, Calendar as CalendarIcon, X } from 'lucide-react';
import { getActiveTransactions, ALL_CATEGORIES } from '@/store/useStore';
import { useTransactions, useBudget } from '@/hooks/useSupabaseData';
import { useStore } from '@/store/useStore';
import { BudgetBar } from '@/components/BudgetBar';
import { NotificationBell } from '@/components/NotificationBell';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getCurrentMonthLabel } from '@/lib/dateUtils';
import { BudgetEditorSheet } from '@/components/BudgetEditorSheet';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

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
        <p className="text-xs font-semibold" style={{ color: 'hsl(var(--chart-tooltip-foreground))' }}>{data.name}: ₹{data.value >= 1000 ? (data.value / 1000).toFixed(1) + 'K' : data.value}</p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: transactions = [], isLoading: txnLoading } = useTransactions();
  const { data: budget = { overall: 0, categories: {} } } = useBudget();
  const settings = useStore(s => s.settings);
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const [fromDate, setFromDate] = useState<Date>(monthStart);
  const [toDate, setToDate] = useState<Date>(monthEnd);
  const isCustom = !isSameDay(fromDate, monthStart) || !isSameDay(toDate, monthEnd);
  const fromStr = format(fromDate, 'yyyy-MM-dd');
  const toStr = format(toDate, 'yyyy-MM-dd');

  const activeTxns = useMemo(() => getActiveTransactions(transactions), [transactions]);
  const rangeTxns = useMemo(
    () => activeTxns.filter(t => t.date >= fromStr && t.date <= toStr),
    [activeTxns, fromStr, toStr]
  );
  const totalSpend = useMemo(() => rangeTxns.reduce((s, t) => s + t.userShare, 0), [rangeTxns]);
  const totalSpendAllTime = useMemo(() => activeTxns.reduce((s, t) => s + t.userShare, 0), [activeTxns]);
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    rangeTxns.forEach(t => { map[t.category] = (map[t.category] || 0) + t.userShare; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rangeTxns]);
  const chartData = useMemo(() => categoryData.filter((item) => item.value > 0), [categoryData]);
  const txnCount = rangeTxns.length;
  const categoryChartKey = useMemo(() => chartData.map(({ name, value }) => `${name}:${value}`).join('|'), [chartData]);

  const resetRange = () => { setFromDate(monthStart); setToDate(monthEnd); };

  const [showBudgetEditor, setShowBudgetEditor] = useState(false);

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

  if (txnLoading) {
    return (
      <div className="px-4 pt-14 safe-bottom flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted-foreground text-sm">Loading your data...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 safe-bottom flex flex-col gap-3 overflow-y-auto" style={{ minHeight: '100dvh' }}>
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

      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-secondary text-foreground">
              <CalendarIcon className="w-3 h-3" />
              {format(fromDate, 'd MMM')} – {format(toDate, 'd MMM yyyy')}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <div className="flex flex-col sm:flex-row">
              <div>
                <p className="px-3 pt-3 text-[10px] font-semibold text-muted-foreground">From</p>
                <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
              </div>
              <div>
                <p className="px-3 pt-3 text-[10px] font-semibold text-muted-foreground">To</p>
                <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} className={cn('p-3 pointer-events-auto')} />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {isCustom && (
          <button onClick={resetRange} className="flex items-center gap-1 text-[11px] text-destructive">
            <X className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-3 glow">
          <p className="text-[10px] text-muted-foreground mb-0.5">{isCustom ? 'Customized duration spend' : 'This Month'}</p>
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

      {budgetEnabled ? (
        <BudgetBar from={fromStr} to={toStr} label={isCustom ? 'Customized duration budget' : 'Monthly Budget'} />
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
