import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scan, AlertTriangle, Check, Tag, Ban, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, PaymentMode } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { useAddTransaction, useTransactions } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';

interface ParsedSms {
  id: string;
  rawText: string;
  bank: string;
  type: 'Debit' | 'Credit' | 'Investment';
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
  parsedAt: number; // timestamp for auto-add timer
}

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

function parseSmsText(rawText: string): Omit<ParsedSms, 'id' | 'rawText' | 'bank' | 'parsedAt' | 'addedToLedger' | 'isIgnored' | 'isDuplicate' | 'duplicateInfo'> {
  const amountMatch = rawText.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;

  const isCredit = /credited|received|refund|salary|credit/i.test(rawText);
  const isInvestment = /sip|mutual\s*fund|zerodha|groww|coin|bluechip/i.test(rawText);
  const type: 'Debit' | 'Credit' | 'Investment' = isInvestment ? 'Investment' : isCredit ? 'Credit' : 'Debit';

  // Extract merchant
  let merchant = 'Unknown';
  const merchantPatterns = [
    /(?:at|to|for|@|merchant[:\s])\s*([A-Za-z0-9\s&.'-]+?)(?:\s+on|\s+ref|\s+via|\.|\s+Avl|\s+Balance|\s+Card|\s*$)/i,
    /(?:debited|spent|paid).*?(?:at|to|for)\s+([A-Za-z0-9\s&.'-]+?)(?:\s+on|\s+ref|\s+via|\.|\s*$)/i,
    /(?:from\s+A\/c.*?to\s+)([A-Za-z0-9\s&.'-]+?)(?:\s+on|\s+via|\.|\s*$)/i,
  ];
  for (const pattern of merchantPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1].trim().length > 1) { merchant = match[1].trim(); break; }
  }

  // Detect payment mode
  const paymentMode: PaymentMode = /upi/i.test(rawText) ? 'UPI'
    : /credit\s*card/i.test(rawText) ? 'Credit Card'
    : /debit\s*card/i.test(rawText) ? 'Debit Card'
    : /neft|imps|net\s*banking/i.test(rawText) ? 'Net Banking'
    : /card\s*xx/i.test(rawText) ? 'Credit Card'
    : 'UPI';

  // Auto-categorize
  let category: Category = 'Other';
  const lower = (merchant + ' ' + rawText).toLowerCase();
  if (/swiggy|zomato|food|restaurant|cafe|dominos|pizza|burger|kitchen/i.test(lower)) category = 'Food';
  else if (/uber|ola|metro|petrol|fuel|rapido|auto|cab|parking/i.test(lower)) category = 'Transport';
  else if (/amazon|flipkart|myntra|shopping|ajio|meesho/i.test(lower)) category = 'Shopping';
  else if (/electricity|water|gas|broadband|jio|airtel|vodafone|bill|recharge/i.test(lower)) category = 'Bills';
  else if (/netflix|spotify|hotstar|prime|disney|youtube|subscription/i.test(lower)) category = 'Entertainment';
  else if (/apollo|pharmacy|hospital|doctor|medic|health/i.test(lower)) category = 'Health';
  else if (/sip|mutual|zerodha|groww|invest|coin|bluechip/i.test(lower)) category = 'SIP';
  else if (/rent|landlord|house|flat/i.test(lower)) category = 'Rent';
  else if (/flight|hotel|travel|makemytrip|goibibo|irctc/i.test(lower)) category = 'Travel';
  else if (/course|udemy|education|school|college|tuition/i.test(lower)) category = 'Education';
  else if (/salary|credited/i.test(lower)) category = 'Other';

  // Extract date
  const dateMatch = rawText.match(/(\d{1,2})[-/](\w{3,})[-/](\d{2,4})/i);
  let date = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const monthStr = dateMatch[2].toLowerCase().slice(0, 3);
    const m = months[monthStr] || dateMatch[2];
    const y = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
    date = `${y}-${m}-${dateMatch[1].padStart(2, '0')}`;
  }

  const summary = type === 'Credit'
    ? `₹${amount.toLocaleString()} credited from ${merchant}. ${paymentMode}.`
    : type === 'Investment'
    ? `SIP of ₹${amount.toLocaleString()} placed via ${merchant}. Auto-categorized.`
    : `₹${amount.toLocaleString()} spent at ${merchant} via ${paymentMode}.`;

  return { type, extracted: { amount, merchant, category, paymentMode, date }, summary };
}

function detectBank(rawText: string): string {
  const lower = rawText.toLowerCase();
  if (/hdfc/i.test(lower)) return 'HDFC BNK';
  if (/icici/i.test(lower)) return 'ICICI';
  if (/sbi/i.test(lower)) return 'SBI';
  if (/axis/i.test(lower)) return 'AXIS';
  if (/kotak/i.test(lower)) return 'KOTAK';
  if (/zerodha/i.test(lower)) return 'ZERODHA';
  return 'BANK';
}

const DUMMY_SMS_RAW = [
  'Acct XX4525: INR 450.00 debited via UPI on 28-Mar-25. Merchant: SWIGGY. Avl Bal: INR 24,500.00',
  'Order Executed. Zerodha Coin. SIP INR 5000 for Axis Bluechip Fund placed on 25-Mar-25.',
  'INR 1,200 debited on 27-Mar-25 at AMAZON INDIA. Card XX9182. Avl Cr Limit: 86,000',
  'Rs.350 debited from A/c XX8821 to Zomato on 29-Mar-25 via UPI. Balance: Rs.18,200',
  'INR 599 auto-debited for Netflix subscription on 26-Mar-25. HDFC Credit Card XX4525.',
  'INR 75,000 credited to A/c XX4525 on 01-Mar-26. Salary from TCS. Avl Bal: INR 1,24,500.00',
  'Rs.2,100 debited from A/c XX8821 to Uber on 30-Mar-25 via UPI. Balance: Rs.16,100',
];

const now = Date.now();
const DUMMY_SMS: ParsedSms[] = DUMMY_SMS_RAW.map((rawText, i) => {
  const parsed = parseSmsText(rawText);
  const bank = detectBank(rawText);
  return {
    id: `sms${i + 1}`,
    rawText,
    bank,
    ...parsed,
    isDuplicate: false,
    addedToLedger: false,
    isIgnored: false,
    parsedAt: now - (i * 60000), // stagger by 1 min each
  };
});

const SmsEngine = () => {
  const navigate = useNavigate();
  const settings = useStore(s => s.settings);
  const addTransactionMut = useAddTransaction();
  const { data: existingTransactions = [] } = useTransactions();
  
  const isDuplicate = (amount: number, merchant: string, date: string) => {
    return existingTransactions.some(t =>
      t.amount === amount && t.merchant.toLowerCase() === merchant.toLowerCase() && t.date === date
    );
  };
  const [smsList, setSmsList] = useState<ParsedSms[]>(DUMMY_SMS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Auto-add after 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      setSmsList(prev => {
        let changed = false;
        const next = prev.map(s => {
          if (!s.addedToLedger && !s.isIgnored && !s.isDuplicate && s.parsedAt < tenMinAgo) {
            if (!isDuplicate(s.extracted.amount, s.extracted.merchant, s.extracted.date)) {
              addTransaction({
                amount: s.extracted.amount,
                date: s.extracted.date,
                merchant: s.extracted.merchant,
                category: s.extracted.category,
                paymentMode: s.extracted.paymentMode,
                source: 'sms',
                isSplit: false,
                userShare: s.extracted.amount,
                isIgnored: false,
                groupId: null,
                splits: [],
                note: `Auto-added via SMS (${s.type}): ${s.summary}`,
              });
              changed = true;
              return { ...s, addedToLedger: true };
            }
          }
          return s;
        });
        if (changed) toast.info('⏱️ Auto-added unreviewed transactions to ledger');
        return changed ? next : prev;
      });
    }, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [addTransaction, isDuplicate]);

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
      note: `Via SMS (${sms.type}): ${sms.summary}`,
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

  // If SMS intelligence is disabled, show notice
  if (!settings.smsIntelligence) {
    return (
      <div className="px-4 pt-14 pb-28 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">SMS Intelligence is Disabled</p>
          <p className="text-sm text-muted-foreground mb-4">Enable it in Settings to auto-scan bank messages.</p>
          <button onClick={() => navigate('/settings')} className="gradient-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl">
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI SMS Engine</h1>
          <p className="text-xs text-muted-foreground">FinClarity intelligence</p>
        </div>
      </div>

      {/* Auto-add notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 mb-4 mt-4">
        <Clock className="w-4 h-4 text-accent mt-0.5 shrink-0" />
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
          <span className="font-bold text-primary">{visibleSms.filter(s => !s.addedToLedger).length}</span>{' '}
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
                  : sms.type === 'Credit'
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-card border-border/50'
              }`}
            >
              {/* Bank header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${sms.type === 'Credit' ? 'bg-emerald-500' : sms.type === 'Investment' ? 'bg-blue-500' : 'bg-primary'}`} />
                  <span className="text-xs font-bold text-foreground">{sms.bank}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    sms.type === 'Credit' ? 'bg-emerald-500/20 text-emerald-400' : sms.type === 'Investment' ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary text-muted-foreground'
                  }`}>{sms.type}</span>
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
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${sms.type === 'Credit' ? 'text-emerald-400 bg-emerald-500/10' : 'text-foreground bg-secondary'}`}>
                    {sms.type === 'Credit' ? '+' : '-'}₹{sms.extracted.amount.toLocaleString()}
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
