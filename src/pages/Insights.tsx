import { useMemo, useState } from 'react';
import { getCategoryBreakdown, getPaymentModeBreakdown, getActiveTransactions, getTotalSpend, useTransactions, useBudget, useGroups } from '@/hooks/useSupabaseData';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Brain, TrendingUp, TrendingDown, Lightbulb, CreditCard, CalendarDays, Users, Filter, Heart, Info, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentMonth, getRecentMonths, getShortMonthLabel, getMonthLabel, getPreviousMonth } from '@/lib/dateUtils';

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
  const { transactions } = useTransactions();
  const currentMonth = getCurrentMonth();
  const { budget } = useBudget(currentMonth);
  const { groups } = useGroups();
  const [activeTab, setActiveTab] = useState<'overview' | 'modes' | 'ai'>('overview');

  const recentMonths = useMemo(() => getRecentMonths(6), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [compareMonth, setCompareMonth] = useState('');

  const filteredTxns = useMemo(() => {
    let txns = getActiveTransactions(transactions);
    if (selectedGroup) txns = txns.filter(t => t.groupId === selectedGroup);
    if (dateFrom) txns = txns.filter(t => t.date >= dateFrom);
    if (dateTo) txns = txns.filter(t => t.date <= dateTo);
    if (!dateFrom && !dateTo) txns = txns.filter(t => t.date.startsWith(selectedMonth));
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

  const momData = useMemo(() => recentMonths.map(m => ({ month: getShortMonthLabel(m), spend: getTotalSpend(transactions, m) })), [transactions, recentMonths]);

  const prevMonth = getPreviousMonth();
  const momChange = useMemo(() => {
    const curr = getTotalSpend(transactions, selectedMonth);
    const prev = getTotalSpend(transactions, prevMonth);
    if (prev === 0) return null;
    return ((curr - prev) / prev * 100).toFixed(0);
  }, [transactions, selectedMonth, prevMonth]);

  // Comparison data
  const comparisonData = useMemo(() => {
    if (!compareMonth) return null;
    const compTxns = getActiveTransactions(transactions).filter(t => t.date.startsWith(compareMonth));
    const compTotal = compTxns.reduce((s, t) => s + t.userShare, 0);
    const compCatMap: Record<string, number> = {};
    compTxns.forEach(t => { compCatMap[t.category] = (compCatMap[t.category] || 0) + t.userShare; });
    const compCategories = Object.entries(compCatMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return { total: compTotal, txnCount: compTxns.length, categories: compCategories };
  }, [transactions, compareMonth]);

  // Financial Health Score
  const healthScore = useMemo(() => {
    let score = 100;
    const budgetUsage = budget.overall > 0 ? totalSpend / budget.overall : 0;
    if (budgetUsage > 1) score -= 30;
    else if (budgetUsage > 0.8) score -= 15;
    else if (budgetUsage > 0.6) score -= 5;
    const topCat = categoryData[0];
    if (topCat && totalSpend > 0 && topCat.value / totalSpend > 0.5) score -= 10;
    const hasSIP = filteredTxns.some(t => t.category === 'SIP');
    if (hasSIP) score += 5;
    const splitTxns = filteredTxns.filter(t => t.isSplit);
    if (splitTxns.length > 0) score += 5;
    if (filteredTxns.length === 0) score -= 20;
    return Math.max(0, Math.min(100, score));
  }, [totalSpend, budget, categoryData, filteredTxns]);

  const scoreColor = healthScore >= 75 ? 'text-primary' : healthScore >= 50 ? 'text-accent' : 'text-destructive';
  const scoreLabel = healthScore >= 75 ? 'Excellent' : healthScore >= 50 ? 'Good' : 'Needs Attention';

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights: { icon: typeof TrendingUp; text: string; type: 'tip' | 'warning' | 'positive' }[] = [];
    if (categoryData.length > 0) {
      const top = categoryData[0];
      const pct = totalSpend > 0 ? ((top.value / totalSpend) * 100).toFixed(0) : '0';
      insights.push({ icon: TrendingUp, text: `${top.name} is your top spend at ${pct}% (₹${top.value.toLocaleString('en-IN')}). Consider setting a tighter budget.`, type: 'tip' });
    }
    const budgetUsage = budget.overall > 0 ? (totalSpend / budget.overall) * 100 : 0;
    if (budgetUsage > 80) insights.push({ icon: TrendingDown, text: `You've used ${budgetUsage.toFixed(0)}% of your monthly budget. Consider pausing discretionary spending.`, type: 'warning' });
    const sipTxn = filteredTxns.find(t => t.category === 'SIP');
    if (sipTxn) insights.push({ icon: Lightbulb, text: `Great job! Your SIP of ₹${sipTxn.userShare.toLocaleString('en-IN')} is active. Consistency builds wealth.`, type: 'positive' });
    const splitSavings = filteredTxns.filter(t => t.isSplit).reduce((s, t) => s + (t.amount - t.userShare), 0);
    if (splitSavings > 0) insights.push({ icon: Lightbulb, text: `You saved ₹${splitSavings.toLocaleString('en-IN')} by splitting expenses. Keep sharing costs!`, type: 'positive' });
    if (paymentData.length > 0) { const topMode = paymentData[0]; insights.push({ icon: CreditCard, text: `${topMode.name} is your most used payment mode (₹${topMode.value.toLocaleString('en-IN')}).`, type: 'tip' }); }
    if (momChange && Number(momChange) > 20) insights.push({ icon: TrendingDown, text: `Spending is up ${momChange}% vs last month. Review recurring subscriptions.`, type: 'warning' });
    return insights;
  }, [filteredTxns, categoryData, budget, paymentData, momChange, totalSpend]);

  const formatAmount = (n: number) => `₹${n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n}`;

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'modes' as const, label: 'Pay Modes' },
    { key: 'ai' as const, label: 'AI Insights' },
  ];

  const insightTypeStyles = { tip: 'border-info/30 bg-info/5', warning: 'border-accent/30 bg-accent/5', positive: 'border-primary/30 bg-primary/5' };
  const insightIconStyles = { tip: 'text-info', warning: 'text-accent', positive: 'text-primary' };

  const hasDateFilter = !!(dateFrom || dateTo);

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Insights</h1>
        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Month Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {recentMonths.map(m => (
          <button key={m} onClick={() => { setSelectedMonth(m); setDateFrom(''); setDateTo(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${selectedMonth === m && !hasDateFilter ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >{getShortMonthLabel(m)}</button>
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
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${activeTab === tab.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >{tab.label}</button>
        ))}
      </div>

      {/* Highlighted summary stats */}
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

      <p className="text-xs text-muted-foreground">
        {hasDateFilter ? `${dateFrom || '...'} → ${dateTo || '...'}` : getMonthLabel(selectedMonth)}
        {selectedGroup ? ` · ${groups.find(g => g.id === selectedGroup)?.name}` : ''}
      </p>

      {/* Compare With Month */}
      <div className="glass-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <ArrowLeftRight className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">Compare With</h3>
        </div>
        <select value={compareMonth} onChange={(e) => setCompareMonth(e.target.value)}
          className="w-full bg-secondary rounded-lg px-3 py-2 text-xs text-foreground outline-none border border-border focus:border-primary">
          <option value="">Select a month to compare</option>
          {recentMonths.filter(m => m !== selectedMonth).map(m => (
            <option key={m} value={m}>{getShortMonthLabel(m)}</option>
          ))}
        </select>

        {comparisonData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-[9px] text-muted-foreground">{getShortMonthLabel(selectedMonth)}</p>
                <p className="text-sm font-bold text-foreground">{formatAmount(totalSpend)}</p>
                <p className="text-[9px] text-muted-foreground">{filteredTxns.length} txns</p>
              </div>
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-[9px] text-muted-foreground">{getShortMonthLabel(compareMonth)}</p>
                <p className="text-sm font-bold text-foreground">{formatAmount(comparisonData.total)}</p>
                <p className="text-[9px] text-muted-foreground">{comparisonData.txnCount} txns</p>
              </div>
            </div>
            {/* Category comparison */}
            <div className="space-y-1">
              {categoryData.map(cat => {
                const compCat = comparisonData.categories.find(c => c.name === cat.name);
                const diff = compCat ? cat.value - compCat.value : cat.value;
                return (
                  <div key={cat.name} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{formatAmount(cat.value)}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="text-foreground">{compCat ? formatAmount(compCat.value) : '—'}</span>
                      <span className={`font-medium ${diff > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {diff > 0 ? '+' : ''}{formatAmount(Math.abs(diff))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Financial Health Score */}
      <div className="glass-card p-4 relative">
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
                strokeDasharray={`${(healthScore / 100) * 175.9} 175.9`}
                strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-extrabold ${scoreColor}`}>{healthScore}</span>
          </div>
          <div>
            <p className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</p>
            <p className="text-[11px] text-muted-foreground">Based on your credit history, repayments, bureau reports etc.</p>
          </div>
        </div>
        {showScoreInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 p-3 bg-secondary rounded-lg text-[11px] text-muted-foreground space-y-1">
            <p>• <strong>Credit history & repayments</strong>: Timely repayments improve score</p>
            <p>• <strong>Bureau reports</strong>: Based on credit bureau data analysis</p>
            <p>• <strong>Budget adherence</strong>: Under 60% = +0, 60-80% = -5, 80-100% = -15, Over = -30</p>
            <p>• <strong>Category balance</strong>: Top category &gt;50% of spend = -10</p>
            <p>• <strong>SIP/Investments</strong>: Active SIP = +5</p>
            <p>• <strong>Cost sharing</strong>: Using splits = +5</p>
          </motion.div>
        )}
      </div>

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
                  <Tooltip formatter={(v: number) => formatAmount(v)} {...chartTooltipProps} />
                  <Line type="monotone" dataKey="spend" stroke="hsl(152 68% 46%)" strokeWidth={2.5} dot={{ fill: 'hsl(152 68% 46%)', r: 4 }} activeDot={{ r: 6, stroke: 'hsl(152 68% 46%)', strokeWidth: 2 }} />
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
                  <Tooltip formatter={(v: number) => formatAmount(v)} {...chartTooltipProps} />
                  <Bar dataKey="value" fill="hsl(152 68% 46%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending Distribution - interactive */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Spending Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value" stroke="none">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${formatAmount(v as number)}`, name]} {...chartTooltipProps} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'modes' && (
        <>
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payment Mode Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value" stroke="none">
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${formatAmount(v as number)}`, name]} {...chartTooltipProps} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

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
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-xl border ${insightTypeStyles[insight.type]}`}
            >
              <div className="flex gap-3">
                <insight.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${insightIconStyles[insight.type]}`} />
                <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
              </div>
            </motion.div>
          ))}
          {aiInsights.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No insights for this period</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Insights;
