import { useState, useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { useStore, Category, PaymentMode } from '@/store/useStore';
import { TransactionCard } from '@/components/TransactionCard';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];

const Transactions = () => {
  const transactions = useStore(s => s.transactions);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '' as string,
    paymentMode: '' as string,
    showIgnored: false,
  });

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (!filters.showIgnored && t.isIgnored) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.paymentMode && t.paymentMode !== filters.paymentMode) return false;
      if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, filters]);

  const activeFilterCount = [filters.category, filters.paymentMode, filters.showIgnored].filter(Boolean).length;

  return (
    <div className="px-4 pt-14 safe-bottom">
      <h1 className="text-2xl font-bold text-foreground mb-4">Transactions</h1>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchants..."
            className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative px-3 rounded-xl border transition-colors ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 gradient-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="glass-card p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border">
                  <option value="">All</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Payment Mode</label>
                <select value={filters.paymentMode} onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border">
                  <option value="">All</option>
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={filters.showIgnored} onChange={(e) => setFilters({ ...filters, showIgnored: e.target.checked })} className="rounded accent-primary" />
                Show ignored
              </label>
              {activeFilterCount > 0 && (
                <button onClick={() => setFilters({ category: '', paymentMode: '', showIgnored: false })} className="text-xs text-destructive flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
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
