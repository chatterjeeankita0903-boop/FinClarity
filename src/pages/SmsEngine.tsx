import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scan, AlertTriangle, Check, Tag, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, PaymentMode, useStore } from '@/store/useStore';
import { toast } from 'sonner';

interface ParsedSms {
  id: string;
  rawText: string;
  bank: string;
  type: 'Transactional' | 'Investment' | 'Refund';
  extracted: {
    amount: number;
    merchant: string;
    category: Category;
    paymentMode: PaymentMode;
    date: string;
  };
  summary: string;
  isDuplicate: boolean;
  duplicateInfo?: string;
  addedToLedger: boolean;
  isIgnored: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

const DUMMY_SMS: ParsedSms[] = [
  {
    id: 'sms1',
    rawText: 'Acct XX4525: INR 450.00 debited via UPI on 28-Mar-25. Merchant: SWIGGY. Avl Bal: INR 24,500.00',
    bank: 'HDFC BNK',
    type: 'Transactional',
    extracted: { amount: 450, merchant: 'Swiggy', category: 'Food', paymentMode: 'UPI', date: '2026-03-28' },
    summary: '₹450 spent on Swiggy via UPI. Balance: ₹24,500.',
    isDuplicate: false,
    addedToLedger: false,
    isIgnored: false,
  },
  {
    id: 'sms2',
    rawText: 'Order Executed. Zerodha Coin. SIP INR 5000 for Axis Bluechip Fund placed on 25-Mar-25.',
    bank: 'ZERODHA',
    type: 'Investment',
    extracted: { amount: 5000, merchant: 'Zerodha Coin', category: 'SIP', paymentMode: 'Net Banking', date: '2026-03-25' },
    summary: 'SIP of ₹5,000 placed via Zerodha Coin — Axis Bluechip Fund. Auto-categorized.',
    isDuplicate: false,
    addedToLedger: false,
    isIgnored: false,
  },
  {
    id: 'sms3',
    rawText: 'INR 1,200 debited on 27-Mar-25 at AMAZON INDIA. Card XX9182. Avl Cr Limit: 86,000',
    bank: 'ICICI',
    type: 'Transactional',
    extracted: { amount: 1200, merchant: 'Amazon India', category: 'Shopping', paymentMode: 'Credit Card', date: '2026-03-27' },
    summary: '₹1,200 spent at Amazon India via Credit Card.',
    isDuplicate: true,
    duplicateInfo: '27 Mar • ₹1,200 exists',
    addedToLedger: false,
    isIgnored: false,
  },
  {
    id: 'sms4',
    rawText: 'Rs.350 debited from A/c XX8821 to Zomato on 29-Mar-25 via UPI. Balance: Rs.18,200',
    bank: 'SBI',
    type: 'Transactional',
    extracted: { amount: 350, merchant: 'Zomato', category: 'Food', paymentMode: 'UPI', date: '2026-03-29' },
    summary: '₹350 spent on Zomato via UPI. Balance: ₹18,200.',
    isDuplicate: false,
    addedToLedger: false,
    isIgnored: false,
  },
  {
    id: 'sms5',
    rawText: 'INR 599 auto-debited for Netflix subscription on 26-Mar-25. HDFC Credit Card XX4525.',
    bank: 'HDFC BNK',
    type: 'Transactional',
    extracted: { amount: 599, merchant: 'Netflix', category: 'Entertainment', paymentMode: 'Credit Card', date: '2026-03-26' },
    summary: '₹599 auto-debited for Netflix subscription.',
    isDuplicate: false,
    addedToLedger: false,
    isIgnored: false,
  },
];

const SmsEngine = () => {
  const navigate = useNavigate();
  const { addTransaction, isDuplicate } = useStore();
  const [smsList, setSmsList] = useState<ParsedSms[]>(DUMMY_SMS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  const addToLedger = (sms: ParsedSms) => {
    if (isDuplicate(sms.extracted.amount, sms.extracted.merchant, sms.extracted.date)) {
      toast.error('Duplicate — already in ledger!');
      return;
    }
    addTransaction({
      amount: sms.extracted.amount,
      date: sms.extracted.date,
      merchant: sms.extracted.merchant,
      category: sms.extracted.category,
      paymentMode: sms.extracted.paymentMode,
      source: 'sms',
      isSplit: false,
      userShare: sms.extracted.amount,
      isIgnored: false,
      groupId: null,
      splits: [],
      note: `Via SMS: ${sms.summary}`,
    });
    setSmsList(prev => prev.map(s => s.id === sms.id ? { ...s, addedToLedger: true } : s));
    toast.success(`Added ₹${sms.extracted.amount.toLocaleString()} — ${sms.extracted.merchant}`);
  };

  const ignoreSms = (id: string) => {
    setSmsList(prev => prev.map(s => s.id === id ? { ...s, isIgnored: true } : s));
    toast('SMS ignored');
  };

  const reTag = (id: string) => {
    toast.info('Re-tag: tap category chips to change');
    setExpandedId(id);
  };

  const updateCategory = (id: string, category: Category) => {
    setSmsList(prev => prev.map(s => s.id === id ? { ...s, extracted: { ...s.extracted, category } } : s));
    toast.success(`Re-tagged to ${category}`);
  };

  const visibleSms = smsList.filter(s => !s.isIgnored);

  return (
    <div className="px-4 pt-14 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI SMS Engine</h1>
          <p className="text-xs text-muted-foreground">Truecaller-style intelligence</p>
        </div>
      </div>

      {/* Auto-add notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 mb-4 mt-4">
        <AlertTriangle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          If transactions are not reviewed by you within <span className="font-bold text-accent">10 minutes</span>, they will be <span className="font-semibold text-foreground">automatically added</span> to your ledger as credit or debit transactions.
        </p>
      </div>

      {/* Scanning indicator */}
      <button
        onClick={handleScan}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 mb-6"
      >
        <Scan className={`w-4 h-4 text-primary ${scanning ? 'animate-pulse' : ''}`} />
        <span className="text-sm text-primary font-medium">
          {scanning ? 'Scanning...' : 'Scanning'}{' '}
          <span className="font-bold text-primary">{visibleSms.length}</span>{' '}
          new messages...
        </span>
      </button>

      {/* SMS Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {visibleSms.map((sms, index) => (
            <motion.div
              key={sms.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl border overflow-hidden ${
                sms.addedToLedger
                  ? 'bg-primary/5 border-primary/30'
                  : sms.isDuplicate
                  ? 'bg-destructive/5 border-destructive/30'
                  : 'bg-card border-border/50'
              }`}
            >
              {/* Bank header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs font-bold text-foreground">{sms.bank}</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">{sms.type}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(sms.extracted.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Raw SMS */}
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground font-mono leading-relaxed">"{sms.rawText}"</p>
              </div>

              {/* AI Extracted */}
              <div className="px-4 pb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold text-primary tracking-wider">⚡ AI EXTRACTED</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-sm font-bold text-foreground bg-secondary px-2.5 py-1 rounded-lg">
                    ₹{sms.extracted.amount.toLocaleString()}
                  </span>
                  <span className="text-sm text-foreground bg-secondary px-2.5 py-1 rounded-lg">
                    {sms.extracted.merchant}
                  </span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg flex items-center gap-1">
                    {CATEGORY_EMOJI[sms.extracted.category]} {sms.extracted.category}
                  </span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                    {sms.extracted.paymentMode}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{sms.summary}</p>

                {/* Re-tag expanded */}
                <AnimatePresence>
                  {expandedId === sms.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-3"
                    >
                      <p className="text-[10px] text-muted-foreground mb-1.5">Change category:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'] as Category[]).map(c => (
                          <button
                            key={c}
                            onClick={() => updateCategory(sms.id, c)}
                            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                              sms.extracted.category === c
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {CATEGORY_EMOJI[c]} {c}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Duplicate warning */}
                {sms.isDuplicate && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">DUPLICATE DETECTED</p>
                      <p className="text-[10px] text-muted-foreground">{sms.duplicateInfo}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ⚠️ Possible duplicate — {sms.extracted.merchant} ₹{sms.extracted.amount.toLocaleString()} on{' '}
                        {new Date(sms.extracted.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
                        already in ledger. Review before adding.
                      </p>
                    </div>
                  </div>
                )}

                {/* Added badge */}
                {sms.addedToLedger && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 mb-3">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Added to Ledger</span>
                  </div>
                )}

                {/* Actions */}
                {!sms.addedToLedger && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToLedger(sms)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground"
                    >
                      <Check className="w-3.5 h-3.5" /> Add to Ledger
                    </button>
                    <button
                      onClick={() => reTag(sms.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      <Tag className="w-3.5 h-3.5" /> Re-tag
                    </button>
                    <button
                      onClick={() => ignoreSms(sms.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      <Ban className="w-3.5 h-3.5" /> Ignore
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SmsEngine;
