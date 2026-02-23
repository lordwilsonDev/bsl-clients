// BLACK SWAN LABS — PAYMENT WEBHOOK
// Buy Me A Coffee fires this → matches lead → builds
const FIREBASE_URL = 'YOUR_FIREBASE_URL';
const AGENT3_URL   = 'YOUR_AGENT3_WORKER_URL';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Payment webhook live 🦢', { status: 200 });
    try {
      const body       = await request.json();
      const payerName  = body.supporter_name  || body.name  || '';
      const payerEmail = body.supporter_email || body.email || '';
      const amount     = body.amount || 0;
      const leadsRes   = await fetch(`${FIREBASE_URL}/leads.json`);
      const leadsData  = await leadsRes.json();
      if (!leadsData) return new Response(JSON.stringify({ status: 'no_leads' }), { status: 200 });
      let matchedLeadId = null, matchedLead = null;
      for (const [id, lead] of Object.entries(leadsData)) {
        if (lead.name?.toLowerCase().includes(payerName.toLowerCase()) || lead.contact?.toLowerCase() === payerEmail.toLowerCase()) {
          matchedLeadId = id; matchedLead = lead; break;
        }
      }
      if (!matchedLeadId) {
        await fetch(`${FIREBASE_URL}/unmatched_payments.json`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payer_name: payerName, payer_email: payerEmail, amount, received_at: new Date().toISOString() })
        });
        return new Response(JSON.stringify({ status: 'unmatched_logged' }), { status: 200 });
      }
      await fetch(`${FIREBASE_URL}/leads/${matchedLeadId}.json`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', payment_amount: amount, payment_confirmed: new Date().toISOString(), updated_at: new Date().toISOString() })
      });
      await fetch(AGENT3_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: matchedLeadId, lead: matchedLead, payment_confirmed: true })
      });
      return new Response(JSON.stringify({ status: 'payment_confirmed', leadId: matchedLeadId }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};
