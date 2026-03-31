import { useState, useMemo } from 'react';
import { Users, Plus, X, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useStore, Transaction } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

interface MemberBalance {
  id: string;
  name: string;
  amount: number; // positive = they owe you, negative = you owe them
  settled: boolean;
}

const Groups = () => {
  const { groups, addGroup, deleteGroup, transactions, settleUp } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState(['']);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

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

  // Compute member balances across all groups from split transactions
  const groupBalances = useMemo(() => {
    const balances: Record<string, MemberBalance[]> = {};

    groups.forEach(g => {
      // Get transactions for this group OR transactions with splits matching group members
      const memberNames = g.members.map(m => m.name.toLowerCase());
      const groupTxns = transactions.filter(t =>
        !t.isIgnored && (
          t.groupId === g.id ||
          t.splits.some(s => memberNames.includes(s.name.toLowerCase()))
        )
      );

      const memberMap: Record<string, { total: number; settled: boolean }> = {};
      g.members.forEach(m => { memberMap[m.name] = { total: 0, settled: true }; });

      groupTxns.forEach(t => {
        t.splits.forEach(s => {
          const key = g.members.find(m => m.name.toLowerCase() === s.name.toLowerCase())?.name;
          if (key && memberMap[key] !== undefined) {
            memberMap[key].total += s.share;
            if (!s.settled) memberMap[key].settled = false;
          }
        });
      });

      balances[g.id] = g.members.map(m => ({
        id: m.id,
        name: m.name,
        amount: memberMap[m.name]?.total || 0,
        settled: memberMap[m.name]?.settled ?? true,
      }));
    });

    return balances;
  }, [groups, transactions]);

  // Summary stats
  const summary = useMemo(() => {
    let owedToYou = 0;
    let youOwe = 0;
    let settledCount = 0;

    Object.values(groupBalances).forEach(members => {
      members.forEach(m => {
        if (m.settled && m.amount > 0) {
          settledCount++;
        } else if (m.amount > 0) {
          owedToYou += m.amount;
        }
        // For "you owe" we'd need reverse tracking; simplified here
      });
    });

    return { owedToYou, youOwe, settledCount };
  }, [groupBalances]);

  const getGroupNetBalance = (groupId: string) => {
    const members = groupBalances[groupId] || [];
    return members.reduce((sum, m) => sum + (m.settled ? 0 : m.amount), 0);
  };

  const formatAmount = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Groups & Splits</h1>
        <button onClick={() => setShowCreate(true)} className="gradient-primary text-primary-foreground p-2.5 rounded-xl">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Net owed: <span className="text-primary font-semibold">{formatAmount(summary.owedToYou)}</span> to you
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-primary">{formatAmount(summary.owedToYou)}</p>
          <p className="text-[11px] text-muted-foreground">Owed to you</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-destructive">{formatAmount(summary.youOwe)}</p>
          <p className="text-[11px] text-muted-foreground">You owe</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">{summary.settledCount}</p>
          <p className="text-[11px] text-muted-foreground">Settled</p>
        </div>
      </div>

      {/* Group List */}
      <div className="space-y-4">
        {groups.map(g => {
          const netBalance = getGroupNetBalance(g.id);
          const members = groupBalances[g.id] || [];
          const isExpanded = expandedGroup === g.id;
          const memberNames = g.members.map(m => m.name).join(', ');

          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Group Header - clickable */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : g.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{g.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">You, {memberNames}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {netBalance > 0 ? (
                    <span className="text-sm font-bold text-primary">+{formatAmount(netBalance)}</span>
                  ) : netBalance < 0 ? (
                    <span className="text-sm font-bold text-destructive">-{formatAmount(netBalance)}</span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">settled</span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded Member Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.settled ? (
                              <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                                <Check className="w-3 h-3" /> settled
                              </span>
                            ) : m.amount > 0 ? (
                              <span className="text-sm font-semibold text-primary">owes {formatAmount(m.amount)}</span>
                            ) : (
                              <span className="text-sm font-semibold text-destructive">you owe {formatAmount(m.amount)}</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        {netBalance > 0 ? (
                          <button
                            onClick={() => {
                              members.filter(m => !m.settled && m.amount > 0).forEach(m => settleUp(g.id, m.id));
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold transition-colors hover:bg-primary/20"
                          >
                            💸 Settle Up — {formatAmount(netBalance)}
                          </button>
                        ) : netBalance < 0 ? (
                          <button
                            onClick={() => {
                              members.filter(m => !m.settled && m.amount < 0).forEach(m => settleUp(g.id, m.id));
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold transition-colors hover:bg-destructive/20"
                          >
                            💸 Pay {formatAmount(netBalance)}
                          </button>
                        ) : null}
                        <button
                          onClick={() => deleteGroup(g.id)}
                          className="p-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                        >
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
