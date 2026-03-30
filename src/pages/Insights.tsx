import { useMemo } from 'react';
import { getCategoryBreakdown, getPaymentModeBreakdown, getActiveTransactions, useStore } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#06b6d4'];

const Insights = () => {
  const transactions = useStore(s => s.transactions);
  const budget = useStore(s => s.budget);
  const categoryData = useMemo(() => getCategoryBreakdown(transactions, '2026-03'), [transactions]);
  const paymentData = useMemo(() => getPaymentModeBreakdown(transactions, '2026-03'), [transactions]);
  const txns = useMemo(() => getActiveTransactions(transactions), [transactions]);

  const topMerchants = useMemo(() => {
    const map: Record<string, number> = {};
    txns.filter(t => t.date.startsWith('2026-03')).forEach(t => { map[t.merchant] = (map[t.merchant] || 0) + t.userShare; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [txns]);

  const categoryBudgetData = useMemo(() => categoryData.map(c => ({
    name: c.name,
    spent: c.value,
    budget: budget.categories[c.name as keyof typeof budget.categories] || 0,
  })), [categoryData, budget]);

  const formatAmount = (n: number) => `₹${n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n}`;

  return (
    <div className="px-4 pt-14 safe-bottom space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Insights</h1>

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
    </div>
  );
};

export default Insights;
