import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useAddGroupExpense } from '@/hooks/useGroups';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { SplitDialog } from '@/components/SplitDialog';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const PAYMENT_MODES = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];
const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

const AddExpense = () => {
  const navigate = useNavigate();
  const addMutation = useAddTransaction();
  const addGroupExpenseMutation = useAddGroupExpense();
  const [showSplit, setShowSplit] = useState(false);
  const [form, setForm] = useState({
    name: '',
    amount: '',
    category: 'Food',
    payment_method: 'UPI',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = () => {
    if (!form.name || !form.amount) { toast.error('Please fill name and amount'); return; }
    addMutation.mutate({
      name: form.name,
      amount: Number(form.amount),
      category: form.category,
      payment_method: form.payment_method,
      date: form.date,
    }, {
      onSuccess: () => {
        toast.success('Expense added!');
        navigate('/transactions');
      },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const handleSplitConfirm = (splits: { name: string; amount: number }[], groupId?: string) => {
    // Add the main transaction
    addMutation.mutate({
      name: form.name,
      amount: Number(form.amount),
      category: form.category,
      payment_method: form.payment_method,
      date: form.date,
    });

    // If group selected, add as group expense too
    if (groupId) {
      addGroupExpenseMutation.mutate({
        group_id: groupId,
        description: form.name,
        amount: Number(form.amount),
        paid_by: 'You',
        split_among: splits.map(s => ({ name: s.name, share: s.amount })),
        date: form.date,
      });
    }

    toast.success('Expense split added!');
    setShowSplit(false);
    navigate('/transactions');
  };

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 56px)' }}>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-foreground">Add Expense</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Swiggy" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Amount (₹)</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full bg-secondary rounded-lg px-3 py-2 text-lg font-bold text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border focus:border-primary" />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setForm({ ...form, category: c })} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${form.category === c ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Payment Mode</label>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_MODES.map(m => (
              <button key={m} onClick={() => setForm({ ...form, payment_method: m })} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${form.payment_method === m ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Split Expense Button */}
        {Number(form.amount) > 0 && (
          <button onClick={() => setShowSplit(true)}
            className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold">
            Split Expense
          </button>
        )}

        <button onClick={handleSubmit} disabled={addMutation.isPending}
          className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-50">
          {addMutation.isPending ? 'Adding...' : 'Add Expense'}
        </button>
      </motion.div>

      {showSplit && (
        <SplitDialog
          amount={Number(form.amount)}
          onClose={() => setShowSplit(false)}
          onConfirm={handleSplitConfirm}
        />
      )}
    </div>
  );
};

export default AddExpense;
