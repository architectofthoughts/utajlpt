// Gemini API 호출 헬퍼 — 백엔드 프록시 /api/gemini 통해서.
// 로그인 안 된 상태면 401.

export interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: unknown;
  modelVersion?: string;
}

export interface GeminiCallOptions {
  model?: string;
  apiVersion?: string;
  generationConfig?: Record<string, unknown>;
}

const DEFAULT_MODEL = 'gemini-3-flash-preview';

export async function callGemini(
  contents: unknown,
  opts: GeminiCallOptions = {}
): Promise<GeminiResponse> {
  const model = opts.model ?? DEFAULT_MODEL;
  const apiVersion = opts.apiVersion ?? (model.includes('gemini-3') ? 'v1alpha' : 'v1beta');

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, apiVersion, contents, generationConfig: opts.generationConfig ?? {} }),
    credentials: 'same-origin'
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || err.error || `HTTP ${response.status}`;
    throw new Error(`Gemini ${response.status}: ${msg}`);
  }

  return response.json();
}

export function extractText(res: GeminiResponse): string {
  const text = res.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답에 텍스트가 없어.');
  return text;
}
