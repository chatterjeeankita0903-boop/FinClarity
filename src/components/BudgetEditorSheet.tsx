import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useBudget, useUpsertBudget } from '@/hooks/useBudgets';
import { getCurrentMonth } from '@/lib/dateUtils';

const ALL_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];

interface BudgetEditorSheetProps {
  open: boolean;
  onClose: () => void;
}

export const BudgetEditorSheet = ({ open, onClose }: BudgetEditorSheetProps) => {
  const currentMonth = getCurrentMonth();
  const { data: budgetData } = useBudget(currentMonth);
  const upsertMutation = useUpsertBudget();

  const [overall, setOverall] = useState(0);
  const [categories, setCategories] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      setOverall(budgetData?.overall_budget ?? 0);
      setCategories((budgetData?.category_budgets as Record<string, number>) ?? {});
    }
  }, [open, budgetData]);

  const handleSave = () => {
    upsertMutation.mutate({
      month: currentMonth,
      overall_budget: overall,
      category_budgets: categories,
    }, { onSuccess: onClose });
  };

  if (!open) return null;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Manage Budgets</h3>
          <button onClick={handleSave} className="text-sm font-semibold text-primary">Save</button>
        </div>

        <div className="sheet-body px-6">
          <div className="mb-5">
            <label className="text-xs text-muted-foreground mb-1.5 block">Overall Monthly Budget</label>
            <input type="number" inputMode="decimal" value={overall || ''} onChange={(e) => setOverall(Math.max(0, Number(e.target.value) || 0))}
              placeholder="₹0" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none border border-border focus:border-primary" />
          </div>

          <p className="text-xs text-muted-foreground mb-3">Category Budgets</p>
          <div className="space-y-3">
            {ALL_CATEGORIES.map(cat => (
              <div key={cat} className="grid grid-cols-[minmax(0,96px)_1fr] items-center gap-3">
                <span className="text-sm text-foreground truncate">{cat}</span>
                <input type="number" inputMode="decimal" value={categories[cat] || ''}
                  onChange={(e) => setCategories(prev => ({ ...prev, [cat]: Math.max(0, Number(e.target.value) || 0) }))}
                  placeholder="₹0" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              </div>
            ))}
          </div>
        </div>

        <div className="sheet-footer">
          <button onClick={handleSave} disabled={upsertMutation.isPending}
            className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50">
            {upsertMutation.isPending ? 'Saving...' : 'Set Budget'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
