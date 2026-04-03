import { useState } from 'react';
import { X } from 'lucide-react';
import { Transaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { motion } from 'framer-motion';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const PAYMENT_MODES = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];

export const EditTransactionDialog = ({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) => {
  const updateMutation = useUpdateTransaction();
  const [form, setForm] = useState({
    name: transaction.name,
    amount: Number(transaction.amount),
    category: transaction.category,
    payment_method: transaction.payment_method,
    date: transaction.date,
  });

  const handleSave = () => {
    updateMutation.mutate({ id: transaction.id, ...form });
    onClose();
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Edit Transaction</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="sheet-body px-6 space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="Amount" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary">
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="sheet-footer">
          <button onClick={handleSave} className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
};
