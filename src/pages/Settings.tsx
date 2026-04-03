import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BudgetEditorSheet } from '@/components/BudgetEditorSheet';
import { useState } from 'react';
import { Wallet, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out');
  };

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-secondary text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">Account</p>
      <div className="space-y-1 mb-6">
        <div className="py-3 px-4 bg-card rounded-xl border border-border">
          <p className="text-sm font-semibold text-foreground">Email</p>
          <p className="text-[11px] text-muted-foreground">{user?.email}</p>
        </div>

        <button onClick={() => setShowBudgetEditor(true)}
          className="w-full flex items-center justify-between py-3 px-4 bg-card rounded-xl border border-border text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
              <Wallet className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Manage Budgets</p>
              <p className="text-[11px] text-muted-foreground">Set monthly limits</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 py-3 px-4 bg-card rounded-xl border border-border text-left">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
            <LogOut className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">Sign Out</p>
            <p className="text-[11px] text-muted-foreground">Log out of your account</p>
          </div>
        </button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-8">FinClarity v2.0 · Supabase Powered</p>

      <BudgetEditorSheet open={showBudgetEditor} onClose={() => setShowBudgetEditor(false)} />
    </div>
  );
};

export default Settings;
