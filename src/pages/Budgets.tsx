import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBudgets, addBudget, updateBudget, deleteBudget, Budget } from '@/services/budgets';
import { getTransactions, Transaction, EXPENSE_CATEGORIES } from '@/services/transactions';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';

const Budgets = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  const currentMonth = format(new Date(), 'yyyy-MM');

  const reload = () => {
    if (!user) return;
    getBudgets(user.id).then(setBudgets);
    getTransactions(user.id).then(setTransactions);
  };
  useEffect(() => { reload(); }, [user]);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [transactions, currentMonth]);

  const resetForm = () => { setCategory(''); setAmount(''); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category || !amount) return;
    if (editingId) {
      await updateBudget(user.id, editingId, { category, amount: parseFloat(amount) });
      toast.success('Budget updated');
    } else {
      await addBudget(user.id, { category, amount: parseFloat(amount), period: 'monthly' });
      toast.success('Budget created');
    }
    resetForm();
    reload();
  };

  const handleEdit = (b: Budget) => {
    setCategory(b.category); setAmount(String(b.amount)); setEditingId(b.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteBudget(user.id, id);
    toast.success('Budget removed');
    reload();
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
  const usedCategories = budgets.map(b => b.category);

  return (
    <div className="px-4 pt-6 safe-bottom">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">Budgets</h1>
        <button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground p-2 rounded-lg">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{format(new Date(), 'MMMM yyyy')} — Monthly budget tracking</p>

      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No budgets set — create your first budget!</p>
          <button onClick={() => setShowForm(true)} className="mt-3 gradient-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl">
            Create Budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const spent = spentByCategory[b.category] || 0;
            const pct = Math.min(100, (spent / b.amount) * 100);
            const isOver = spent > b.amount;
            return (
              <div key={b.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{b.category}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(b)} className="p-1 text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{fmt(spent)} spent</span>
                  <span>of {fmt(b.amount)}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : 'gradient-primary'}`} style={{ width: `${pct}%` }} />
                </div>
                {isOver && <p className="text-xs text-destructive mt-1">Over budget by {fmt(spent - b.amount)}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="sheet-panel">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{editingId ? 'Edit Budget' : 'New Budget'}</h2>
              <button onClick={resetForm} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="sheet-body p-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      disabled={!editingId && usedCategories.includes(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-30 ${category === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Monthly Limit (₹)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" placeholder="e.g. 5000"
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              </div>
            </form>
            <div className="sheet-footer">
              <button onClick={handleSubmit} disabled={!category || !amount}
                className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50">
                {editingId ? 'Update Budget' : 'Create Budget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
