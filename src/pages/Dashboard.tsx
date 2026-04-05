import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions, Transaction } from '@/services/transactions';
import { getBudgets, Budget } from '@/services/budgets';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CHART_COLORS = ['hsl(152,68%,46%)', 'hsl(38,92%,55%)', 'hsl(210,80%,55%)', 'hsl(0,72%,55%)', 'hsl(280,60%,55%)', 'hsl(180,60%,45%)', 'hsl(320,60%,55%)', 'hsl(60,70%,50%)'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    if (!user) return;
    getTransactions(user.id).then(setTransactions);
    getBudgets(user.id).then(setBudgets);
  }, [user]);

  const monthTxns = useMemo(() => transactions.filter(t => t.date.startsWith(currentMonth)), [transactions, currentMonth]);

  const income = useMemo(() => monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const expenses = useMemo(() => monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTxns]);
  const balance = income - expenses;
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTxns]);

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);

  const fmt = (n: number) => '₹' + Math.abs(n).toLocaleString('en-IN');

  return (
    <div className="px-4 pt-6 safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-xl font-bold text-foreground">{user?.fullName || 'User'} 👋</h1>
        </div>
        <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
          {format(new Date(), 'MMM yyyy')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <p className="text-lg font-bold text-primary">{fmt(income)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
          <p className="text-lg font-bold text-destructive">{fmt(expenses)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Balance</span>
          </div>
          <p className={`text-lg font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>{balance >= 0 ? '+' : '-'}{fmt(balance)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-foreground" />
            <span className="text-xs text-muted-foreground">Savings Rate</span>
          </div>
          <p className="text-lg font-bold text-foreground">{savingsRate}%</p>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Monthly Budget</h2>
          <button onClick={() => navigate('/budgets')} className="text-xs text-primary flex items-center gap-0.5">
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {totalBudget > 0 ? (
          <>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Spent {fmt(expenses)}</span>
              <span>of {fmt(totalBudget)}</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${expenses / totalBudget > 0.9 ? 'bg-destructive' : 'gradient-primary'}`}
                style={{ width: `${Math.min(100, (expenses / totalBudget) * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No budgets set — <button onClick={() => navigate('/budgets')} className="text-primary">create your first budget!</button></p>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="glass-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Spending by Category</h2>
        {categoryBreakdown.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2}>
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => fmt(value)}
                    contentStyle={{ background: 'hsl(220,18%,10%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryBreakdown.slice(0, 5).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="text-foreground font-medium">{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No expenses yet — add your first transaction!</p>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Transactions</h2>
          <button onClick={() => navigate('/transactions')} className="text-xs text-primary flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {monthTxns.length > 0 ? (
          <div className="space-y-3">
            {monthTxns.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.category} · {format(new Date(t.date), 'dd MMM')}</p>
                </div>
                <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No transactions yet — add your first one!</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
