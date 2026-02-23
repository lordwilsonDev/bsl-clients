// ============================================================
// BLACK SWAN LABS — AGENT 1: THE WATCHER
// Cloudflare Worker — free tier, 100k requests/day
// Catches leads from any platform, logs to Firebase
// Wakes Agent 2 immediately
// ============================================================

const TRIGGER_KEYWORDS = [
  'agent', 'missing calls', 'voicemail', "can't answer",
  'losing customers', 'need a receptionist', 'missed a call',
  'too busy to answer', 'losing leads', 'answering service'
];

const FIREBASE_URL = 'YOUR_FIREBASE_URL';
const AGENT2_URL   = 'YOUR_AGENT2_WORKER_URL';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Black Swan Labs Watcher is live 🦢', { status: 200 });
    }
    try {
      const body      = await request.json();
      const message   = (body.message || body.text || body.comment || body.content || '').toLowerCase();
      const name      = body.name     || body.username || body.sender || 'Unknown';
      const platform  = body.platform || body.source   || 'Unknown';
      const contact   = body.contact  || body.email    || body.phone  || '';
      const triggered = TRIGGER_KEYWORDS.find(kw => message.includes(kw));

      if (!triggered) {
        return new Response(JSON.stringify({ status: 'no_trigger' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const lead = {
        name, platform, contact,
        original_message: body.message || body.text || body.comment || '',
        trigger_keyword:  triggered,
        status:           'NEW',
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      };

      const firebaseRes  = await fetch(`${FIREBASE_URL}/leads.json`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead)
      });
      const firebaseData = await firebaseRes.json();
      const leadId       = firebaseData.name;

      await fetch(AGENT2_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, lead })
      });

      return new Response(JSON.stringify({ status: 'lead_captured', leadId, trigger: triggered, name }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};
