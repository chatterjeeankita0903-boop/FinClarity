import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Keyboard, MessageSquare, ArrowLeft, Image, Loader2 } from 'lucide-react';
import { Category, PaymentMode, TransactionSource } from '@/store/useStore';
import { useStore } from '@/store/useStore';
import { useAddTransaction, useTransactions } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Entertainment', 'Health', 'SIP', 'Travel', 'Education', 'Other'];
const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕', Transport: '🚗', Shopping: '🛍️', Bills: '📃', Rent: '🏠',
  Entertainment: '🎬', Health: '💊', SIP: '📈', Travel: '✈️', Education: '📚', Other: '💰',
};

const AddExpense = () => {
  const navigate = useNavigate();
  const settings = useStore(s => s.settings);
  const addTransaction = useAddTransaction();
  const { data: transactions = [] } = useTransactions();
  const [mode, setMode] = useState<'manual' | 'sms' | 'camera' | 'image' | 'statement'>('manual');
  const [smsText, setSmsText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [form, setForm] = useState({
    merchant: '',
    amount: '',
    category: 'Food' as Category,
    paymentMode: 'UPI' as PaymentMode,
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const isDuplicate = (amount: number, merchant: string, date: string) => {
    return transactions.some(t =>
      t.amount === amount && t.merchant.toLowerCase() === merchant.toLowerCase() && t.date === date
    );
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const callParseExpense = async (payload: { mode: 'sms' | 'receipt' | 'statement'; text?: string; imageBase64?: string }) => {
    const { data, error } = await supabase.functions.invoke('parse-expense', { body: payload });
    if (error) throw new Error(error.message || 'AI request failed');
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleImageCapture = (source: 'camera' | 'gallery' | 'statement') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const base64 = await fileToBase64(file);
        setImagePreview(base64);
        setAiLoading(true);
        setAiStatus(source === 'statement' ? 'Parsing account statement…' : 'Extracting receipt details…');

        if (source === 'statement') {
          const result = await callParseExpense({ mode: 'statement', imageBase64: base64 });
          const expenses = (result?.expenses || []).filter((x: any) => x && Number(x.amount) > 0);
          if (expenses.length === 0) {
            toast.error('No expenses found in statement');
            return;
          }
          let added = 0;
          for (const ex of expenses) {
            const amount = Number(ex.amount);
            const date = ex.date || form.date;
            if (settings.duplicateDetection && isDuplicate(amount, ex.merchant, date)) continue;
            await new Promise<void>((resolve) => {
              addTransaction.mutate({
                amount, date, merchant: ex.merchant,
                category: (ex.category as Category) || 'Other',
                paymentMode: (ex.paymentMode as PaymentMode) || 'UPI',
                source: 'ocr' as TransactionSource,
                isSplit: false, userShare: amount, isIgnored: false,
                groupId: null, splits: [], note: ex.note || 'From statement',
              }, { onSuccess: () => { added++; resolve(); }, onError: () => resolve() });
            });
          }
          toast.success(`🧠 Added ${added} of ${expenses.length} transactions`);
          navigate('/transactions');
        } else {
          const ex = await callParseExpense({ mode: 'receipt', imageBase64: base64 });
          setForm({
            ...form,
            merchant: ex.merchant || '',
            amount: ex.amount ? String(ex.amount) : '',
            category: (ex.category as Category) || form.category,
            paymentMode: (ex.paymentMode as PaymentMode) || form.paymentMode,
            date: ex.date || form.date,
            note: ex.note || form.note,
          });
          setMode('manual');
          toast.success(`🧠 AI extracted: ₹${Number(ex.amount).toLocaleString('en-IN')} at ${ex.merchant}`);
        }
      } catch (err: any) {
        toast.error(err.message || 'AI extraction failed');
      } finally {
        setAiLoading(false);
        setAiStatus('');
      }
    };
    input.click();
  };

  const parseSms = async () => {
    if (!smsText.trim()) { toast.error('Paste an SMS first'); return; }
    try {
      setAiLoading(true);
      setAiStatus('Parsing SMS with AI…');
      const ex = await callParseExpense({ mode: 'sms', text: smsText });
      const amount = Number(ex.amount);
      if (!amount) { toast.error('This SMS does not look like an expense'); return; }
      setForm({
        ...form,
        merchant: ex.merchant || 'Unknown',
        amount: String(amount),
        category: (ex.category as Category) || 'Other',
        paymentMode: (ex.paymentMode as PaymentMode) || 'UPI',
        date: ex.date || form.date,
        note: ex.note || form.note,
      });
      setMode('manual');
      toast.success(`🧠 Parsed: ₹${amount.toLocaleString('en-IN')} at ${ex.merchant}`);
    } catch (err: any) {
      toast.error(err.message || 'AI parsing failed');
    } finally {
      setAiLoading(false);
      setAiStatus('');
    }
  };

  const handleSubmit = () => {
    if (!form.merchant || !form.amount) { toast.error('Please fill merchant and amount'); return; }
    const amount = Number(form.amount);
    if (settings.duplicateDetection && isDuplicate(amount, form.merchant, form.date)) { toast.error('Duplicate transaction detected!'); return; }
    addTransaction.mutate({
      amount, date: form.date, merchant: form.merchant, category: form.category,
      paymentMode: form.paymentMode, source: 'manual' as TransactionSource,
      isSplit: false, userShare: amount, isIgnored: false, groupId: null, splits: [], note: form.note,
    }, {
      onSuccess: () => { toast.success('Expense added!'); navigate('/transactions'); },
    });
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
            {aiLoading ? <Loader2 className="w-3 h-3 text-primary animate-spin" /> : <div className="w-2 h-2 rounded-full bg-primary" />}
            <span className="text-[10px] text-muted-foreground">{aiStatus || 'Ready'}</span>
          </div>
        </div>
      )}

      {mode === 'sms' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <textarea value={smsText} onChange={(e) => setSmsText(e.target.value)}
            placeholder="Paste your bank SMS here..."
            rows={3}
            className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary resize-none"
          />
          <button onClick={parseSms} disabled={aiLoading} className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-xl mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
            {aiLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {aiLoading ? 'Parsing…' : '🧠 Parse with AI'}
          </button>
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

          <button onClick={handleSubmit} disabled={addTransaction.isPending} className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-50">
            {addTransaction.isPending ? 'Adding...' : 'Add Expense'}
          </button>
        </motion.div>
      )}

      <div className={`grid gap-2 mt-3`} style={{ gridTemplateColumns: `repeat(${inputModes.length}, 1fr)` }}>
        {inputModes.map(({ key, icon: Icon, label }) => (
          <button key={key}
            onClick={() => {
            if (key === 'camera') { handleImageCapture('camera'); return; }
            if (key === 'image') { handleImageCapture('gallery'); return; }
            setMode(key as 'manual' | 'sms');
            }}
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
