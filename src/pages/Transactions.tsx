import { useState, useMemo } from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { Category, PaymentMode } from '@/store/useStore';
import { useTransactions } from '@/hooks/useSupabaseData';
import { TransactionCard } from '@/components/TransactionCard';
import { getRecentMonths, getShortMonthLabel, getCurrentMonth } from '@/lib/dateUtils';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];
const PAYMENT_ICONS: Record<string, string> = { 'UPI': '📱', 'Credit Card': '💳', 'Debit Card': '💳', 'Cash': '💵', 'Net Banking': '🏦' };

const Transactions = () => {
  const { data: transactions = [], isLoading } = useTransactions();
  const recentMonths = useMemo(() => getRecentMonths(6), []);
  const monthOptions = [{ key: '', label: 'All' }, ...recentMonths.map(m => ({ key: m, label: getShortMonthLabel(m) }))];

  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showIgnored, setShowIgnored] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filtered = useMemo(() => {
    let result = transactions.filter(t => {
      if (!showIgnored && t.isIgnored) return false;
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (selectedMode && t.paymentMode !== selectedMode) return false;
      if (selectedMonth && !t.date.startsWith(selectedMonth)) return false;
      if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortOrder === 'newest' ? -cmp : cmp;
    });
    return result;
  }, [transactions, search, selectedMode, selectedCategory, selectedMonth, showIgnored, sortOrder]);

  const totalFiltered = useMemo(() => filtered.reduce((s, t) => s + t.userShare, 0), [filtered]);
  const hasActiveFilters = !!(selectedMode || selectedCategory || showIgnored);

  if (isLoading) {
    return (
      <div className="px-4 pt-14 safe-bottom flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-muted-foreground text-sm">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 safe-bottom">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <button
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-secondary text-muted-foreground"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length} transactions · ₹{totalFiltered.toLocaleString('en-IN')}
      </p>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchants..."
          className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        <button onClick={() => setSelectedMode('')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${!selectedMode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
        >All</button>
        {PAYMENT_MODES.map(mode => (
          <button key={mode} onClick={() => setSelectedMode(selectedMode === mode ? '' : mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${selectedMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >
            <span>{PAYMENT_ICONS[mode] || '💰'}</span>
            {mode === 'Credit Card' ? 'Card' : mode === 'Debit Card' ? 'Debit' : mode === 'Net Banking' ? 'NEFT' : mode}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        <button onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${!selectedCategory ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
        >All Categories</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${selectedCategory === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >{cat}</button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        {monthOptions.map(m => (
          <button key={m.key} onClick={() => setSelectedMonth(selectedMonth === m.key ? '' : m.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${selectedMonth === m.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
          >{m.label}</button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} className="rounded accent-primary" />
          Show ignored
        </label>
        {hasActiveFilters && (
          <button onClick={() => { setSelectedMode(''); setSelectedCategory(''); setShowIgnored(false); }} className="text-xs text-destructive flex items-center gap-1">
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">No transactions found</p>
        ) : (
          filtered.map(t => <TransactionCard key={t.id} transaction={t} />)
        )}
      </div>
    </div>
  );
};

export default Transactions;
