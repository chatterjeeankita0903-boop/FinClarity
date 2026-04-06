import { useState } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';
import { Transaction, useTransactions, useGroups } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

export const SplitDialog = ({ transaction, onClose }: Props) => {
  const { splitTransaction } = useTransactions();
  const { groups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(transaction.groupId);
  const [members, setMembers] = useState(
    transaction.splits.length > 0
      ? transaction.splits.map(s => ({ name: s.name, share: s.share }))
      : [{ name: '', share: 0 }]
  );
  const [mode, setMode] = useState<'equal' | 'custom'>('equal');

  const totalPeople = members.filter(m => m.name).length + 1;
  const equalShare = Math.round(transaction.amount / totalPeople);

  const handleGroupSelect = (groupId: string) => {
    if (groupId === '') { setSelectedGroupId(null); return; }
    setSelectedGroupId(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) setMembers(group.members.map(m => ({ name: m.name, share: 0 })));
  };

  const handleSplit = async () => {
    const validMembers = members.filter(m => m.name.trim());
    if (validMembers.length === 0) return;
    const splits = validMembers.map((m, i) => ({
      id: `s-${Date.now()}-${i}`,
      name: m.name,
      share: mode === 'equal' ? equalShare : m.share,
      settled: false,
    }));
    try {
      await splitTransaction(transaction.id, splits, selectedGroupId);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Split failed');
    }
  };

  const otherTotal = mode === 'equal'
    ? equalShare * members.filter(m => m.name).length
    : members.reduce((s, m) => s + (m.share || 0), 0);
  const yourShare = transaction.amount - otherTotal;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Split ₹{transaction.amount.toLocaleString('en-IN')}</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="sheet-body px-6">
          {groups.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Split with a group</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleGroupSelect('')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${!selectedGroupId ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-secondary-foreground'}`}>Custom</button>
                {groups.map(g => (
                  <button key={g.id} onClick={() => handleGroupSelect(g.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedGroupId === g.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-secondary-foreground'}`}>
                    <Users className="w-3.5 h-3.5" /> {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode('equal')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'equal' ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>Equal</button>
            <button onClick={() => setMode('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'custom' ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>Custom</button>
          </div>
          <div className="space-y-3 mb-4">
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={m.name} onChange={(e) => { const n = [...members]; n[i].name = e.target.value; setMembers(n); }} placeholder="Name" className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
                {mode === 'custom' && (
                  <input type="number" value={m.share || ''} onChange={(e) => { const n = [...members]; n[i].share = Number(e.target.value); setMembers(n); }} placeholder="₹" className="w-24 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
                )}
                {mode === 'equal' && <span className="text-sm font-medium text-primary w-24 text-right">₹{equalShare.toLocaleString('en-IN')}</span>}
                <button onClick={() => setMembers(members.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setMembers([...members, { name: '', share: 0 }])} className="flex items-center gap-1 text-sm text-primary mb-4"><Plus className="w-4 h-4" /> Add person</button>
        </div>
        <div className="sheet-footer">
          <div className="glass-elevated p-3 rounded-lg mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your share</span>
              <span className={`font-bold ${yourShare < 0 ? 'text-destructive' : 'text-primary'}`}>₹{yourShare.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button onClick={handleSplit} disabled={yourShare < 0} className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50">Confirm Split</button>
        </div>
      </motion.div>
    </div>
  );
};
