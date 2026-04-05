import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getGoals, addGoal, updateGoal, deleteGoal, Goal } from '@/services/goals';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, X, Target, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';

const Goals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showAddFunds, setShowAddFunds] = useState<string | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');

  const reload = () => { if (user) getGoals(user.id).then(setGoals); };
  useEffect(() => { reload(); }, [user]);

  const resetForm = () => { setTitle(''); setTargetAmount(''); setSavedAmount(''); setDeadline(''); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !targetAmount) return;
    if (editingId) {
      await updateGoal(user.id, editingId, { title, target_amount: parseFloat(targetAmount), deadline });
      toast.success('Goal updated');
    } else {
      await addGoal(user.id, { title, target_amount: parseFloat(targetAmount), deadline });
      toast.success('Goal created');
    }
    resetForm(); reload();
  };

  const handleEdit = (g: Goal) => {
    setTitle(g.title); setTargetAmount(String(g.target_amount)); setDeadline(g.deadline); setEditingId(g.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteGoal(user.id, id);
    toast.success('Goal removed'); reload();
  };

  const handleAddFunds = async (goalId: string) => {
    if (!user || !addFundsAmount) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    await updateGoal(user.id, goalId, { saved_amount: goal.saved_amount + parseFloat(addFundsAmount) });
    toast.success(`₹${parseFloat(addFundsAmount).toLocaleString('en-IN')} added to ${goal.title}`);
    setShowAddFunds(null); setAddFundsAmount(''); reload();
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="px-4 pt-6 safe-bottom">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">Goals</h1>
        <button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground p-2 rounded-lg">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No goals yet — set a savings goal!</p>
          <button onClick={() => setShowForm(true)} className="mt-3 gradient-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl">
            Create Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const pct = Math.min(100, (g.saved_amount / g.target_amount) * 100);
            const isComplete = g.saved_amount >= g.target_amount;
            return (
              <div key={g.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isComplete ? <PiggyBank className="w-4 h-4 text-primary" /> : <Target className="w-4 h-4 text-accent" />}
                    <span className="text-sm font-medium text-foreground">{g.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(g)} className="p-1 text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(g.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{fmt(g.saved_amount)} saved</span>
                  <span>of {fmt(g.target_amount)}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-primary' : 'gradient-accent'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  {g.deadline && <p className="text-xs text-muted-foreground">Deadline: {format(new Date(g.deadline), 'dd MMM yyyy')}</p>}
                  {!isComplete && (
                    showAddFunds === g.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" value={addFundsAmount} onChange={e => setAddFundsAmount(e.target.value)} placeholder="₹"
                          className="w-20 bg-secondary rounded-lg px-2 py-1 text-xs text-foreground border border-border outline-none focus:border-primary" />
                        <button onClick={() => handleAddFunds(g.id)} className="text-xs text-primary font-medium">Add</button>
                        <button onClick={() => { setShowAddFunds(null); setAddFundsAmount(''); }} className="text-xs text-muted-foreground">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddFunds(g.id)} className="text-xs text-primary font-medium">+ Add Funds</button>
                    )
                  )}
                  {isComplete && <span className="text-xs text-primary font-medium">✅ Goal reached!</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="sheet-panel">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{editingId ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={resetForm} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="sheet-body p-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Goal Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Emergency Fund"
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Target Amount (₹)</label>
                <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required min="1" placeholder="100000"
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Deadline (optional)</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none border border-border focus:border-primary" />
              </div>
            </form>
            <div className="sheet-footer">
              <button onClick={handleSubmit} disabled={!title || !targetAmount}
                className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50">
                {editingId ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
