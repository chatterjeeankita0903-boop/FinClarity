import { useMemo, useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudget } from '@/hooks/useBudgets';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Lightbulb, CreditCard, Heart, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentMonth, getShortMonthLabel, getMonthLabel, getPreviousMonth } from '@/lib/dateUtils';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4'];

const chartTooltipProps = {
  contentStyle: {
    background: 'hsl(var(--chart-tooltip-bg) / 0.96)',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'hsl(var(--chart-tooltip-foreground))',
  },
  labelStyle: { color: 'hsl(var(--chart-tooltip-foreground))' },
  itemStyle: { color: 'hsl(var(--chart-tooltip-foreground))' },
};

const Insights = () => {
  const { data: transactions = [], isLoading } = useTransactions();
  const currentMonth = getCurrentMonth();
  const { data: budgetData } = useBudget(currentMonth);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Dynamic months from data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonth);
    transactions.forEach(t => months.add(t.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions, currentMonth]);

  const filteredTxns = useMemo(() => transactions.filter(t => t.date.startsWith(selectedMonth)), [transactions, selectedMonth]);
  const totalSpend = useMemo(() => filteredTxns.reduce((s, t) => s + Number(t.amount), 0), [filteredTxns]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTxns.forEach(t => { map[t.category] = (map[t.category] || 0) + Number(t.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);

  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTxns.forEach(t => { map[t.payment_method] = (map[t.payment_method] || 0) + Number(t.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);

  const momData = useMemo(() => availableMonths.slice().reverse().map(m => ({
    month: getShortMonthLabel(m),
    spend: transactions.filter(t => t.date.startsWith(m)).reduce((s, t) => s + Number(t.amount), 0),
  })), [transactions, availableMonths]);

  const budget = { overall: budgetData?.overall_budget ?? 0 };

  const healthScore = useMemo(() => {
    let score = 100;
    const budgetUsage = budget.overall > 0 ? totalSpend / budget.overall : 0;
    if (budgetUsage > 1) score -= 30;
    else if (budgetUsage > 0.8) score -= 15;
    if (filteredTxns.length === 0) score -= 20;
    return Math.max(0, Math.min(100, score));
  }, [totalSpend, budget, filteredTxns]);

  const scoreColor = healthScore >= 75 ? 'text-primary' : healthScore >= 50 ? 'text-accent' : 'text-destructive';
  const scoreLabel = healthScore >= 75 ? 'Excellent' : healthScore >= 50 ? 'Good' : 'Needs Attention';
  const formatAmount = (n: number) => `₹${n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n}`;

  if (isLoading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
      <h1 className="text-2xl font-bold text-foreground">Insights</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {availableMonths.map(m => (
          <button key={m} onClick={() => setSelectedMonth(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${selectedMonth === m ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >{getShortMonthLabel(m)}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3 glow">
          <p className="text-[10px] text-muted-foreground">Transactions</p>
          <p className="text-xl font-extrabold text-gradient">{filteredTxns.length}</p>
        </div>
        <div className="glass-card p-3 glow">
          <p className="text-[10px] text-muted-foreground">Amount Spent</p>
          <p className="text-xl font-extrabold text-gradient">{formatAmount(totalSpend)}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{getMonthLabel(selectedMonth)}</p>

      {/* Financial Health */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Financial Health</h3>
          </div>
          <button onClick={() => setShowScoreInfo(!showScoreInfo)} className="text-muted-foreground"><Info className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                strokeDasharray={`${(healthScore / 100) * 175.9} 175.9`} strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${scoreColor}`}>{healthScore}</span>
          </div>
          <div>
            <p className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</p>
            <p className="text-[11px] text-muted-foreground">Based on budget adherence and spending patterns</p>
          </div>
        </div>
      </div>

      {/* Month-on-Month */}
      {momData.length > 1 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Month-on-Month</h3>
          <div className="h-36">
            <ResponsiveContainer>
              <LineChart data={momData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215 12% 50%)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 12% 50%)' }} tickFormatter={v => formatAmount(v)} />
                <Tooltip {...chartTooltipProps} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Spend']} />
                <Line type="monotone" dataKey="spend" stroke="hsl(152, 68%, 46%)" strokeWidth={2} dot={{ fill: 'hsl(152, 68%, 46%)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Category</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215 12% 50%)' }} tickFormatter={v => formatAmount(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 12% 50%)' }} width={80} />
                <Tooltip {...chartTooltipProps} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Spent']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payment Modes */}
      {paymentData.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Payment Mode</h3>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius="50%" outerRadius="85%" paddingAngle={3} dataKey="value" stroke="none">
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...chartTooltipProps} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Spent']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-0.5 mt-2">
            {paymentData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium text-foreground">{formatAmount(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;
