// BLACK SWAN LABS — AGENT 4: THE DELIVERER
const FIREBASE_URL = 'YOUR_FIREBASE_URL';
const TWILIO_SID   = 'YOUR_TWILIO_SID';
const TWILIO_TOKEN = 'YOUR_TWILIO_TOKEN';
const TWILIO_FROM  = 'YOUR_TWILIO_NUMBER';
const WILSON_PHONE = 'YOUR_PHONE_NUMBER';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Agent 4 live 🦢', { status: 200 });
    try {
      const { leadId, lead, vapiConfig } = await request.json();
      const billingDate = new Date();
      billingDate.setDate(billingDate.getDate() + 30);
      const goLiveMessage = `Your agent is live 🦢\n\n${lead.business_name} now answers every call 24/7.\n\nPhone: ${lead.phone}\nFirst billing: ${billingDate.toLocaleDateString()}\n\nQuestions? Reply here anytime. Welcome to Black Swan Labs.`;
      await sendSMS(WILSON_PHONE, `🦢 LIVE\n\n${lead.name} | ${lead.business_name} | ${lead.business_type}\n\nBilling starts ${billingDate.toLocaleDateString()}`);
      await fetch(`${FIREBASE_URL}/leads/${leadId}.json`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LIVE', go_live_date: new Date().toISOString(), billing_date: billingDate.toISOString(), updated_at: new Date().toISOString() })
      });
      return new Response(JSON.stringify({ status: 'live', leadId, goLiveMessage }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};

async function sendSMS(to, body) {
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body })
  });
}
