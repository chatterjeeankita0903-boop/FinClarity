import { useState } from 'react';
import { X } from 'lucide-react';
import { Transaction, Category, PaymentMode, useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];

export const EditTransactionDialog = ({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) => {
  const { updateTransaction } = useStore();
  const [form, setForm] = useState({
    merchant: transaction.merchant,
    amount: transaction.amount,
    category: transaction.category,
    paymentMode: transaction.paymentMode,
    date: transaction.date,
  });

  const handleSave = () => {
    updateTransaction(transaction.id, {
      ...form,
      userShare: transaction.isSplit ? transaction.userShare : form.amount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Edit Transaction</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          <input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="Merchant" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="Amount" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary">
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button onClick={handleSave} className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl mt-4 flex-shrink-0">
          Save Changes
        </button>
      </motion.div>
    </div>
  );
};
