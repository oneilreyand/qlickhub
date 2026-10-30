import { env } from '../../config/env.js';

/** The AI could not produce a usable answer (not configured, network error, or invalid output). */
export class FeatureSpecAiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeatureSpecAiUnavailableError';
  }
}

export interface FeatureSpecAiRequest {
  system: string;
  prompt: string;
  /** Gemini response schema (OpenAPI subset) so the model returns JSON of the expected shape. */
  responseSchema: Record<string, unknown>;
}

/** Narrow port so tests can inject a fake instead of calling Gemini. */
export interface FeatureSpecAiClient {
  generateJson(request: FeatureSpecAiRequest): Promise<unknown>;
}

const REQUEST_TIMEOUT_MS = 30000;

/** Uses the same Gemini key and model as the AI Task Generator (`GEMINI_API_KEY`, `GEMINI_MODEL`). */
export class GeminiFeatureSpecAiClient implements FeatureSpecAiClient {
  async generateJson(request: FeatureSpecAiRequest): Promise<unknown> {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new FeatureSpecAiUnavailableError('AI is not configured on this server.');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: request.responseSchema,
            temperature: 0.3,
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new FeatureSpecAiUnavailableError('The AI service did not respond. Try again.');
    }
    if (!response.ok) {
      throw new FeatureSpecAiUnavailableError(`The AI service returned status ${response.status}.`);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new FeatureSpecAiUnavailableError('The AI service returned no content.');
    try {
      return JSON.parse(rawText);
    } catch {
      throw new FeatureSpecAiUnavailableError('The AI service returned unreadable content.');
    }
  }
}
