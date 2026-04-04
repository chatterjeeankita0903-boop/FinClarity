import { useState, useMemo } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGroups } from '@/hooks/useGroups';

interface SplitPerson {
  name: string;
  amount: number;
}

interface SplitDialogProps {
  amount: number;
  onClose: () => void;
  onConfirm: (splits: SplitPerson[], groupId?: string) => void;
}

export const SplitDialog = ({ amount, onClose, onConfirm }: SplitDialogProps) => {
  const { data: groups = [] } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [people, setPeople] = useState<SplitPerson[]>([{ name: '', amount: 0 }]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // When a group is selected, populate people from group members
  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    if (groupId) {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const members = (group.members as { name: string }[]) || [];
        const perPerson = Math.floor(amount / (members.length + 1));
        setPeople(members.map(m => ({ name: m.name, amount: perPerson })));
      }
    } else {
      setPeople([{ name: '', amount: 0 }]);
    }
  };

  // Recalculate equal splits
  const totalPeople = people.length + 1; // +1 for "You"
  const equalShare = Math.floor(amount / totalPeople);

  const effectivePeople = useMemo(() => {
    if (splitType === 'equal') {
      return people.map(p => ({ ...p, amount: equalShare }));
    }
    return people;
  }, [people, splitType, equalShare]);

  const othersTotal = effectivePeople.reduce((s, p) => s + p.amount, 0);
  const yourShare = amount - othersTotal;

  const addPerson = () => setPeople([...people, { name: '', amount: splitType === 'equal' ? equalShare : 0 }]);
  const removePerson = (i: number) => setPeople(people.filter((_, j) => j !== i));
  const updatePerson = (i: number, field: keyof SplitPerson, value: string | number) => {
    const updated = [...people];
    updated[i] = { ...updated[i], [field]: value };
    setPeople(updated);
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="sheet-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Split ₹{amount.toLocaleString('en-IN')}</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="sheet-body px-6 space-y-4">
          {/* Group selection */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Split with a group</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => handleSelectGroup(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${!selectedGroupId ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                Custom
              </button>
              {groups.map(g => (
                <button key={g.id} onClick={() => handleSelectGroup(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${selectedGroupId === g.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Split type */}
          <div className="flex gap-2">
            <button onClick={() => setSplitType('equal')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${splitType === 'equal' ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              Equal
            </button>
            <button onClick={() => setSplitType('custom')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${splitType === 'custom' ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              Custom
            </button>
          </div>

          {/* People rows */}
          <div className="space-y-2">
            {effectivePeople.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={p.name} onChange={e => updatePerson(i, 'name', e.target.value)}
                  placeholder="Name" className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
                {splitType === 'custom' ? (
                  <input type="number" value={p.amount || ''} onChange={e => updatePerson(i, 'amount', Number(e.target.value))}
                    placeholder="₹0" className="w-24 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
                ) : (
                  <span className="w-24 text-right text-sm font-medium text-foreground">₹{equalShare.toLocaleString('en-IN')}</span>
                )}
                <button onClick={() => removePerson(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <button onClick={addPerson} className="text-sm text-primary flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add person
          </button>

          {/* Your share */}
          <div className="flex items-center justify-between py-3 px-4 bg-secondary/50 rounded-xl">
            <span className="text-sm font-medium text-foreground">Your share</span>
            <span className={`text-sm font-bold ${yourShare < 0 ? 'text-destructive' : 'text-primary'}`}>
              ₹{yourShare.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="sheet-footer">
          <button onClick={() => onConfirm(effectivePeople, selectedGroupId || undefined)}
            className="w-full min-h-12 gradient-primary text-primary-foreground font-semibold py-3 rounded-xl">
            Confirm Split
          </button>
        </div>
      </motion.div>
    </div>
  );
};
