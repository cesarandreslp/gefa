/**
 * Cliente IA multiproveedor (Fase C3). Unifica la llamada de chat por `fetch`
 * para no atar el dominio a un SDK. Soporta GROQ (OpenAI-compatible) y Anthropic.
 * La config viene del tenant (`aiProvider`/`aiApiKey`/`aiModel`), con fallback a
 * GROQ usando `groqApiKey` o la variable de entorno.
 */

export interface AIConfig {
  provider?: string | null;  // GROQ | ANTHROPIC | OPENAI
  apiKey?: string | null;
  model?: string | null;
  groqApiKey?: string | null; // fallback legacy
}

export interface AICallInput {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_MODELS: Record<string, string> = {
  GROQ: 'llama-3.3-70b-versatile',
  ANTHROPIC: 'claude-sonnet-4-6',
  OPENAI: 'gpt-4o-mini',
  GEMINI: 'gemini-2.0-flash',
};

function resolveConfig(cfg: AIConfig): { provider: string; apiKey: string; model: string } {
  const provider = (cfg.provider || (cfg.groqApiKey ? 'GROQ' : process.env.AI_PROVIDER) || 'GROQ').toUpperCase();
  const apiKey =
    cfg.apiKey ||
    (provider === 'GROQ' ? cfg.groqApiKey || process.env.GROQ_API_KEY : undefined) ||
    (provider === 'ANTHROPIC' ? process.env.ANTHROPIC_API_KEY : undefined) ||
    (provider === 'OPENAI' ? process.env.OPENAI_API_KEY : undefined) ||
    (provider === 'GEMINI' ? process.env.GEMINI_API_KEY : undefined) ||
    '';
  const model = cfg.model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.GROQ;
  return { provider, apiKey, model };
}

export function aiIsConfigured(cfg: AIConfig): boolean {
  return !!resolveConfig(cfg).apiKey;
}

export async function callAI(cfg: AIConfig, input: AICallInput): Promise<string> {
  const { provider, apiKey, model } = resolveConfig(cfg);
  if (!apiKey) {
    throw new Error('IA no configurada para esta entidad. Configure el proveedor y la API key en Entidad → Integración IA.');
  }
  const maxTokens = input.maxTokens ?? 1200;
  const temperature = input.temperature ?? 0.3;

  if (provider === 'ANTHROPIC') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: input.system,
        messages: [{ role: 'user', content: input.user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    return (json?.content?.[0]?.text ?? '').trim();
  }

  if (provider === 'GEMINI') {
    // Google Gemini (Generative Language API). Esquema propio.
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
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return (json?.choices?.[0]?.message?.content ?? '').trim();
}
