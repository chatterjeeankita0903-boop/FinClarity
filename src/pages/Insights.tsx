import { useMemo, useState } from 'react';
import { getCategoryBreakdown, getPaymentModeBreakdown, getActiveTransactions, getTotalSpend, useStore } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Brain, TrendingUp, TrendingDown, Lightbulb, CreditCard, CalendarDays, Users, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentMonth, getRecentMonths, getShortMonthLabel, getMonthLabel, getPreviousMonth } from '@/lib/dateUtils';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4'];

const Insights = () => {
  const transactions = useStore(s => s.transactions);
  const budget = useStore(s => s.budget);
  const groups = useStore(s => s.groups);
  const [activeTab, setActiveTab] = useState<'overview' | 'modes' | 'ai'>('overview');

  const recentMonths = useMemo(() => getRecentMonths(6), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter transactions by date range, group, and month
  const filteredTxns = useMemo(() => {
    let txns = getActiveTransactions(transactions);
    if (selectedGroup) {
      txns = txns.filter(t => t.groupId === selectedGroup);
    }
    if (dateFrom) {
      txns = txns.filter(t => t.date >= dateFrom);
    }
    if (dateTo) {
      txns = txns.filter(t => t.date <= dateTo);
    }
    // If date range is set, ignore month filter
    if (!dateFrom && !dateTo) {
      txns = txns.filter(t => t.date.startsWith(selectedMonth));
    }
    return txns;
  }, [transactions, selectedMonth, dateFrom, dateTo, selectedGroup]);

  const totalSpend = useMemo(() => filteredTxns.reduce((s, t) => s + t.userShare, 0), [filteredTxns]);
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTxns.forEach(t => { map[t.category] = (map[t.category] || 0) + t.userShare; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);
  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTxns.forEach(t => { map[t.paymentMode] = (map[t.paymentMode] || 0) + t.userShare; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);

  const topMerchants = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTxns.forEach(t => { map[t.merchant] = (map[t.merchant] || 0) + t.userShare; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [filteredTxns]);

  const categoryBudgetData = useMemo(() => categoryData.map(c => ({
    name: c.name,
    spent: c.value,
    budget: budget.categories[c.name as keyof typeof budget.categories] || 0,
  })), [categoryData, budget]);

  // Month-on-Month data
  const momData = useMemo(() => {
    return recentMonths.map(m => ({
      month: getShortMonthLabel(m),
      spend: getTotalSpend(transactions, m),
    }));
  }, [transactions, recentMonths]);

  const prevMonth = getPreviousMonth();
  const momChange = useMemo(() => {
    const curr = getTotalSpend(transactions, selectedMonth);
    const prev = getTotalSpend(transactions, prevMonth);
    if (prev === 0) return null;
    return ((curr - prev) / prev * 100).toFixed(0);
  }, [transactions, selectedMonth, prevMonth]);

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights: { icon: typeof TrendingUp; text: string; type: 'tip' | 'warning' | 'positive' }[] = [];

    if (categoryData.length > 0) {
      const top = categoryData[0];
      const pct = totalSpend > 0 ? ((top.value / totalSpend) * 100).toFixed(0) : '0';
      insights.push({ icon: TrendingUp, text: `${top.name} is your top spend at ${pct}% (₹${top.value.toLocaleString('en-IN')}). Consider setting a tighter budget.`, type: 'tip' });
    }

    const budgetUsage = budget.overall > 0 ? (totalSpend / budget.overall) * 100 : 0;
    if (budgetUsage > 80) {
      insights.push({ icon: TrendingDown, text: `You've used ${budgetUsage.toFixed(0)}% of your monthly budget. Consider pausing discretionary spending.`, type: 'warning' });
    }

    const sipTxn = filteredTxns.find(t => t.category === 'SIP');
    if (sipTxn) {
      insights.push({ icon: Lightbulb, text: `Great job! Your SIP of ₹${sipTxn.userShare.toLocaleString('en-IN')} is active. Consistency builds wealth.`, type: 'positive' });
    }

    const splitSavings = filteredTxns.filter(t => t.isSplit).reduce((s, t) => s + (t.amount - t.userShare), 0);
    if (splitSavings > 0) {
      insights.push({ icon: Lightbulb, text: `You saved ₹${splitSavings.toLocaleString('en-IN')} by splitting expenses. Keep sharing costs!`, type: 'positive' });
    }

    if (paymentData.length > 0) {
      const topMode = paymentData[0];
      insights.push({ icon: CreditCard, text: `${topMode.name} is your most used payment mode (₹${topMode.value.toLocaleString('en-IN')}). Track rewards if using credit cards.`, type: 'tip' });
    }

    if (momChange && Number(momChange) > 20) {
      insights.push({ icon: TrendingDown, text: `Spending is up ${momChange}% vs last month. Review recurring subscriptions and one-off purchases.`, type: 'warning' });
    }

    return insights;
  }, [filteredTxns, categoryData, budget, paymentData, momChange, totalSpend]);

  const formatAmount = (n: number) => `₹${n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n}`;

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'modes' as const, label: 'Pay Modes' },
    { key: 'ai' as const, label: 'AI Insights' },
  ];

  const insightTypeStyles = {
    tip: 'border-info/30 bg-info/5',
    warning: 'border-accent/30 bg-accent/5',
    positive: 'border-primary/30 bg-primary/5',
  };
  const insightIconStyles = {
    tip: 'text-info',
    warning: 'text-accent',
    positive: 'text-primary',
  };

  const hasDateFilter = !!(dateFrom || dateTo);

  return (
    <div className="px-4 pt-14 safe-bottom space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Insights</h1>
        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Month Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {recentMonths.map(m => (
          <button
            key={m}
            onClick={() => { setSelectedMonth(m); setDateFrom(''); setDateTo(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              selectedMonth === m && !hasDateFilter
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-secondary text-muted-foreground'
            }`}
          >
            {getShortMonthLabel(m)}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><CalendarDays className="w-3 h-3" /> From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-xs text-foreground outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><CalendarDays className="w-3 h-3" /> To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-xs text-foreground outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Users className="w-3 h-3" /> Group</label>
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-secondary rounded-lg px-3 py-2 text-xs text-foreground outline-none border border-border focus:border-primary">
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {(hasDateFilter || selectedGroup) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSelectedGroup(''); }} className="text-xs text-destructive font-medium">Clear filters</button>
          )}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              activeTab === tab.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-secondary text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period Label */}
      <p className="text-xs text-muted-foreground">
        {hasDateFilter
          ? `${dateFrom || '...'} → ${dateTo || '...'}`
          : getMonthLabel(selectedMonth)}
        {selectedGroup ? ` · ${groups.find(g => g.id === selectedGroup)?.name}` : ''}
        {` · ${filteredTxns.length} txns · ${formatAmount(totalSpend)}`}
      </p>

      {activeTab === 'overview' && (
        <>
          {/* Month-on-Month */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Month-on-Month</h3>
              {momChange && (
                <span className={`text-xs font-bold flex items-center gap-1 ${Number(momChange) > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {Number(momChange) > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {momChange}% vs prev
                </span>
              )}
            </div>
            <div className="h-36">
              <ResponsiveContainer>
                <LineChart data={momData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215 12% 50%)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 12% 50%)' }} tickFormatter={v => formatAmount(v)} />
                  <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="spend" stroke="hsl(152 68% 46%)" strokeWidth={2.5} dot={{ fill: 'hsl(152 68% 46%)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Merchants */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top Merchants</h3>
            <div className="h-40">
              <ResponsiveContainer>
                <BarChart data={topMerchants} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'hsl(215 12% 50%)' }} />
                  <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="hsl(152 68% 46%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Budget Usage */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Category Budget Usage</h3>
            <div className="space-y-3">
              {categoryBudgetData.filter(c => c.budget > 0).map(c => {
                const pct = Math.min((c.spent / c.budget) * 100, 100);
                const over = c.spent > c.budget;
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className={`font-medium ${over ? 'text-destructive' : 'text-foreground'}`}>
                        {formatAmount(c.spent)} / {formatAmount(c.budget)}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${over ? 'gradient-danger' : pct >= 80 ? 'gradient-accent' : 'gradient-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spending Distribution */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Spending Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'modes' && (
        <>
          {/* Payment Mode Pie */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payment Mode Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 14% 16%)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Mode Bars */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Spend by Mode</h3>
            <div className="space-y-3">
              {paymentData.map((item, i) => {
                const pct = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium text-foreground">{formatAmount(item.value)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI-Powered Insights</h3>
          </div>
          {aiInsights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-xl border ${insightTypeStyles[insight.type]}`}
            >
              <div className="flex gap-3">
                <insight.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${insightIconStyles[insight.type]}`} />
                <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
              </div>
            </motion.div>
          ))}
          {aiInsights.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">Add more transactions to unlock AI insights</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Insights;
