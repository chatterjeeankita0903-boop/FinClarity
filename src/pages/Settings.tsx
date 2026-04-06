import { useState } from 'react';
import { ArrowLeft, MessageSquare, Brain, Camera, Bell, Shield, Link2, Lock, FileDown, Wallet, ChevronRight, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { BudgetEditorSheet } from '@/components/BudgetEditorSheet';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useStore();
  const { signOut, user } = useAuth();
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);

  const aiFeatures = [
    { key: 'smsIntelligence' as const, icon: MessageSquare, label: 'SMS Intelligence', desc: 'Auto-read transactional SMS', color: 'text-primary' },
    { key: 'aiCategorisation' as const, icon: Brain, label: 'AI Categorisation', desc: 'Learn from corrections', color: 'text-accent' },
    { key: 'ocrReceiptScan' as const, icon: Camera, label: 'OCR Receipt Scan', desc: 'Camera bill extraction', color: 'text-info' },
    { key: 'budgetAlerts' as const, icon: Bell, label: 'Budget Alerts', desc: 'Alert at 80% & 100%', color: 'text-destructive' },
    { key: 'duplicateDetection' as const, icon: Shield, label: 'Duplicate Detection', desc: 'Prevent double-entries', color: 'text-primary' },
    { key: 'monthlyBudget' as const, icon: Wallet, label: 'Monthly Budget', desc: 'Enable monthly budget tracking', color: 'text-accent' },
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

      <BudgetEditorSheet open={showBudgetEditor} onClose={() => setShowBudgetEditor(false)} />
    </div>
  );
};

export default Settings;
