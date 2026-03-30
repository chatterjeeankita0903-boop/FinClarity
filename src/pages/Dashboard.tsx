import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, Wallet } from 'lucide-react';
import { useTotalSpend, useCategoryBreakdown, usePaymentModeBreakdown, useActiveTransactions } from '@/store/useStore';
import { BudgetBar } from '@/components/BudgetBar';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4', '#64748b'];

const Dashboard = () => {
  const totalSpend = useTotalSpend('2026-03');
  const categoryData = useCategoryBreakdown('2026-03');
  const paymentData = usePaymentModeBreakdown('2026-03');
  const txns = useActiveTransactions();
  const txnCount = txns.filter(t => t.date.startsWith('2026-03')).length;

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
          <p className="text-sm text-muted-foreground">March 2026</p>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>

      {/* Total Spend Card */}
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-5 glow">
        <p className="text-sm text-muted-foreground mb-1">Total Spend</p>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-gradient">{formatAmount(totalSpend)}</h2>
          <div className="flex items-center gap-1 text-primary text-sm font-medium">
            <ArrowUpRight className="w-4 h-4" />
            {txnCount} txns
          </div>
        </div>
      </motion.div>

      {/* Budget */}
      <BudgetBar />

      {/* Category Breakdown */}
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

      {/* Payment Mode */}
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
    </div>
  );
};

export default Dashboard;
