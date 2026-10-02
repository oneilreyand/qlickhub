import dns from 'node:dns';
import { env } from '../../config/env.js';
import {
  GenerateTaskDraftResponse,
  GeneratedTaskClarificationSchema,
  GeneratedTaskDraftSchema,
  TargetPlatform,
  TaskChatMessage,
  RefineTaskChatResponse,
  RefineTaskChatResponseSchema,
} from '@qlick/contracts';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Older runtimes may not support this option; keep the platform default.
}

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
Misi Anda adalah mengubah deskripsi kebutuhan produk dari pengguna menjadi draf perencanaan Feature perangkat lunak yang lengkap dan terstruktur.

PANDUAN INTERPRETASI PROMPT:
- Pengguna seringkali menuliskan prompt dalam bentuk spesifikasi sistem, aturan alur kerja, batasan peran pengguna (misal PO/DEV/QA), alur state machine, atau memakai gaya bahasa "Anda adalah sistem X..." atau "Tugas Anda: validasi X...".
- Anda WAJIB menginterpretasikan teks tersebut sebagai SPESIFIKASI FITUR SISTEM yang hendak DIBANGUN / DIKEMBANGKAN oleh tim rekayasa perangkat lunak (Software Engineering).
- JANGAN mengira pengguna sedang mengajak roleplay chat atau menyuruh Anda menjadi bot interaktif. Jawab dengan outcome "draft" untuk merancang implementasi sistem/fitur tersebut.
- HANYA jika prompt benar-benar berupa teks acak tak bermakna (misal teks acak seperti "asdfghjkl") atau tidak memiliki konteks produk sama sekali, jawab dengan outcome "clarification". Untuk outcome "clarification", isi clarification.message dan clarification.questions dengan 1-4 pertanyaan konkret.

Hanya jika kebutuhan dapat dipahami, jawab dengan outcome "draft" dan pecah menjadi rancangan pengiriman perangkat lunak yang lengkap dan terstruktur. Seluruh komponen (task, productBrief, requirements, subtasks) WAJIB dibuat lengkap:
1. Task (Feature / Root Task):
   - title: Judul ringkas, profesional, dan to the point (maks 200 karakter).
   - description: Markdown deskriptif lengkap dengan tujuan bisnis dan gambaran arsitektur.
   - priority: 'low' | 'medium' | 'high' | 'urgent'.
2. Product Brief (Ringkasan Produk):
   - context: Latar belakang masalah, nilai bisnis, dan persona pengguna.
   - inScope: Daftar minimal 2-5 butir string fitur yang masuk dalam cakupan rilis ini.
   - outScope: Daftar poin string hal-hal yang ditunda / tidak dikerjakan di rilis ini.
3. Requirements (Spesifikasi Kebutuhan):
   - WAJIB minimal 1-3 kebutuhan fungsional spesifik. Tidak boleh kosong.
   - Tiap requirement memiliki judul jelas dan acceptanceCriteria berupa daftar minimal 2-4 string kriteria pengujian (format Given-When-Then atau kalimat terukur).
4. Subtasks:
   - WAJIB breakdown tugas teknis per peran yang dapat dieksekusi. Tidak boleh kosong.
   - Target area yang diminta: ${targetPlatforms.join(', ')}.
   - Sediakan subtask untuk setiap target area yang diminta (${targetPlatforms.join(', ')}).
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
      required: ['outcome', 'task', 'productBrief', 'requirements', 'subtasks'],
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

    const taskTitle = parsedJson.task?.title || prompt.trim().slice(0, 50);

    let safeRequirements = Array.isArray(parsedJson.requirements) ? parsedJson.requirements : [];
    if (safeRequirements.length === 0) {
      safeRequirements = [
        {
          title: `Kebutuhan Fungsional: ${taskTitle}`,
          description: `Spesifikasi alur kerja dan integrasi utama untuk ${taskTitle}.`,
          acceptanceCriteria: [
            `Given pengguna terautentikasi, when mengakses fitur ${taskTitle}, then sistem merespons dengan data yang valid`,
            'Given input tidak valid atau otorisasi gagal, when aksi diproses, then sistem menolak dan menampilkan pesan yang jelas',
            'Given alur selesai dieksekusi, then status tugas dan jejak aktivitas tercatat secara persisten',
          ],
        },
      ];
    }

    let safeSubtasks = Array.isArray(parsedJson.subtasks) ? parsedJson.subtasks : [];
    if (safeSubtasks.length === 0) {
      const platformMap: Record<
        TargetPlatform,
        {
          area: 'frontend' | 'backend' | 'mobile' | 'fullstack' | 'qa';
          label: string;
          desc: string;
        }
      > = {
        web: {
          area: 'frontend',
          label: `FE: Implementasi antarmuka ${taskTitle}`,
          desc: `Menyediakan komponen UI, form interaksi, dan integrasi API untuk ${taskTitle}.`,
        },
        backend: {
          area: 'backend',
          label: `BE: Implementasi API & data persistence ${taskTitle}`,
          desc: `Menyediakan endpoint REST terautentikasi, validasi schema Zod, dan model persistensi untuk ${taskTitle}.`,
        },
        mobile: {
          area: 'mobile',
          label: `Mobile: Implementasi layar & service ${taskTitle}`,
          desc: `Menyediakan antarmuka mobile responsif dan state management untuk ${taskTitle}.`,
        },
        fullstack: {
          area: 'fullstack',
          label: `Fullstack: Integrasi menyeluruh ${taskTitle}`,
          desc: `Menyediakan integrasi frontend, backend, dan alur data menyeluruh untuk ${taskTitle}.`,
        },
        qa: {
          area: 'qa',
          label: `QA: Skenario pengujian, Test Case & UAT ${taskTitle}`,
          desc: `Menyusun Test Case terverifikasi, pengujian skenario positif/negatif, dan verifikasi kriteria penerimaan.`,
        },
      };

      safeSubtasks = targetPlatforms.map((platform) => {
        const item = platformMap[platform] || {
          area: 'backend' as const,
          label: `Teknis: Implementasi ${taskTitle}`,
          desc: `Menyelesaikan pekerjaan teknis untuk ${taskTitle}.`,
        };
        return {
          title: item.label,
          description: item.desc,
          deliveryArea: item.area,
          priority: 'medium' as const,
          enabled: true,
        };
      });
    }

    return {
      outcome: 'draft',
      draft: GeneratedTaskDraftSchema.parse({
        ...parsedJson,
        productBrief: safeProductBrief,
        requirements: safeRequirements,
        subtasks: safeSubtasks,
        citations: [promptCitation(prompt)],
      }),
    };
  }

  /**
   * Interactive Co-Pilot conversation to refine and guide product requirements.
   * Provides guidance, clarifies ambiguity, and evaluates when requirements are ready to synthesize.
   */
  async refineTaskChat(
    messages: TaskChatMessage[],
    targetPlatforms: TargetPlatform[] = ['web', 'backend', 'qa'],
  ): Promise<RefineTaskChatResponse> {
    if (!messages || messages.length === 0) {
      throw new Error('Minimal 1 pesan percakapan untuk berdiskusi dengan AI Co-Pilot.');
    }

    const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const latestText = latestUserMsg?.content || messages[messages.length - 1].content;
    const citation = promptCitation(latestText);

    // Tests must be deterministic and never call an external provider.
    if (process.env.NODE_ENV === 'test') {
      const isReady = messages.length >= 2;
      return {
        reply: isReady
          ? `Kebutuhan untuk "${latestText.slice(0, 40)}" sudah sangat jelas dan terstruktur. Anda bisa langsung menekan tombol 'Rakit Draf Feature' untuk menyusun tiket lengkapnya.`
          : `Ide yang menarik tentang "${latestText.slice(0, 40)}"! Role apa saja yang terlibat dan bagaimana alur status tugasnya?`,
        suggestedPrompt: latestText,
        isReadyToSynthesize: isReady,
        quickReplies: isReady
          ? ['Rakit draf sekarang', 'Tambahkan detail kriteria penerimaan']
          : ['Ada 3 role: PO, DEV, dan QA', 'Alur status bertahap dari Draft hingga Done'],
        citations: [citation],
      };
    }

    if (!this.apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not configured on the server. Please configure GEMINI_API_KEY in your server environment.',
      );
    }

    const systemInstruction = `Anda adalah Senior Technical Product Owner dan QA Lead di platform Qlick Hub.
Anda sedang berdiskusi secara interaktif dan konstruktif dengan Product Owner untuk mematangkan kebutuhan fitur perangkat lunak yang ingin dibangun untuk target platform: ${targetPlatforms.join(', ')}.

TUGAS UTAMA ANDA:
1. Pahami ide pengguna, apresiasi konteksnya, dan berikan tanggapan yang ramah, profesional, serta tajam dalam Bahasa Indonesia.
2. Analisis kelengkapan teknis: Apakah peran pengguna (PO/Dev/QA), batasan akses, alur status (state machine), atau integrasi sudah jelas?
3. Ajukan 1-2 pertanyaan pemandu yang spesifik untuk menggali detail penting yang belum terdefinisi.
4. Evaluasi Kesiapan (isReadyToSynthesize):
   - Jika pengguna sudah menjelaskan fitur, alur kerja/peran, atau detail teknis yang memadai, set "isReadyToSynthesize": true.
   - Sediakan "suggestedPrompt" yang merangkum keseluruhan poin kebutuhan yang disepakati dari percakapan sejauh ini.
   - Jika kebutuhan masih sangat abstrak (misal hanya 1 kalimat awal), set "isReadyToSynthesize": false.
5. Berikan 2-3 opsi respon cepat ("quickReplies") berupa kalimat singkat yang memudahkan pengguna membalas pertanyaan Anda berikutnya.
Respon WAJIB dalam format JSON murni sesuai schema.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        reply: { type: 'STRING' },
        suggestedPrompt: { type: 'STRING' },
        isReadyToSynthesize: { type: 'BOOLEAN' },
        quickReplies: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['reply', 'isReadyToSynthesize'],
    };

    const contents = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const requestBody = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.3,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[GeminiClient] Chat refinement failed (${response.status}):`, errText);
        return {
          reply:
            'Saya telah mencatat kebutuhan Anda. Informasi sudah memadai untuk dirakit menjadi draf Feature terstruktur.',
          suggestedPrompt: latestText,
          isReadyToSynthesize: true,
          quickReplies: ['Rakit draf sekarang'],
          citations: [citation],
        };
      }

      const json = (await response.json()) as any;
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return {
          reply: 'Informasi percakapan sudah memadai. Silakan rakit draf Feature Anda.',
          suggestedPrompt: latestText,
          isReadyToSynthesize: true,
          quickReplies: ['Rakit draf sekarang'],
          citations: [citation],
        };
      }

      const parsed = JSON.parse(rawText);
      return RefineTaskChatResponseSchema.parse({
        reply: parsed.reply || 'Mari lanjutkan perincian fitur ini.',
        suggestedPrompt: parsed.suggestedPrompt || latestText,
        isReadyToSynthesize: Boolean(parsed.isReadyToSynthesize),
        quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [],
        citations: [citation],
      });
    } catch (err) {
      console.warn('[GeminiClient] Exception during refineTaskChat:', err);
      return {
        reply:
          'Kebutuhan Anda telah terangkum. Anda dapat langsung merakit draf Feature untuk ditinjau.',
        suggestedPrompt: latestText,
        isReadyToSynthesize: true,
        quickReplies: ['Rakit draf sekarang'],
        citations: [citation],
      };
    }
  }

  /**
   * Synthesize a complete 4-entity Feature draft directly from multi-turn discussion messages.
   */
  async synthesizeTaskDraftFromChat(
    messages: TaskChatMessage[],
    targetPlatforms: TargetPlatform[] = ['web', 'backend', 'qa'],
  ): Promise<GenerateTaskDraftResponse> {
    const chatDigest = messages
      .map((m) => `${m.role === 'user' ? 'Product Owner' : 'AI Lead'}: ${m.content}`)
      .join('\n\n');

    const consolidatedPrompt = `Berikut adalah hasil diskusi perumusan kebutuhan fitur antara Product Owner dan AI Co-Pilot:\n\n${chatDigest}\n\nInstruksi: Susun draf Feature lengkap (Root Task, Brief Produk dengan In-Scope dan Out-of-Scope, Kebutuhan Fungsional dengan Acceptance Criteria Given-When-Then, dan Subtask teknis untuk ${targetPlatforms.join(', ')}) berdasarkan hasil diskusi di atas.`;

    return this.generateTaskDraft(consolidatedPrompt, targetPlatforms);
  }
}

export const geminiClient = new GeminiClient();
