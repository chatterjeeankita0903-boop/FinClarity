import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Category, Budget, ALL_CATEGORIES, normalizeBudget, useBudget, useSettings } from '@/hooks/useSupabaseData';
import { getCurrentMonth } from '@/lib/dateUtils';
import { toast } from 'sonner';

interface BudgetEditorSheetProps {
  open: boolean;
  onClose: () => void;
}

export const BudgetEditorSheet = ({ open, onClose }: BudgetEditorSheetProps) => {
  const currentMonth = getCurrentMonth();
  const { budget, setBudget } = useBudget(currentMonth);
  const { settings, updateSettings } = useSettings();
  const [draft, setDraft] = useState<Budget>(() => normalizeBudget(budget));

  useEffect(() => {
    if (open) setDraft(normalizeBudget(budget));
  }, [open, budget]);

  const hasAnyBudget = useMemo(
    () => draft.overall > 0 || ALL_CATEGORIES.some((cat) => (draft.categories[cat] ?? 0) > 0),
    [draft],
  );

  const handleSave = async () => {
    const nextBudget = normalizeBudget(draft);
    try {
      await setBudget(nextBudget);
      if (hasAnyBudget && !settings.monthlyBudget) {
        updateSettings({ monthlyBudget: true });
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save budget');
    }
  };

  const updateCategoryBudget = (category: Category, value: string) => {
    const nextValue = Number(value);
    setDraft((current) => ({
      ...current,
      categories: {
        ...current.categories,
        [category]: Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0,
      },
    }));
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
            <input
              type="number"
              inputMode="decimal"
              value={draft.overall || ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft((c) => ({ ...c, overall: Number.isFinite(v) ? Math.max(0, v) : 0 }));
              }}
              placeholder="₹0"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none border border-border focus:border-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">Category Budgets</p>
          <div className="space-y-3">
            {ALL_CATEGORIES.map((cat) => (
              <div key={cat} className="grid grid-cols-[minmax(0,96px)_1fr] items-center gap-3">
                <span className="text-sm text-foreground truncate">{cat}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.categories[cat] || ''}
                  onChange={(e) => updateCategoryBudget(cat, e.target.value)}
                  placeholder="₹0"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="sheet-footer">
          <button onClick={handleSave} className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl">Set Budget</button>
        </div>
      </motion.div>
    </div>
  );
};
