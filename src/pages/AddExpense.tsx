import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Keyboard, MessageSquare, ArrowLeft, Image } from 'lucide-react';
import { Category, PaymentMode, TransactionSource, useTransactions, useSettings } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

const AddExpense = () => {
  const navigate = useNavigate();
  const { addTransaction, isDuplicate } = useTransactions();
  const { settings } = useSettings();
  const [mode, setMode] = useState<'manual' | 'sms' | 'camera' | 'image'>('manual');
  const [smsText, setSmsText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    merchant: '',
    amount: '',
    category: 'Food' as Category,
    paymentMode: 'UPI' as PaymentMode,
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const simulateAiExtraction = () => {
    const receiptDb = [
      { merchant: 'BigBazaar', amount: 2340, category: 'Shopping' as Category, paymentMode: 'Debit Card' as PaymentMode },
      { merchant: 'Dominos Pizza', amount: 649, category: 'Food' as Category, paymentMode: 'UPI' as PaymentMode },
      { merchant: 'Shell Petrol Pump', amount: 1500, category: 'Transport' as Category, paymentMode: 'Credit Card' as PaymentMode },
      { merchant: 'Reliance Fresh', amount: 875, category: 'Food' as Category, paymentMode: 'UPI' as PaymentMode },
      { merchant: 'Apollo Pharmacy', amount: 1230, category: 'Health' as Category, paymentMode: 'Cash' as PaymentMode },
      { merchant: 'Croma Electronics', amount: 4599, category: 'Shopping' as Category, paymentMode: 'Credit Card' as PaymentMode },
      { merchant: 'IRCTC', amount: 1850, category: 'Travel' as Category, paymentMode: 'Net Banking' as PaymentMode },
      { merchant: "McDonald's", amount: 389, category: 'Food' as Category, paymentMode: 'UPI' as PaymentMode },
    ];
    return receiptDb[Math.floor(Math.random() * receiptDb.length)];
  };

  const handleImageCapture = (source: 'camera' | 'gallery') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImagePreview(ev.target?.result as string);
          const extracted = simulateAiExtraction();
          setTimeout(() => {
            setForm({ ...form, merchant: extracted.merchant, amount: String(extracted.amount), category: extracted.category, paymentMode: extracted.paymentMode });
            setMode('manual');
            toast.success(`🧠 AI extracted: ₹${extracted.amount.toLocaleString('en-IN')} at ${extracted.merchant}`);
          }, 2000);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const parseSms = () => {
    const amountMatch = smsText.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;
    const merchantPatterns = [/(?:at|to|for|@)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\s+via|\.|\s*$)/i, /(?:spent|paid|debited).*?(?:at|to|for)\s+([A-Za-z0-9\s]+)/i];
    let merchant = 'Unknown';
    for (const pattern of merchantPatterns) { const match = smsText.match(pattern); if (match) { merchant = match[1].trim(); break; } }
    const isCredit = /credited|received|refund/i.test(smsText);
    const paymentMode: PaymentMode = /upi/i.test(smsText) ? 'UPI' : /credit\s*card/i.test(smsText) ? 'Credit Card' : /debit\s*card/i.test(smsText) ? 'Debit Card' : /neft|imps|net\s*banking/i.test(smsText) ? 'Net Banking' : 'UPI';
    let category: Category = 'Other';
    const lm = merchant.toLowerCase();
    if (/swiggy|zomato|food|restaurant|cafe|dominos/i.test(lm)) category = 'Food';
    else if (/uber|ola|metro|petrol|fuel/i.test(lm)) category = 'Transport';
    else if (/amazon|flipkart|myntra|shopping/i.test(lm)) category = 'Shopping';
    else if (/electricity|water|gas|broadband|jio|airtel/i.test(lm)) category = 'Bills';
    else if (/netflix|spotify|hotstar|prime/i.test(lm)) category = 'Entertainment';
    if (amount > 0 && !isCredit) { setForm({ ...form, merchant, amount: String(amount), category, paymentMode }); setMode('manual'); toast.success(`Parsed: ₹${amount} at ${merchant}`); }
    else toast.error('Could not parse SMS. Please enter manually.');
  };

  const handleSubmit = async () => {
    if (!form.merchant || !form.amount) { toast.error('Please fill merchant and amount'); return; }
    const amount = Number(form.amount);
    if (settings.duplicateDetection && isDuplicate(amount, form.merchant, form.date)) { toast.error('Duplicate transaction detected!'); return; }
    try {
      await addTransaction({ amount, date: form.date, merchant: form.merchant, category: form.category, paymentMode: form.paymentMode, source: 'manual' as TransactionSource, isSplit: false, userShare: amount, isIgnored: false, groupId: null, splits: [], note: form.note });
      toast.success('Expense added!');
      navigate('/transactions');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expense');
    }
  };

  const inputModes = [
    { key: 'manual', icon: Keyboard, label: 'Manual', always: true },
    { key: 'sms', icon: MessageSquare, label: 'SMS', always: false, setting: 'smsIntelligence' as const },
    { key: 'camera', icon: Camera, label: 'Camera', always: false, setting: 'ocrReceiptScan' as const },
    { key: 'image', icon: Image, label: 'Upload', always: false, setting: 'ocrReceiptScan' as const },
  ].filter(m => m.always || settings[m.setting!]);

  return (
    <div className="px-4 pt-14 pb-20 safe-bottom" style={{ maxHeight: 'calc(100vh - 56px)', overflow: 'auto' }}>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-foreground">Add Expense</h1>
      </div>

      {imagePreview && (
        <div className="mb-3 rounded-xl overflow-hidden border border-border/50">
          <img src={imagePreview} alt="Receipt" className="w-full max-h-32 object-cover" />
          <div className="px-3 py-1.5 bg-secondary/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-muted-foreground">AI scanning receipt...</span>
          </div>
        </div>
      )}

      {mode === 'sms' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <textarea value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder="Paste your bank SMS here..." rows={3} className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary resize-none" />
          <button onClick={parseSms} className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-xl mt-2">🧠 Parse with AI</button>
        </motion.div>
      )}

      {mode === 'manual' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Merchant</label>
              <input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="e.g. Swiggy" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full bg-secondary rounded-lg px-3 py-2 text-lg font-bold text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border focus:border-primary" />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setForm({ ...form, category: c })} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${form.category === c ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  {CATEGORY_EMOJI[c]} {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Payment Mode</label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_MODES.map(m => (
                <button key={m} onClick={() => setForm({ ...form, paymentMode: m })} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${form.paymentMode === m ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Note (optional)</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Add a note..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
          </div>

          <button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl text-sm">
            Add Expense
          </button>
        </motion.div>
      )}

      <div className={`grid gap-2 mt-3`} style={{ gridTemplateColumns: `repeat(${inputModes.length}, 1fr)` }}>
        {inputModes.map(({ key, icon: Icon, label }) => (
          <button key={key}
            onClick={() => { if (key === 'camera') { handleImageCapture('camera'); return; } if (key === 'image') { handleImageCapture('gallery'); return; } setMode(key as 'manual' | 'sms'); }}
            className={`glass-card p-2.5 flex flex-col items-center gap-1 transition-all ${mode === key ? 'border-primary glow' : 'border-border/50'}`}
          >
            <Icon className={`w-4 h-4 ${mode === key ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-[9px] font-medium ${mode === key ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
          </button>
        ))}
      </div>

      {settings.smsIntelligence && (
        <button onClick={() => navigate('/sms-engine')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 mt-3">
          <MessageSquare className="w-4 h-4 text-primary" />
          <div className="text-left flex-1">
            <span className="text-xs font-semibold text-primary">AI SMS Engine</span>
            <p className="text-[9px] text-muted-foreground">Auto-scan bank messages</p>
          </div>
          <span className="text-xs text-primary font-bold">→</span>
        </button>
      )}
    </div>
  );
};

export default AddExpense;
