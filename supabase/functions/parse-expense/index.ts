import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CATEGORIES = ['Food','Transport','Shopping','Bills','Rent','Entertainment','Health','SIP','Travel','Education','Other'];
const PAYMENT_MODES = ['UPI','Credit Card','Debit Card','Cash','Net Banking'];

const expenseSchema = {
  type: 'object',
  properties: {
    merchant: { type: 'string' },
    amount: { type: 'number' },
    date: { type: 'string', description: 'YYYY-MM-DD format' },
    category: { type: 'string', enum: CATEGORIES },
    paymentMode: { type: 'string', enum: PAYMENT_MODES },
    note: { type: 'string' },
  },
  required: ['merchant', 'amount', 'category', 'paymentMode'],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { mode, text, imageBase64 } = await req.json();
    if (!['sms', 'receipt', 'statement'].includes(mode)) {
      return new Response(JSON.stringify({ error: 'Invalid mode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isMulti = mode === 'statement';
    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = isMulti
      ? `You are a financial document parser. Extract ALL debit/expense line items from the provided bank or credit card account statement image. Ignore credits/refunds/deposits. For each expense, infer the most appropriate category from: ${CATEGORIES.join(', ')} and payment mode from: ${PAYMENT_MODES.join(', ')}. Dates must be YYYY-MM-DD. If year is missing, assume current year. Be accurate; do not invent transactions.`
      : `You are a financial transaction parser. Extract a single expense from the ${mode === 'sms' ? 'bank SMS text' : 'receipt image'}. Infer the most appropriate category from: ${CATEGORIES.join(', ')} and payment mode from: ${PAYMENT_MODES.join(', ')}. Date must be YYYY-MM-DD; if missing use ${today}. Be accurate and do not invent details. If the SMS is a credit/refund/non-expense, set amount to 0.`;

    const userContent: any[] = [];
    if (text) userContent.push({ type: 'text', text });
    if (imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` },
      });
    }
    if (userContent.length === 0) userContent.push({ type: 'text', text: 'No input provided' });

    const toolName = isMulti ? 'extract_expenses' : 'extract_expense';
    const parameters = isMulti
      ? {
          type: 'object',
          properties: { expenses: { type: 'array', items: expenseSchema } },
          required: ['expenses'],
          additionalProperties: false,
        }
      : expenseSchema;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        tools: [{
          type: 'function',
          function: {
            name: toolName,
            description: isMulti ? 'Return all extracted expenses' : 'Return the single extracted expense',
            parameters,
          },
        }],
        tool_choice: { type: 'function', function: { name: toolName } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in Workspace Settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI gateway error', resp.status, errText);
      return new Response(JSON.stringify({ error: 'AI parsing failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: 'No structured output returned' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('parse-expense error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});