import { motion } from 'framer-motion';
import { Edit3, Split, EyeOff, Eye, Trash2 } from 'lucide-react';
import { Transaction } from '@/store/useStore';
import { useUpdateTransaction, useDeleteTransaction } from '@/hooks/useSupabaseData';
import { useState } from 'react';
import { SplitDialog } from './SplitDialog';
import { EditTransactionDialog } from './EditTransactionDialog';

const CATEGORY_COLORS: Record<string, string> = {
  Food: 'bg-orange-500/20 text-orange-400',
  Transport: 'bg-blue-500/20 text-blue-400',
  Shopping: 'bg-pink-500/20 text-pink-400',
  Bills: 'bg-yellow-500/20 text-yellow-400',
  Rent: 'bg-purple-500/20 text-purple-400',
  Entertainment: 'bg-red-500/20 text-red-400',
  Health: 'bg-emerald-500/20 text-emerald-400',
  SIP: 'bg-teal-500/20 text-teal-400',
  Travel: 'bg-cyan-500/20 text-cyan-400',
  Education: 'bg-indigo-500/20 text-indigo-400',
  Other: 'bg-gray-500/20 text-gray-400',
};

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

export const TransactionCard = ({ transaction: t, compact }: { transaction: Transaction; compact?: boolean }) => {
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [showSplit, setShowSplit] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const formatAmount = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card ${compact ? 'p-3' : 'p-4'} ${t.isIgnored ? 'opacity-40' : ''}`}
        onClick={() => !compact && setShowActions(!showActions)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl flex-shrink-0">{CATEGORY_EMOJI[t.category] || '💰'}</div>
            <div className="min-w-0">
              <p className="font-semibold text-[15px] text-foreground truncate">{t.merchant}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[t.category]}`}>
                  {t.category}
                </span>
                <span className="text-[11px] text-muted-foreground">{t.paymentMode}</span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-[16px] text-foreground">{formatAmount(t.amount)}</p>
            {t.isSplit && (
              <p className="text-[11px] text-primary font-medium">Your share: {formatAmount(t.userShare)}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">{dateStr}</p>
          </div>
        </div>

        {showActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50"
          >
            <button onClick={(e) => { e.stopPropagation(); setShowEdit(true); }} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg bg-secondary/50 transition-colors">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowSplit(true); }} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary px-3 py-1.5 rounded-lg bg-secondary/50 transition-colors">
              <Split className="w-3.5 h-3.5" /> Split
            </button>
            <button onClick={(e) => { e.stopPropagation(); updateTransaction.mutate({ id: t.id, updates: { isIgnored: !t.isIgnored } }); }} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-warning px-3 py-1.5 rounded-lg bg-secondary/50 transition-colors">
              {t.isIgnored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {t.isIgnored ? 'Show' : 'Ignore'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteTransaction.mutate(t.id); }} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-destructive px-3 py-1.5 rounded-lg bg-secondary/50 transition-colors ml-auto">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </motion.div>

      {showSplit && <SplitDialog transaction={t} onClose={() => setShowSplit(false)} />}
      {showEdit && <EditTransactionDialog transaction={t} onClose={() => setShowEdit(false)} />}
    </>
  );
};
