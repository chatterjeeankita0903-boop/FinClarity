import { useState, useMemo } from 'react';
import { Users, Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useGroups, useAddGroup, useDeleteGroup, useGroupExpenses, useAddGroupExpense, useSettlements, useAddSettlement, Group } from '@/hooks/useGroups';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const GroupDetail = ({ group, onClose }: { group: Group; onClose: () => void }) => {
  const members = (group.members as { name: string }[]) || [];
  const { data: expenses = [] } = useGroupExpenses(group.id);
  const { data: settlements = [] } = useSettlements(group.id);
  const deleteGroupMutation = useDeleteGroup();
  const addExpenseMutation = useAddGroupExpense();
  const addSettlementMutation = useAddSettlement();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expForm, setExpForm] = useState({ description: '', amount: '', paid_by: 'You', date: new Date().toISOString().split('T')[0] });

  // Calculate balances: who owes what (resets on settlement)
  const lastSettlement = settlements.length > 0 ? settlements.sort((a, b) => b.settled_at.localeCompare(a.settled_at))[0] : null;
  const lastSettledAt = lastSettlement?.settled_at || '1970-01-01';

  const unsettledExpenses = useMemo(() =>
    expenses.filter(e => e.date > lastSettledAt.substring(0, 10)),
    [expenses, lastSettledAt]
  );

  const memberBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    members.forEach(m => { balances[m.name] = 0; });
    balances['You'] = 0;

    unsettledExpenses.forEach(e => {
      const splits = (e.split_among as { name: string; share: number }[]) || [];
      const totalSplits = splits.reduce((s, sp) => s + sp.share, 0);
      const payerShare = Number(e.amount) - totalSplits;

      // payer paid for everyone, so others owe their shares
      splits.forEach(sp => {
        if (sp.name !== e.paid_by) {
          balances[sp.name] = (balances[sp.name] || 0) + sp.share;
        }
      });
    });

    return members.map(m => ({
      name: m.name,
      owes: balances[m.name] || 0,
    }));
  }, [unsettledExpenses, members]);

  // Individual expenses (all time, never reset)
  const individualTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    members.forEach(m => { totals[m.name] = 0; });
    totals['You'] = 0;

    expenses.forEach(e => {
      const splits = (e.split_among as { name: string; share: number }[]) || [];
      splits.forEach(sp => {
        totals[sp.name] = (totals[sp.name] || 0) + sp.share;
      });
      // Add payer's share
      const totalSplit = splits.reduce((s, sp) => s + sp.share, 0);
      const payerShare = Number(e.amount) - totalSplit;
      totals[e.paid_by] = (totals[e.paid_by] || 0) + payerShare;
    });

    return members.map(m => ({ name: m.name, total: totals[m.name] || 0 }));
  }, [expenses, members]);

  const totalOwed = memberBalances.reduce((s, m) => s + m.owes, 0);

  const handleSettle = () => {
    addSettlementMutation.mutate({ group_id: group.id, amount: totalOwed }, {
      onSuccess: () => toast.success('✅ Settled up successfully'),
    });
  };

  const handleAddExpense = () => {
    if (!expForm.description || !expForm.amount) return;
    const amt = Number(expForm.amount);
    const allPeople = ['You', ...members.map(m => m.name)];
    const perPerson = Math.floor(amt / allPeople.length);
    const splits = members.map(m => ({ name: m.name, share: perPerson }));

    addExpenseMutation.mutate({
      group_id: group.id,
      description: expForm.description,
      amount: amt,
      paid_by: expForm.paid_by,
      split_among: splits,
      date: expForm.date,
    }, {
      onSuccess: () => {
        setExpForm({ description: '', amount: '', paid_by: 'You', date: new Date().toISOString().split('T')[0] });
        setShowAddExpense(false);
        toast.success('Expense added!');
      },
    });
  };

  const formatAmount = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="sheet-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">{group.name}</h3>
            <p className="text-[11px] text-muted-foreground">You, {members.map(m => m.name).join(', ')}</p>
          </div>
          <div className="flex items-center gap-3">
            {totalOwed > 0 && <span className="text-sm font-bold text-accent">{formatAmount(totalOwed)}</span>}
            <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="sheet-body px-6 space-y-4">
          {/* Member balances */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold">Balances</p>
            <div className="space-y-1.5">
              {memberBalances.map(m => (
                <div key={m.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${m.owes > 0 ? 'text-accent' : 'text-primary'}`}>
                    {m.owes > 0 ? `owes ${formatAmount(m.owes)}` : '₹0'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Individual expenses (all-time) */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Individual Expenses (Till Date)</p>
            <div className="space-y-1.5">
              {individualTotals.map(m => (
                <div key={m.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-foreground">{m.name}</span>
                  <span className="text-sm font-medium text-foreground">{formatAmount(m.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add expense button */}
          <button onClick={() => setShowAddExpense(!showAddExpense)}
            className="w-full py-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold">
            + Add Group Expense
          </button>

          {showAddExpense && (
            <div className="space-y-2 p-3 bg-secondary/30 rounded-xl">
              <input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })}
                placeholder="Description" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              <input type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })}
                placeholder="Amount" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
              <select value={expForm.paid_by} onChange={e => setExpForm({ ...expForm, paid_by: e.target.value })}
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border focus:border-primary">
                <option value="You">You</option>
                {members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
              <button onClick={handleAddExpense} disabled={addExpenseMutation.isPending}
                className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                {addExpenseMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          )}
        </div>

        <div className="sheet-footer">
          <div className="flex items-center gap-2">
            <button onClick={() => deleteGroupMutation.mutate(group.id)}
              className="p-3 rounded-xl bg-secondary text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
            {totalOwed > 0 && (
              <button onClick={handleSettle} disabled={addSettlementMutation.isPending}
                className="flex-1 min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50">
                {addSettlementMutation.isPending ? 'Settling...' : `Settle Up — ${formatAmount(totalOwed)}`}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Groups = () => {
  const { data: groups = [], isLoading } = useGroups();
  const addGroupMutation = useAddGroup();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState(['']);

  const handleCreate = () => {
    if (!newName.trim() || newMembers.every(m => !m.trim())) return;
    addGroupMutation.mutate({
      name: newName,
      members: newMembers.filter(m => m.trim()).map(name => ({ name })),
    }, {
      onSuccess: () => {
        setNewName('');
        setNewMembers(['']);
        setShowCreate(false);
        toast.success('Group created!');
      },
    });
  };

  if (isLoading) return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Groups & Splits</h1>
        <button onClick={() => setShowCreate(true)} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>

      <div className="space-y-4 mt-5">
        {groups.map(g => {
          const members = (g.members as { name: string }[]) || [];
          const memberNames = members.map(m => m.name).join(', ');
          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedGroup(g)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{g.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">You, {memberNames}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
        {groups.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">No groups yet. Create one to start splitting!</p>
        )}
      </div>

      {/* Create Group Sheet */}
      <AnimatePresence>
        {showCreate && (
          <div className="sheet-overlay" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="sheet-panel" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                <h3 className="text-lg font-bold text-foreground">Create Group</h3>
                <button onClick={() => setShowCreate(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="sheet-body px-6">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Group name" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary mb-4" />
                <p className="text-xs text-muted-foreground mb-2">Members</p>
                <div className="space-y-2 mb-4">
                  {newMembers.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={m} onChange={(e) => { const n = [...newMembers]; n[i] = e.target.value; setNewMembers(n); }} placeholder="Member name"
                        className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
                      {newMembers.length > 1 && (
                        <button onClick={() => setNewMembers(newMembers.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setNewMembers([...newMembers, ''])} className="text-sm text-primary flex items-center gap-1 mb-4"><Plus className="w-4 h-4" /> Add member</button>
              </div>
              <div className="sheet-footer">
                <button onClick={handleCreate} disabled={addGroupMutation.isPending} className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50">
                  {addGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Detail Sheet */}
      {selectedGroup && (
        <GroupDetail group={selectedGroup} onClose={() => setSelectedGroup(null)} />
      )}
    </div>
  );
};

export default Groups;
