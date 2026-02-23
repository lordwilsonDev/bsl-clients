// ============================================================
// BLACK SWAN LABS — AGENT 2: THE QUALIFIER
// Cloudflare Worker — Google AI Studio Gemini FREE
// 1 million tokens/day — qualifies leads automatically
// ============================================================

const FIREBASE_URL   = 'YOUR_FIREBASE_URL';
const GEMINI_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_KEY';
const AGENT3_URL     = 'YOUR_AGENT3_WORKER_URL';
const GEMINI_MODEL   = 'gemini-1.5-flash';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Agent 2 live 🦢', { status: 200 });
    try {
      const { leadId, lead, response } = await request.json();

      if (!response) {
        const message = `Hey ${lead.name} — you're in 🦢\n\nI need 5 quick things:\n1. Business name\n2. Your phone number\n3. Business hours\n4. Top 5 questions your customers ask\n5. When a lead calls — collect info / book appointment / give quote / transfer to cell?`;
        await patch(leadId, { status: 'CONTACTED', updated_at: new Date().toISOString() });
        return new Response(JSON.stringify({ status: 'onboarding_sent', message, leadId }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const extracted = await extractWithGemini(lead.name, response);
      if (!extracted.complete) {
        return new Response(JSON.stringify({ status: 'needs_more_info', followup: extracted.followup, leadId }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await patch(leadId, { status: 'QUALIFIED', ...extracted, qualified_at: new Date().toISOString(), updated_at: new Date().toISOString() });

      await fetch(AGENT3_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, lead: { ...lead, ...extracted } })
      });

      return new Response(JSON.stringify({
        status: 'qualified',
        wilsonAlert: `🔥 READY TO CLOSE\n\n${lead.name} | ${extracted.business_name} | ${extracted.business_type}\n\nSend Buy Me A Coffee link NOW 🦢`,
        leadId
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};

async function extractWithGemini(name, responseText) {
  const prompt = `Extract business onboarding info from this response by ${name}: "${responseText}"\nReturn JSON only: { complete (bool), business_name, business_type, phone, hours, faqs (array), call_action, followup (if incomplete) }`;
  const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } })
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function patch(leadId, updates) {
  await fetch(`${FIREBASE_URL}/leads/${leadId}.json`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
  });
}
