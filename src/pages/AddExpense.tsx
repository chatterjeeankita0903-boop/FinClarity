import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, FileText, Keyboard, MessageSquare, ArrowLeft, Image, Upload } from 'lucide-react';
import { Category, PaymentMode, useStore, TransactionSource } from '@/store/useStore';
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
  const { addTransaction, isDuplicate } = useStore();
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
          // Simulate AI OCR parsing
          setTimeout(() => {
            setForm({
              ...form,
              merchant: 'Scanned Receipt',
              amount: '1250',
              category: 'Shopping',
              paymentMode: 'Cash',
            });
            setMode('manual');
            toast.success('🧠 AI scanned receipt — ₹1,250 detected');
          }, 1500);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const parseSms = () => {
    const amountMatch = smsText.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;

    const merchantPatterns = [
      /(?:at|to|for|@)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\s+via|\.|\s*$)/i,
      /(?:spent|paid|debited).*?(?:at|to|for)\s+([A-Za-z0-9\s]+)/i,
    ];
    let merchant = 'Unknown';
    for (const pattern of merchantPatterns) {
      const match = smsText.match(pattern);
      if (match) { merchant = match[1].trim(); break; }
    }

    const isCredit = /credited|received|refund/i.test(smsText);
    const paymentMode: PaymentMode = /upi/i.test(smsText) ? 'UPI' : /credit\s*card/i.test(smsText) ? 'Credit Card' : /debit\s*card/i.test(smsText) ? 'Debit Card' : /neft|imps|net\s*banking/i.test(smsText) ? 'Net Banking' : 'UPI';

    let category: Category = 'Other';
    const lowerMerchant = merchant.toLowerCase();
    if (/swiggy|zomato|food|restaurant|cafe|dominos/i.test(lowerMerchant)) category = 'Food';
    else if (/uber|ola|metro|petrol|fuel/i.test(lowerMerchant)) category = 'Transport';
    else if (/amazon|flipkart|myntra|shopping/i.test(lowerMerchant)) category = 'Shopping';
    else if (/electricity|water|gas|broadband|jio|airtel/i.test(lowerMerchant)) category = 'Bills';
    else if (/netflix|spotify|hotstar|prime/i.test(lowerMerchant)) category = 'Entertainment';

    if (amount > 0 && !isCredit) {
      setForm({ ...form, merchant, amount: String(amount), category, paymentMode });
      setMode('manual');
      toast.success(`Parsed: ₹${amount} at ${merchant}`);
    } else {
      toast.error('Could not parse SMS. Please enter manually.');
    }
  };

  const handleSubmit = () => {
    if (!form.merchant || !form.amount) {
      toast.error('Please fill merchant and amount');
      return;
    }
    const amount = Number(form.amount);
    if (isDuplicate(amount, form.merchant, form.date)) {
      toast.error('Duplicate transaction detected!');
      return;
    }
    addTransaction({
      amount,
      date: form.date,
      merchant: form.merchant,
      category: form.category,
      paymentMode: form.paymentMode,
      source: 'manual' as TransactionSource,
      isSplit: false,
      userShare: amount,
      isIgnored: false,
      groupId: null,
      splits: [],
      note: form.note,
    });
    toast.success('Expense added!');
    navigate('/transactions');
  };

  return (
    <div className="px-4 pt-14 safe-bottom">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-foreground">Add Expense</h1>
      </div>

      {/* AI SMS Engine Link */}
      <button
        onClick={() => navigate('/sms-engine')}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 mb-5"
      >
        <MessageSquare className="w-5 h-5 text-primary" />
        <div className="text-left flex-1">
          <span className="text-sm font-semibold text-primary">AI SMS Engine</span>
          <p className="text-[10px] text-muted-foreground">Auto-scan bank messages & add to ledger</p>
        </div>
        <span className="text-xs text-primary font-bold">→</span>
      </button>

      {/* Input Mode Selector */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { key: 'manual', icon: Keyboard, label: 'Manual' },
          { key: 'sms', icon: MessageSquare, label: 'Paste SMS' },
          { key: 'camera', icon: Camera, label: 'Camera' },
          { key: 'image', icon: Image, label: 'Upload' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'camera') { handleImageCapture('camera'); return; }
              if (key === 'image') { handleImageCapture('gallery'); return; }
              setMode(key as 'manual' | 'sms');
            }}
            className={`glass-card p-3 flex flex-col items-center gap-1.5 transition-all ${mode === key ? 'border-primary glow' : 'border-border/50'}`}
          >
            <Icon className={`w-5 h-5 ${mode === key ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] font-medium ${mode === key ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
          </button>
        ))}
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-4 rounded-xl overflow-hidden border border-border/50">
          <img src={imagePreview} alt="Receipt" className="w-full max-h-48 object-cover" />
          <div className="px-3 py-2 bg-secondary/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">AI scanning receipt...</span>
          </div>
        </div>
      )}

      {/* SMS Parser */}
      {mode === 'sms' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            placeholder="Paste your bank SMS here...&#10;e.g. Rs.450 debited from A/c for Swiggy via UPI"
            rows={4}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary resize-none"
          />
          <button onClick={parseSms} className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl mt-3">
            🧠 Parse with AI
          </button>
        </motion.div>
      )}

      {/* Manual Form */}
      {mode === 'manual' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Merchant</label>
            <input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="e.g. Swiggy, Amazon" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full bg-secondary rounded-xl px-4 py-3 text-2xl font-bold text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none border border-border focus:border-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setForm({ ...form, category: c })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.category === c ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  {CATEGORY_EMOJI[c]} {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Payment Mode</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} onClick={() => setForm({ ...form, paymentMode: m })} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.paymentMode === m ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Note (optional)</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Add a note..." className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary" />
          </div>

          <button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl text-base">
            Add Expense
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AddExpense;
