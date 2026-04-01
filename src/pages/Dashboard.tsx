import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Wallet, Settings, ChevronRight, Heart, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore, getTotalSpend, getCategoryBreakdown, getPaymentModeBreakdown, getActiveTransactions } from '@/store/useStore';
import { BudgetBar } from '@/components/BudgetBar';
import { NotificationBell } from '@/components/NotificationBell';
import { TransactionCard } from '@/components/TransactionCard';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getCurrentMonth, getCurrentMonthLabel, getPreviousMonth } from '@/lib/dateUtils';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4', '#64748b'];

const Dashboard = () => {
  const navigate = useNavigate();
  const transactions = useStore(s => s.transactions);
  const budget = useStore(s => s.budget);
  const settings = useStore(s => s.settings);
  const currentMonth = getCurrentMonth();
  const prevMonth = getPreviousMonth();
  const totalSpend = useMemo(() => getTotalSpend(transactions, currentMonth), [transactions, currentMonth]);
  const totalSpendAllTime = useMemo(() => getTotalSpend(transactions), [transactions]);
  const categoryData = useMemo(() => getCategoryBreakdown(transactions, currentMonth), [transactions, currentMonth]);
  const paymentData = useMemo(() => getPaymentModeBreakdown(transactions, currentMonth), [transactions, currentMonth]);
  const txns = useMemo(() => getActiveTransactions(transactions), [transactions]);
  const txnCount = useMemo(() => txns.filter(t => t.date.startsWith(currentMonth)).length, [txns, currentMonth]);
  const recentTxns = useMemo(() => txns.slice(0, 5), [txns]);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Financial Health Score
  const healthScore = useMemo(() => {
    let score = 100;
    const budgetUsage = budget.overall > 0 ? totalSpend / budget.overall : 0;
    if (budgetUsage > 1) score -= 30;
    else if (budgetUsage > 0.8) score -= 15;
    else if (budgetUsage > 0.6) score -= 5;

    const topCat = categoryData[0];
    if (topCat && totalSpend > 0 && topCat.value / totalSpend > 0.5) score -= 10;

    const hasSIP = txns.some(t => t.category === 'SIP' && t.date.startsWith(currentMonth));
    if (hasSIP) score += 5;

    const splitTxns = txns.filter(t => t.isSplit && t.date.startsWith(currentMonth));
    if (splitTxns.length > 0) score += 5;

    if (txnCount === 0) score -= 20;

    return Math.max(0, Math.min(100, score));
  }, [totalSpend, budget, categoryData, txns, txnCount, currentMonth]);

  const scoreColor = healthScore >= 75 ? 'text-primary' : healthScore >= 50 ? 'text-accent' : 'text-destructive';
  const scoreLabel = healthScore >= 75 ? 'Excellent' : healthScore >= 50 ? 'Good' : 'Needs Attention';

  const formatAmount = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  return (
    <div className="px-4 pt-14 safe-bottom space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getCurrentMonthLabel()}</p>
          <h1 className="text-2xl font-bold text-foreground">FinClarity</h1>
        </div>
        <div className="flex items-center gap-2">
          {settings.budgetAlerts && <NotificationBell />}
          <button onClick={() => navigate('/settings')} className="p-2 rounded-xl bg-secondary text-muted-foreground">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Total Spend Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-4 glow">
          <p className="text-xs text-muted-foreground mb-1">This Month</p>
          <h2 className="text-2xl font-extrabold text-gradient">{formatAmount(totalSpend)}</h2>
          <div className="flex items-center gap-1 text-primary text-xs font-medium mt-1">
            <ArrowUpRight className="w-3 h-3" />
            {txnCount} txns
          </div>
        </motion.div>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Spend</p>
          <h2 className="text-2xl font-extrabold text-foreground">{formatAmount(totalSpendAllTime)}</h2>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </motion.div>
      </div>

      {/* Financial Health Score */}
      <div className="glass-card p-4 relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Financial Health</h3>
          </div>
          <button onClick={() => setShowScoreInfo(!showScoreInfo)} className="text-muted-foreground">
            <Info className="w-4 h-4" />
          </button>
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
            <p className="text-[11px] text-muted-foreground">Based on budget, savings & spending patterns</p>
          </div>
        </div>
        {showScoreInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 p-3 bg-secondary rounded-lg text-[11px] text-muted-foreground space-y-1">
            <p>• <strong>Budget adherence</strong>: Under 60% = +0, 60-80% = -5, 80-100% = -15, Over = -30</p>
            <p>• <strong>Category balance</strong>: Top category &gt;50% of spend = -10</p>
            <p>• <strong>SIP/Investments</strong>: Active SIP this month = +5</p>
            <p>• <strong>Cost sharing</strong>: Using splits = +5</p>
            <p>• <strong>Active tracking</strong>: No transactions = -20</p>
          </motion.div>
        )}
      </div>

      {settings.budgetAlerts && <BudgetBar />}

      {/* By Category - shown when AI categorisation is on */}
      {settings.aiCategorisation && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Category</h3>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={25} outerRadius={48} paddingAngle={3} dataKey="value" stroke="none">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 max-h-28 overflow-y-auto">
              {categoryData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground text-xs">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground text-xs">{formatAmount(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* By Payment Mode */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">By Payment Mode</h3>
        <div className="space-y-2">
          {paymentData.map((item) => {
            const pct = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
            return (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium text-foreground">{formatAmount(item.value)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
          <button onClick={() => navigate('/transactions')} className="flex items-center gap-1 text-xs text-primary font-medium">
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {recentTxns.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No transactions yet</p>
          ) : (
            recentTxns.map(t => <TransactionCard key={t.id} transaction={t} compact />)
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
