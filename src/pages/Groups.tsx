import { useState } from 'react';
import { Users, Plus, X, ChevronRight, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

const Groups = () => {
  const { groups, addGroup, deleteGroup, transactions } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState(['']);

  const handleCreate = () => {
    if (!newName.trim() || newMembers.every(m => !m.trim())) return;
    addGroup({
      name: newName,
      members: newMembers.filter(m => m.trim()).map((name, i) => ({ id: `m-${Date.now()}-${i}`, name })),
    });
    setNewName('');
    setNewMembers(['']);
    setShowCreate(false);
  };

  const getGroupBalance = (groupId: string) => {
    const groupTxns = transactions.filter(t => t.groupId === groupId && !t.isIgnored);
    const totalOwed = groupTxns.reduce((sum, t) => sum + t.splits.filter(s => !s.settled).reduce((s2, sp) => s2 + sp.share, 0), 0);
    return totalOwed;
  };

  return (
    <div className="px-4 pt-14 safe-bottom">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Groups</h1>
        <button onClick={() => setShowCreate(true)} className="gradient-primary text-primary-foreground p-2.5 rounded-xl">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Group List */}
      <div className="space-y-3">
        {groups.map(g => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{g.name}</h3>
                  <p className="text-xs text-muted-foreground">{g.members.length} members</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteGroup(g.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {g.members.map(m => (
                <span key={m.id} className="text-[11px] bg-secondary px-2 py-1 rounded-full text-secondary-foreground">{m.name}</span>
              ))}
            </div>
          </motion.div>
        ))}
        {groups.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">No groups yet. Create one to start splitting!</p>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Create Group</h3>
                <button onClick={() => setShowCreate(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>

              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Group name" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary mb-4" />

              <p className="text-xs text-muted-foreground mb-2">Members</p>
              <div className="space-y-2 mb-4">
                {newMembers.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={m}
                      onChange={(e) => { const n = [...newMembers]; n[i] = e.target.value; setNewMembers(n); }}
                      placeholder="Member name"
                      className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary"
                    />
                    {newMembers.length > 1 && (
                      <button onClick={() => setNewMembers(newMembers.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => setNewMembers([...newMembers, ''])} className="text-sm text-primary flex items-center gap-1 mb-4"><Plus className="w-4 h-4" /> Add member</button>

              <button onClick={handleCreate} className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl">Create Group</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Groups;
