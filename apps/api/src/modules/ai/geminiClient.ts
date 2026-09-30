import dns from 'node:dns';
import { env } from '../../config/env.js';
import {
  GenerateTaskDraftResponse,
  GeneratedTaskClarificationSchema,
  GeneratedTaskDraftSchema,
  TargetPlatform,
} from '@qlick/contracts';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

function promptCitation(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, ' ');
  return {
    sourceType: 'user_prompt' as const,
    label: 'Prompt Product Owner' as const,
    excerpt: normalized.slice(0, 500),
  };
}

/**
 * Reject only clearly machine-like text locally. Less obvious ambiguity is
 * deliberately delegated to Gemini so valid short or domain-specific prompts
 * are not blocked by a brittle dictionary check.
 */
export function isObviouslyUnintelligiblePrompt(prompt: string): boolean {
  const words = prompt.toLocaleLowerCase('id-ID').match(/[\p{L}\p{N}]+/gu) || [];
  const letters = words.join('').replace(/[^\p{L}]/gu, '');
  if (letters.length < 24 || words.length < 3) return false;

  const vowelCount = (letters.match(/[aiueo]/giu) || []).length;
  const vowelRatio = vowelCount / letters.length;
  const opaqueLongWordCount = words.filter((word) => {
    if (word.length < 8) return false;
    const wordVowelCount = (word.match(/[aiueo]/giu) || []).length;
    return wordVowelCount / word.length <= 0.2;
  }).length;

  return vowelRatio < 0.18 && opaqueLongWordCount >= 2;
}

export function buildPromptClarification(prompt: string): GenerateTaskDraftResponse {
  return {
    outcome: 'clarification',
    clarification: {
      message:
        'Saya belum dapat memahami kebutuhan produk dari prompt ini, sehingga belum aman membuat draf Feature.',
      questions: [
        'Fitur atau masalah apa yang ingin diselesaikan?',
        'Siapa pengguna yang terdampak dan hasil apa yang mereka butuhkan?',
        'Sebutkan alur utama, aturan penting, atau batasan yang perlu dipenuhi.',
      ],
      citations: [promptCitation(prompt)],
    },
  };
}

/**
 * Deterministic fixture-like draft used only by the automated test environment.
 */
export function buildDeterministicFallbackDraft(
  prompt: string,
  targetPlatforms: TargetPlatform[] = ['web', 'backend', 'qa'],
): GenerateTaskDraftResponse {
  if (isObviouslyUnintelligiblePrompt(prompt)) {
    return buildPromptClarification(prompt);
  }

  const cleanPrompt = prompt.trim();
  const title = cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 47)}...` : cleanPrompt;

  const subtasks = [];
  if (targetPlatforms.includes('web') || targetPlatforms.includes('fullstack')) {
    subtasks.push({
      title: `FE: Implementasi antarmuka ${title}`,
      description: `Menyediakan komponen UI, form interaksi, dan integrasi API untuk ${title}.`,
      deliveryArea: 'frontend' as const,
      priority: 'medium' as const,
      enabled: true,
    });
  }
  if (targetPlatforms.includes('backend')) {
    subtasks.push({
      title: `BE: Implementasi API endpoint & data persistence ${title}`,
      description: `Menyediakan endpoint REST terautentikasi, validasi schema Zod, dan model Sequelize untuk ${title}.`,
      deliveryArea: 'backend' as const,
      priority: 'high' as const,
      enabled: true,
    });
  }
  if (targetPlatforms.includes('mobile')) {
    subtasks.push({
      title: `Mobile: Implementasi layar & service ${title}`,
      description: `Menyediakan antarmuka mobile responsif dan state management untuk ${title}.`,
      deliveryArea: 'mobile' as const,
      priority: 'medium' as const,
      enabled: true,
    });
  }
  if (targetPlatforms.includes('qa')) {
    subtasks.push({
      title: `QA: Skenario pengujian, Test Case & UAT ${title}`,
      description: `Menyusun Test Case terverifikasi, pengujian skenario positif/negatif, dan verifikasi kriteria penerimaan.`,
      deliveryArea: 'qa' as const,
      priority: 'medium' as const,
      enabled: true,
    });
  }

  return {
    outcome: 'draft',
    draft: {
      task: {
        title,
        description: `## Ringkasan Fitur\n${cleanPrompt}\n\n### Tujuan Pengiriman\nMemberikan solusi terpadu yang siap diuji dan dideploy sesuai standar mutu Qlick Hub.`,
        priority: 'medium',
      },
      productBrief: {
        context: `Permintaan produk untuk: ${cleanPrompt}. Dibuat otomatis melalui AI Generator untuk mempercepat proses perencanaan PO.`,
        inScope: [
          `Implementasi alur utama sesuai prompt: ${title}`,
          'Validasi input dan penanganan error standar',
          'Pelacakan aktivitas audit di sistem',
        ],
        outScope: [
          'Kustomisasi integrasi sistem pihak ketiga di luar lingkup',
          'Fitur batch berulang tingkat lanjut untuk fase berikutnya',
        ],
      },
      requirements: [
        {
          title: `Kebutuhan Fungsional: ${title}`,
          description: `Spesifikasi alur dan perilaku yang diharapkan untuk ${cleanPrompt}.`,
          acceptanceCriteria: [
            `Given pengguna terautentikasi, when mengakses fitur ${title}, then sistem merespons dengan data yang valid`,
            'Given input tidak valid, when disubmit, then sistem menampilkan pesan kesalahan yang ramah pengguna',
            'Given proses berhasil, when selesai, then perubahan tercatat dalam jejak aktivitas audit',
          ],
        },
      ],
      subtasks,
      citations: [promptCitation(cleanPrompt)],
      summary: `Draf berhasil di-generate dengan ${subtasks.length} subtask dan 1 requirement utama.`,
    },
  };
}

/**
 * Client for Google AI Studio / Gemini API.
 */
export class GeminiClient {
  private apiKey: string | undefined;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || env.GEMINI_API_KEY;
    this.model = model || env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async generateTaskDraft(
    prompt: string,
    targetPlatforms: TargetPlatform[] = ['web', 'backend', 'qa'],
  ): Promise<GenerateTaskDraftResponse> {
    if (isObviouslyUnintelligiblePrompt(prompt)) {
      return buildPromptClarification(prompt);
    }

    // Tests must be deterministic and never call an external provider.
    if (process.env.NODE_ENV === 'test') {
      return buildDeterministicFallbackDraft(prompt, targetPlatforms);
    }

    // A real runtime must fail closed instead of presenting fabricated planning data.
    if (!this.apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured on the server. Please configure GEMINI_API_KEY in your server environment (Google AI Studio: https://aistudio.google.com/).',
      );
    }

    const systemInstruction = `Anda adalah Senior Technical Product Owner dan QA Lead di platform Qlick Hub.
Sebelum membuat draf, nilai apakah prompt berisi kebutuhan produk yang dapat dipahami. Jika prompt berupa teks acak, tidak bermakna, atau tidak memiliki konteks yang cukup untuk membuat draf secara bertanggung jawab, jawab dengan outcome "clarification". Jangan mengarang Feature, Requirement, Acceptance Criteria, atau Subtask untuk prompt seperti itu.

Untuk outcome "clarification", isi clarification.message dengan alasan singkat dan clarification.questions dengan 1-4 pertanyaan konkret dalam Bahasa Indonesia. Jangan isi task, productBrief, requirements, atau subtasks.

Hanya jika kebutuhan dapat dipahami, jawab dengan outcome "draft" dan pecah menjadi rancangan pengiriman perangkat lunak yang lengkap dan terstruktur:
1. Task (Feature / Root Task):
   - title: Judul ringkas, profesional, dan to the point (maks 200 karakter).
   - description: Markdown deskriptif lengkap dengan tujuan bisnis dan gambaran arsitektur.
   - priority: 'low' | 'medium' | 'high' | 'urgent'.
2. Product Brief (Ringkasan Produk):
   - context: Latar belakang masalah, nilai bisnis, dan persona pengguna.
   - inScope: Daftar poin string fitur yang masuk dalam cakupan rilis ini.
   - outScope: Daftar poin string hal-hal yang ditunda / tidak dikerjakan di rilis ini.
3. Requirements (Spesifikasi Kebutuhan):
   - Minimal 1-3 kebutuhan fungsional spesifik.
   - Tiap requirement memiliki judul jelas dan acceptanceCriteria berupa daftar string kriteria pengujian (format Given-When-Then atau kalimat terukur).
4. Subtasks:
   - Breakdown tugas teknis yang dapat dieksekusi per peran.
   - Target area yang diminta: ${targetPlatforms.join(', ')}.
   - Tiap subtask wajib memiliki title, description, priority, dan deliveryArea ('frontend' | 'backend' | 'mobile' | 'fullstack' | 'qa').
Respon WAJIB dalam format JSON murni sesuai schema yang ditentukan.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        outcome: { type: 'STRING', enum: ['draft', 'clarification'] },
        task: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            priority: { type: 'STRING', enum: ['low', 'medium', 'high', 'urgent'] },
          },
          required: ['title', 'description', 'priority'],
        },
        productBrief: {
          type: 'OBJECT',
          properties: {
            context: { type: 'STRING' },
            inScope: { type: 'ARRAY', items: { type: 'STRING' } },
            outScope: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['context', 'inScope', 'outScope'],
        },
        requirements: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              acceptanceCriteria: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['title', 'acceptanceCriteria'],
          },
        },
        subtasks: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              deliveryArea: {
                type: 'STRING',
                enum: ['frontend', 'backend', 'mobile', 'fullstack', 'qa'],
              },
              priority: { type: 'STRING', enum: ['low', 'medium', 'high', 'urgent'] },
            },
            required: ['title', 'deliveryArea', 'priority'],
          },
        },
        clarification: {
          type: 'OBJECT',
          properties: {
            message: { type: 'STRING' },
            questions: { type: 'ARRAY', items: { type: 'STRING' } },
          },
        },
        summary: { type: 'STRING' },
      },
      required: ['outcome'],
    };

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Prompt PO:\n${prompt.trim()}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.2,
      },
    };

    const candidateModels = [
      this.model,
      this.model !== 'gemini-3.1-flash-lite-preview'
        ? 'gemini-3.1-flash-lite-preview'
        : 'gemini-2.5-flash',
    ];

    let lastError: Error | null = null;
    let json: any = null;

    for (const currentModel of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(30000),
          });

          if (response.ok) {
            json = (await response.json()) as any;
            break;
          }

          const errorText = await response.text();
          console.warn(
            `[GeminiClient] Model ${currentModel} (attempt ${attempt}/2) failed (${response.status}):`,
            errorText,
          );

          // Retryable status codes on Google AI Studio: 503 (High demand / unavailable), 429 (rate limit spike)
          const isRetryable = response.status === 503 || response.status === 429;
          if (isRetryable && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }

          lastError = new Error(
            response.status === 503
              ? 'Layanan Google AI Studio sedang mengalami lonjakan beban tinggi (503 High Demand). Silakan coba beberapa saat lagi.'
              : `Google AI Studio error (${response.status}): ${errorText}`,
          );

          if (isRetryable) {
            // Move to fallback candidate model
            break;
          } else {
            throw lastError;
          }
        } catch (err: any) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < 2 && err.name !== 'AbortError') {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }

      if (json) {
        break;
      }
    }

    if (!json) {
      throw (
        lastError || new Error('Google AI Studio tidak merespons setelah beberapa kali percobaan.')
      );
    }
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini did not return any candidate response text.');
    }

    const parsedJson = JSON.parse(rawText);
    if (parsedJson?.outcome === 'clarification') {
      return {
        outcome: 'clarification',
        clarification: GeneratedTaskClarificationSchema.parse({
          ...parsedJson.clarification,
          citations: [promptCitation(prompt)],
        }),
      };
    }

    if (parsedJson?.outcome !== 'draft') {
      throw new Error('Gemini returned an unsupported generation outcome.');
    }

    const safeProductBrief =
      parsedJson.productBrief && typeof parsedJson.productBrief === 'object'
        ? parsedJson.productBrief
        : {
            context: parsedJson.task?.description || '',
            inScope: parsedJson.task?.title ? [parsedJson.task.title] : [],
            outScope: [],
          };

    return {
      outcome: 'draft',
      draft: GeneratedTaskDraftSchema.parse({
        ...parsedJson,
        productBrief: safeProductBrief,
        citations: [promptCitation(prompt)],
      }),
    };
  }
}

export const geminiClient = new GeminiClient();
