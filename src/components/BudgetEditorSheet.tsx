import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Category, Budget, ALL_CATEGORIES, normalizeBudget, useStore } from '@/store/useStore';

interface BudgetEditorSheetProps {
  open: boolean;
  onClose: () => void;
}

export const BudgetEditorSheet = ({ open, onClose }: BudgetEditorSheetProps) => {
  const budget = useStore((state) => state.budget);
  const settings = useStore((state) => state.settings);
  const setBudget = useStore((state) => state.setBudget);
  const updateSettings = useStore((state) => state.updateSettings);
  const [draft, setDraft] = useState<Budget>(() => normalizeBudget(budget));

  useEffect(() => {
    if (open) {
      setDraft(normalizeBudget(budget));
    }
  }, [open, budget]);

  const hasAnyBudget = useMemo(
    () => draft.overall > 0 || ALL_CATEGORIES.some((category) => (draft.categories[category] ?? 0) > 0),
    [draft],
  );

  const handleSave = () => {
    const nextBudget = normalizeBudget(draft);
    setBudget(nextBudget);

    if (hasAnyBudget && !settings.monthlyBudget) {
      updateSettings({ monthlyBudget: true });
    }

    onClose();
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
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="sheet-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Manage Budgets</h3>
          <button onClick={handleSave} className="text-sm font-semibold text-primary">
            Save
          </button>
        </div>

        <div className="sheet-body px-6">
          <div className="mb-5">
            <label className="text-xs text-muted-foreground mb-1.5 block">Overall Monthly Budget</label>
            <input
              type="number"
              inputMode="decimal"
              value={draft.overall || ''}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setDraft((current) => ({
                  ...current,
                  overall: Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0,
                }));
              }}
              placeholder="₹0"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none border border-border focus:border-primary"
            />
          </div>

          <p className="text-xs text-muted-foreground mb-3">Category Budgets</p>
          <div className="space-y-3">
            {ALL_CATEGORIES.map((category) => (
              <div key={category} className="grid grid-cols-[minmax(0,96px)_1fr] items-center gap-3">
                <span className="text-sm text-foreground truncate">{category}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.categories[category] || ''}
                  onChange={(event) => updateCategoryBudget(category, event.target.value)}
                  placeholder="₹0"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="sheet-footer">
          <button onClick={handleSave} className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl">
            Set Budget
          </button>
        </div>
      </motion.div>
    </div>
  );
};