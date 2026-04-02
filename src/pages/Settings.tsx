import { useState } from 'react';
import { ArrowLeft, MessageSquare, Brain, Camera, Bell, Shield, Link2, Lock, FileDown, Wallet, ChevronRight } from 'lucide-react';
import { useStore, Category } from '@/store/useStore';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];

const Settings = () => {
  const navigate = useNavigate();
  const { budget, setBudget, settings, updateSettings } = useStore();
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [editBudget, setEditBudget] = useState(budget);

  const saveBudget = () => { setBudget(editBudget); setShowBudgetEditor(false); };

  const aiFeatures = [
    { key: 'smsIntelligence' as const, icon: MessageSquare, label: 'SMS Intelligence', desc: 'Auto-read transactional SMS', color: 'text-primary' },
    { key: 'aiCategorisation' as const, icon: Brain, label: 'AI Categorisation', desc: 'Learn from corrections', color: 'text-accent' },
    { key: 'ocrReceiptScan' as const, icon: Camera, label: 'OCR Receipt Scan', desc: 'Camera bill extraction', color: 'text-info' },
    { key: 'budgetAlerts' as const, icon: Bell, label: 'Budget Alerts', desc: 'Alert at 80% & 100%', color: 'text-destructive' },
    { key: 'duplicateDetection' as const, icon: Shield, label: 'Duplicate Detection', desc: 'Prevent double-entries', color: 'text-primary' },
  ];

  const accountItems = [
    { icon: Link2, label: 'Linked Accounts', desc: 'HDFC, ICICI connected', action: () => {} },
    { icon: Lock, label: 'Privacy & Security', desc: 'Biometric · E2E Encrypted', action: () => {} },
    { icon: FileDown, label: 'Export Data', desc: 'CSV · PDF · Excel', action: () => {} },
    { icon: Wallet, label: 'Manage Budgets', desc: 'Set monthly limits', action: () => setShowBudgetEditor(true) },
  ];

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-secondary text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">AI Features</p>
      <div className="space-y-1 mb-6">
        {aiFeatures.map((f) => (
          <div key={f.key} className="flex items-center justify-between py-3 px-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center ${f.color}`}>
                <f.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
            </div>
            <Switch checked={settings[f.key]} onCheckedChange={(checked) => updateSettings({ [f.key]: checked })} />
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">Account</p>
      <div className="space-y-1 mb-6">
        {accountItems.map((item) => (
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center justify-between py-3 px-4 bg-card rounded-xl border border-border text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                <item.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-8">FinClarity v1.0 · Privacy First · E2E Encrypted</p>

      {showBudgetEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={() => setShowBudgetEditor(false)}>
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Manage Budgets</h3>
              <button onClick={() => setShowBudgetEditor(false)} className="text-muted-foreground text-sm">Done</button>
            </div>

            <div className="mb-5">
              <label className="text-xs text-muted-foreground mb-1.5 block">Overall Monthly Budget</label>
              <input type="number" value={editBudget.overall} onChange={(e) => setEditBudget({ ...editBudget, overall: Number(e.target.value) })}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none border border-border focus:border-primary" />
            </div>

            <p className="text-xs text-muted-foreground mb-3">Category Budgets</p>
            <div className="space-y-3 mb-6">
              {CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-28">{cat}</span>
                  <input type="number" value={editBudget.categories[cat] || ''}
                    onChange={(e) => setEditBudget({ ...editBudget, categories: { ...editBudget.categories, [cat]: Number(e.target.value) || 0 } })}
                    placeholder="₹0"
                    className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
                </div>
              ))}
            </div>

            <button onClick={saveBudget} className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl">Save Budgets</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Settings;
