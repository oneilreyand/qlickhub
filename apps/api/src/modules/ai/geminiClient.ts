import { env } from '../../config/env.js';
import {
  GeneratedTaskDraft,
  GeneratedTaskDraftSchema,
  TargetPlatform,
} from '@qlick/contracts';

/**
 * Deterministic fallback draft used when in test environment or when GEMINI_API_KEY is not yet supplied.
 */
export function buildDeterministicFallbackDraft(
  prompt: string,
  targetPlatforms: TargetPlatform[] = ['web', 'backend', 'qa'],
): GeneratedTaskDraft {
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
    summary: `Draf berhasil di-generate dengan ${subtasks.length} subtask dan 1 requirement utama.`,
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
  ): Promise<GeneratedTaskDraft> {
    // If no API key configured, in test or development fallback gracefully
    if (!this.apiKey) {
      if (process.env.NODE_ENV === 'test' || !env.GEMINI_API_KEY) {
        return buildDeterministicFallbackDraft(prompt, targetPlatforms);
      }
      throw new Error(
        'GEMINI_API_KEY is not configured on the server. Please configure GEMINI_API_KEY in your server environment (Google AI Studio: https://aistudio.google.com/).',
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const systemInstruction = `Anda adalah Senior Technical Product Owner dan QA Lead di platform Qlick Hub.
Analisis prompt fitur produk yang diberikan pengguna dan pecah menjadi rancangan pengiriman perangkat lunak yang lengkap dan terstruktur:
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
        summary: { type: 'STRING' },
      },
      required: ['task', 'productBrief', 'requirements', 'subtasks'],
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

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API Error:', response.status, errorText);
        throw new Error(`Google AI Studio error (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as any;
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini did not return any candidate response text.');
      }

      const parsedJson = JSON.parse(rawText);
      return GeneratedTaskDraftSchema.parse(parsedJson);
    } catch (err) {
      console.warn('⚠️ Gemini call failed, falling back to deterministic draft in dev/test:', err);
      if (process.env.NODE_ENV === 'test' || !env.GEMINI_API_KEY) {
        return buildDeterministicFallbackDraft(prompt, targetPlatforms);
      }
      throw err;
    }
  }
}

export const geminiClient = new GeminiClient();
