import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions, addTransaction, deleteTransaction, updateTransaction, Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/services/transactions';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, X, Search, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'' | 'income' | 'expense'>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');

  const reload = () => { if (user) getTransactions(user.id).then(setTransactions); };
  useEffect(() => { reload(); }, [user]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const resetForm = () => {
    setTitle(''); setAmount(''); setType('expense'); setCategory(''); setDate(format(new Date(), 'yyyy-MM-dd')); setNote('');
    setEditingId(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !amount || !category) return;
    if (editingId) {
      await updateTransaction(user.id, editingId, { title, amount: parseFloat(amount), type, category, date, note });
      toast.success('Transaction updated');
    } else {
      await addTransaction(user.id, { title, amount: parseFloat(amount), type, category, date, note });
      toast.success('Transaction added');
    }
    resetForm();
    reload();
  };

  const handleEdit = (t: Transaction) => {
    setTitle(t.title); setAmount(String(t.amount)); setType(t.type); setCategory(t.category); setDate(t.date); setNote(t.note);
    setEditingId(t.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteTransaction(user.id, id);
    toast.success('Transaction deleted');
    reload();
  };

  const filtered = useMemo(() => {
    let result = transactions.filter(t => {
      if (filterType && t.type !== filterType) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    result.sort((a, b) => sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
    return result;
  }, [transactions, search, filterType, filterCategory, sortOrder]);

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="px-4 pt-6 safe-bottom">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">Transactions</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')} className="p-2 rounded-lg bg-secondary text-muted-foreground">
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground p-2 rounded-lg">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..."
          className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-4">
        {(['', 'income', 'expense'] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterType === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
            {t === '' ? 'All' : t === 'income' ? '↑ Income' : '↓ Expense'}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No transactions yet — add your first one!</p>
          <button onClick={() => setShowForm(true)} className="mt-3 gradient-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl">
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <div key={t.id} className="glass-card p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.category} · {format(new Date(t.date), 'dd MMM yyyy')}</p>
                {t.note && <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{t.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
                <button onClick={() => handleEdit(t)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="sheet-panel">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
              <button onClick={resetForm} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="sheet-body p-4 space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setType('expense'); setCategory(''); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${type === 'expense' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border text-muted-foreground'}`}>
                  Expense
                </button>
                <button type="button" onClick={() => { setType('income'); setCategory(''); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${type === 'income' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                  Income
                </button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Grocery shopping"
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Amount (₹)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01" placeholder="0.00"
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Any notes..."
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              </div>
            </form>
            <div className="sheet-footer">
              <button onClick={handleSubmit} disabled={!title || !amount || !category}
                className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50">
                {editingId ? 'Update Transaction' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
