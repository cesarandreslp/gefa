/**
 * Cliente IA multiproveedor. Unifica la llamada de chat por `fetch` para no atar el
 * dominio a un SDK. Soporta GROQ y OpenAI (esquema OpenAI-compatible), Anthropic
 * (Claude) y Google (Gemini). La config viene del tenant.
 *
 * RESPALDO AUTOMÁTICO: si el proveedor principal falla, se reintenta con la cadena
 * de respaldo (proveedor secundario configurado → GROQ por `groqApiKey` → claves de
 * entorno). Así, con dos proveedores configurados, si uno cae el otro responde.
 */

export interface AIConfig {
  provider?: string | null;  // GROQ | ANTHROPIC | OPENAI | GEMINI
  apiKey?: string | null;
  model?: string | null;
  groqApiKey?: string | null; // fallback legacy
  // Proveedor de respaldo (opcional): si el principal falla, se usa éste.
  providerSecondary?: string | null;
  apiKeySecondary?: string | null;
  modelSecondary?: string | null;
}

export interface AICallInput {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

interface Candidate { provider: string; apiKey: string; model: string }

const DEFAULT_MODELS: Record<string, string> = {
  GROQ: 'llama-3.3-70b-versatile',
  ANTHROPIC: 'claude-sonnet-4-6',
  OPENAI: 'gpt-4o-mini',
  GEMINI: 'gemini-2.0-flash',
};

const ENV_KEYS: Record<string, string | undefined> = {
  GROQ: process.env.GROQ_API_KEY,
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  OPENAI: process.env.OPENAI_API_KEY,
  GEMINI: process.env.GEMINI_API_KEY,
};

/**
 * Construye la cadena ordenada de proveedores a intentar (principal → respaldo →
 * GROQ legacy → entorno), sin duplicar el mismo proveedor+clave.
 */
function buildChain(cfg: AIConfig): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const add = (provider?: string | null, apiKey?: string | null, model?: string | null) => {
    const p = (provider || '').toUpperCase();
    if (!p || !apiKey) return;
    const key = `${p}:${apiKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ provider: p, apiKey, model: model || DEFAULT_MODELS[p] || DEFAULT_MODELS.GROQ });
  };

  // 1. Principal (si no se indica proveedor pero hay groqApiKey, es GROQ).
  const mainProvider = cfg.provider || (cfg.groqApiKey ? 'GROQ' : null);
  const mainKey = cfg.apiKey || (String(mainProvider).toUpperCase() === 'GROQ' ? cfg.groqApiKey : null);
  add(mainProvider, mainKey, cfg.model);

  // 2. Respaldo explícito del tenant.
  add(cfg.providerSecondary, cfg.apiKeySecondary, cfg.modelSecondary);

  // 3. GROQ por la key legacy del tenant.
  add('GROQ', cfg.groqApiKey, null);

  // 4. Claves de entorno (respaldo del sistema).
  for (const p of Object.keys(ENV_KEYS)) add(p, ENV_KEYS[p], null);

  return out;
}

export function aiIsConfigured(cfg: AIConfig): boolean {
  return buildChain(cfg).length > 0;
}

/** Una sola llamada a un proveedor concreto. */
async function callOne(c: Candidate, input: AICallInput, maxTokens: number, temperature: number): Promise<string> {
  const { provider, apiKey, model } = c;

  if (provider === 'ANTHROPIC') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature, system: input.system, messages: [{ role: 'user', content: input.user }] }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    return (json?.content?.[0]?.text ?? '').trim();
  }

  if (provider === 'GEMINI') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: input.system }] },
        contents: [{ role: 'user', parts: [{ text: input.user }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    return (Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('') : '').trim();
  }

  // GROQ y OpenAI comparten el esquema OpenAI-compatible.
  const baseUrl = provider === 'OPENAI' ? 'https://api.openai.com/v1' : 'https://api.groq.com/openai/v1';
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: maxTokens, temperature,
      messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.user }],
    }),
  });
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return (json?.choices?.[0]?.message?.content ?? '').trim();
}

/**
 * Llama a la IA con respaldo automático: intenta los proveedores de la cadena en
 * orden hasta que uno responda. Si todos fallan, lanza el último error.
 */
export async function callAI(cfg: AIConfig, input: AICallInput): Promise<string> {
  const chain = buildChain(cfg);
  if (chain.length === 0) {
    throw new Error('IA no configurada para esta entidad. Configure el proveedor y la API key en Entidad → Inteligencia Artificial.');
  }
  const maxTokens = input.maxTokens ?? 1200;
  const temperature = input.temperature ?? 0.3;

  let lastError: unknown = null;
  for (const c of chain) {
    try {
      const out = await callOne(c, input, maxTokens, temperature);
      if (out) return out;
      lastError = new Error(`${c.provider} no devolvió contenido`);
    } catch (e) {
      lastError = e;
      console.error(`[IA] Falló ${c.provider}; intentando respaldo…`, e instanceof Error ? e.message : e);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Todos los proveedores de IA fallaron');
}
