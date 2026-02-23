// ============================================================
// BLACK SWAN LABS — AGENT 3: THE BUILDER
// NVIDIA Build (Deepseek V3) — industry research FREE
// Google AI Studio (Gemini) — Vapi config builder FREE
// Pushes client config to GitHub automatically
// GATE: does NOT build until payment confirmed
// ============================================================

const FIREBASE_URL   = 'YOUR_FIREBASE_URL';
const GEMINI_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_KEY';
const NVIDIA_API_KEY = 'YOUR_NVIDIA_BUILD_KEY';
const AGENT4_URL     = 'YOUR_AGENT4_WORKER_URL';
const GITHUB_TOKEN   = 'YOUR_GITHUB_TOKEN';
const GITHUB_OWNER   = 'lordwilsonDev';
const GITHUB_REPO    = 'bsl-clients';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Agent 3 live 🦢', { status: 200 });
    try {
      const { leadId, lead, payment_confirmed } = await request.json();

      if (!payment_confirmed) {
        await patch(leadId, { status: 'WAITING_PAYMENT', updated_at: new Date().toISOString() });
        return new Response(JSON.stringify({ status: 'waiting_payment' }), { headers: { 'Content-Type': 'application/json' } });
      }

      await patch(leadId, { status: 'BUILDING', updated_at: new Date().toISOString() });

      const research   = await researchWithDeepseek(lead.business_type, lead.business_name);
      const vapiConfig = await buildVapiConfig(lead, research);

      await pushToGitHub(lead, vapiConfig, research);

      await patch(leadId, { status: 'BUILT', research, vapi_config: vapiConfig, built_at: new Date().toISOString(), updated_at: new Date().toISOString() });

      await fetch(AGENT4_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, lead, vapiConfig })
      });

      return new Response(JSON.stringify({ status: 'built', leadId, vapiConfig }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};

async function pushToGitHub(lead, vapiConfig, research) {
  const slug    = lead.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const date    = new Date().toISOString().split('T')[0];
  const headers = { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'BSL-Agent3' };
  const files   = [
    { path: `clients/${slug}/vapi_config.json`, content: JSON.stringify(vapiConfig, null, 2) },
    { path: `clients/${slug}/research.json`,    content: JSON.stringify(research, null, 2) },
    { path: `clients/${slug}/README.md`,        content: `# ${lead.business_name}\n\nIndustry: ${lead.business_type}\nPhone: ${lead.phone}\nHours: ${lead.hours}\nBuilt: ${date}\n\n## Call Action\n${lead.call_action}\n\n## Agent Greeting\n${vapiConfig.greeting || ''}` },
  ];
  for (const f of files) {
    await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${f.path}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ message: `🦢 ${lead.business_name} agent built`, content: btoa(f.content) })
    });
  }
}

async function researchWithDeepseek(businessType, businessName) {
  const res  = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-ai/deepseek-v3', messages: [{ role: 'user', content: `AI phone agent best practices for ${businessType} business (${businessName}). Return JSON: { common_questions, call_flow, tone, objections, collect_info }` }], temperature: 0.2, max_tokens: 1024 })
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { return { raw: text }; }
}

async function buildVapiConfig(lead, research) {
  const prompt = `Build Vapi AI phone agent config for ${lead.business_name} (${lead.business_type}). Hours: ${lead.hours}. Call action: ${lead.call_action}. FAQs: ${JSON.stringify(lead.faqs)}. Research: ${JSON.stringify(research)}. Return JSON: { greeting, system_prompt, faq_responses, end_of_call_summary, voice_style }`;
  const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } })
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { return { raw: text }; }
}

async function patch(leadId, updates) {
  await fetch(`${FIREBASE_URL}/leads/${leadId}.json`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
  });
}
