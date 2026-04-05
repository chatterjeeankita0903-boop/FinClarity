import { useState, useMemo } from 'react';
import { Users, Plus, X, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface MemberBalance {
  id: string;
  name: string;
  amount: number;
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

  // Compute member balances & individual expenses
  const groupData = useMemo(() => {
    const data: Record<string, { balances: MemberBalance[]; memberExpenses: Record<string, number>; myExpenses: number }> = {};

    groups.forEach(g => {
      const memberNames = g.members.map(m => m.name.toLowerCase());
      const groupTxns = transactions.filter(t =>
        !t.isIgnored && (t.groupId === g.id || t.splits.some(s => memberNames.includes(s.name.toLowerCase())))
      );

      const memberMap: Record<string, { total: number; settled: boolean }> = {};
      const memberExpenses: Record<string, number> = {};
      let myExpenses = 0;

      g.members.forEach(m => {
        memberMap[m.name] = { total: 0, settled: true };
        memberExpenses[m.name] = 0;
      });

      groupTxns.forEach(t => {
        // My share
        myExpenses += t.userShare;
        // Each member's share
        t.splits.forEach(s => {
          const key = g.members.find(m => m.name.toLowerCase() === s.name.toLowerCase())?.name;
          if (key && memberMap[key] !== undefined) {
            memberMap[key].total += s.share;
            memberExpenses[key] = (memberExpenses[key] || 0) + s.share;
            if (!s.settled) memberMap[key].settled = false;
          }
        });
      });

      data[g.id] = {
        balances: g.members.map(m => ({
          id: m.id,
          name: m.name,
          amount: memberMap[m.name]?.total || 0,
          settled: memberMap[m.name]?.settled ?? true,
        })),
        memberExpenses,
        myExpenses,
      };
    });

    return data;
  }, [groups, transactions]);

  const summary = useMemo(() => {
    let owedToYou = 0;
    let settledCount = 0;
    Object.values(groupData).forEach(({ balances }) => {
      balances.forEach(m => {
        if (m.settled && m.amount > 0) settledCount++;
        else if (m.amount > 0) owedToYou += m.amount;
      });
    });
    return { owedToYou, youOwe: 0, settledCount };
  }, [groupData]);

  const getGroupNetBalance = (groupId: string) => {
    const members = groupData[groupId]?.balances || [];
    return members.reduce((sum, m) => sum + (m.settled ? 0 : m.amount), 0);
  };

  const formatAmount = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

  return (
    <div className="px-4 pt-14 pb-24 safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Groups & Splits</h1>
        <button onClick={() => setShowCreate(true)} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Create Group
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
          const gd = groupData[g.id];
          const members = gd?.balances || [];
          const isExpanded = expandedGroup === g.id;
          const memberNames = g.members.map(m => m.name).join(', ');

          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
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
                      {/* Members with balances */}
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

                      {/* Individual Expenses Section */}
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Individual Expenses (Till Date)</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-primary/5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">Y</div>
                              <span className="text-xs font-medium text-foreground">You</span>
                            </div>
                            <span className="text-xs font-bold text-primary">{formatAmount(gd?.myExpenses || 0)}</span>
                          </div>
                          {members.map(m => (
                            <div key={m.id + '-exp'} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-foreground">{m.name}</span>
                              </div>
                              <span className="text-xs font-bold text-foreground">{formatAmount(gd?.memberExpenses[m.name] || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        {netBalance > 0 ? (
                          <button
                            onClick={() => {
                              members.filter(m => !m.settled && m.amount > 0).forEach(m => settleUp(g.id, m.id));
                              toast.success('✅ Settled up successfully');
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold transition-colors hover:bg-primary/20"
                          >
                            💸 Settle Up — {formatAmount(netBalance)}
                          </button>
                        ) : netBalance < 0 ? (
                          <button
                            onClick={() => {
                              members.filter(m => !m.settled && m.amount < 0).forEach(m => settleUp(g.id, m.id));
                              toast.success('✅ Settled up successfully');
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
          <div className="sheet-overlay" onClick={() => setShowCreate(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="sheet-panel"
              onClick={(e) => e.stopPropagation()}
            >
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
              </div>

              <div className="sheet-footer">
                <button onClick={handleCreate} className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl">Create Group</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Groups;
