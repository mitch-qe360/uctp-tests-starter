// The learner's own AI, called from the runner on their laptop (Charter360 › Generate / Review, 2026-11-06).
// The key comes with each request from the learner's browser and is never written to disk or logged.
// Only these four hosts can be reached, so the runner can't be used to call anything else.
export const AI_PROVIDERS = {
  gemini: { label: 'Gemini', model: 'gemini-2.5-flash' },
  anthropic: { label: 'Anthropic (Claude)', model: 'claude-sonnet-5-5' },
  openai: { label: 'ChatGPT (OpenAI)', model: 'gpt-5' },
  kimi: { label: 'Kimi (Moonshot)', model: 'kimi-k2-turbo-preview' },
};

function request(provider, { model, key, system, user, json }) {
  if (provider === 'gemini') {
    const body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 65536, temperature: 0.2, ...(json ? { responseMimeType: 'application/json' } : {}) } };
    return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      headers: { 'x-goog-api-key': key }, body,
      read: d => (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('') };
  }
  if (provider === 'anthropic') {
    return { url: 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: { model, max_tokens: 32000, system, messages: [{ role: 'user', content: user }] },
      read: d => (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('') };
  }
  const url = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.moonshot.ai/v1/chat/completions';
  return { url, headers: { Authorization: `Bearer ${key}` },
    body: { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...(json ? { response_format: { type: 'json_object' } } : {}) },
    read: d => d.choices?.[0]?.message?.content || '' };
}

// Resolves { ok: true, text } or { ok: false, status, error } (the provider's own message). Never throws.
export async function askAi(input, { fetchImpl = fetch, timeoutMs = 5 * 60 * 1000 } = {}) {
  const p = AI_PROVIDERS[input.provider];
  if (!p) return { ok: false, status: 400, error: `provider must be one of: ${Object.keys(AI_PROVIDERS).join(', ')}.` };
  const key = String(input.key || '');
  if (!/^[\x21-\x7e]{10,300}$/.test(key)) return { ok: false, status: 400, error: 'Add your API key in Environment settings › My AI.' };
  const model = String(input.model || p.model);
  if (!/^[A-Za-z0-9._:-]{2,80}$/.test(model)) return { ok: false, status: 400, error: 'The model name looks wrong.' };
  const system = String(input.system || ''), user = String(input.user || '');
  if (!user.trim()) return { ok: false, status: 400, error: 'Nothing to send.' };
  const r = request(input.provider, { model, key, system, user, json: input.json === true });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(r.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...r.headers },
      body: JSON.stringify(r.body), signal: ctl.signal });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = d.error?.message || d.message || (typeof d.error === 'string' ? d.error : '') || `${p.label} answered ${res.status}.`;
      return { ok: false, status: res.status, error: String(msg).slice(0, 500) };
    }
    const text = r.read(d);
    return text ? { ok: true, text } : { ok: false, status: 502, error: `${p.label} sent back nothing. Try again.` };
  } catch (e) {
    return { ok: false, status: 504, error: e.name === 'AbortError' ? `${p.label} took too long. Try again.` : `Couldn't reach ${p.label}. Check your connection.` };
  } finally { clearTimeout(timer); }
}
