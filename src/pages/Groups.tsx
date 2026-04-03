import { useState, useMemo } from 'react';
import { Users, Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useGroups, useAddGroup, useDeleteGroup, useAddSettlement, Group } from '@/hooks/useGroups';
import { useTransactions } from '@/hooks/useTransactions';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const Groups = () => {
  const { data: groups = [], isLoading } = useGroups();
  const { data: transactions = [] } = useTransactions();
  const addGroupMutation = useAddGroup();
  const deleteGroupMutation = useDeleteGroup();
  const addSettlementMutation = useAddSettlement();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState(['']);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

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

  const formatAmount = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

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
          const isExpanded = expandedGroup === g.id;
          const members = (g.members as { name: string }[]) || [];
          const memberNames = members.map(m => m.name).join(', ');

          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => setExpandedGroup(isExpanded ? null : g.id)}
                className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{g.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">You, {memberNames}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-2">
                      {members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">{m.name}</span>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => deleteGroupMutation.mutate(g.id)}
                          className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {groups.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">No groups yet. Create one to start splitting!</p>
        )}
      </div>

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
    </div>
  );
};

export default Groups;
