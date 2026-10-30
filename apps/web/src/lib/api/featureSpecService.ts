import type { CreateFeatureSpecInput, FeatureSpec, FeatureSpecSection } from '@qlick/contracts';
import {
  FeatureSpecQuestionSchema,
  FeatureSpecSchema,
  type FeatureSpecQuestion,
} from '@qlick/contracts';
import { apiClient } from './apiClient';

export const featureSpecService = {
  /** AC-5.1: membuat root Feature dan Feature Spec versi 1 dari judul + ide. */
  async create(
    workspaceId: string,
    input: Pick<CreateFeatureSpecInput, 'title' | 'idea' | 'folderId'>,
  ): Promise<FeatureSpec> {
    const response = await apiClient<{ featureSpec: unknown }>(
      `/workspaces/${workspaceId}/feature-specs`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return FeatureSpecSchema.parse(response.featureSpec);
  },

  /** Spec milik satu Feature, atau null bila Feature dibuat tanpa Spec (alur lama). */
  async getByFeature(workspaceId: string, featureTaskId: string): Promise<FeatureSpec | null> {
    const response = await apiClient<{ featureSpecs: unknown[] }>(
      `/workspaces/${workspaceId}/feature-specs`,
      { params: { featureTaskId } },
    );
    const first = response.featureSpecs?.[0];
    return first ? FeatureSpecSchema.parse(first) : null;
  },

  /** AC-5.2 / AC-5.3: simpan satu bagian. `complete: true` memvalidasi field wajib di server. */
  async saveSection(
    workspaceId: string,
    specId: string,
    section: FeatureSpecSection,
    input: { version: number; content: unknown; complete?: boolean },
  ): Promise<FeatureSpec> {
    const response = await apiClient<{ featureSpec: unknown }>(
      `/workspaces/${workspaceId}/feature-specs/${specId}/sections/${section}`,
      { method: 'PUT', body: JSON.stringify(input) },
    );
    return FeatureSpecSchema.parse(response.featureSpec);
  },

  /** AC-5.4: pertanyaan klarifikasi AI yang tersimpan untuk satu Spec. */
  async listQuestions(workspaceId: string, specId: string): Promise<FeatureSpecQuestion[]> {
    const response = await apiClient<{ questions: unknown[] }>(
      `/workspaces/${workspaceId}/feature-specs/${specId}/questions`,
    );
    return response.questions.map((question) => FeatureSpecQuestionSchema.parse(question));
  },

  /** AC-5.4: meminta AI membuat pertanyaan klarifikasi (menggantikan pertanyaan sebelumnya). */
  async generateQuestions(workspaceId: string, specId: string): Promise<FeatureSpecQuestion[]> {
    const response = await apiClient<{ questions: unknown[] }>(
      `/workspaces/${workspaceId}/feature-specs/${specId}/questions`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    return response.questions.map((question) => FeatureSpecQuestionSchema.parse(question));
  },

  async answerQuestion(
    workspaceId: string,
    specId: string,
    questionId: string,
    answer: string,
  ): Promise<FeatureSpecQuestion> {
    const response = await apiClient<{ question: unknown }>(
      `/workspaces/${workspaceId}/feature-specs/${specId}/questions/${questionId}`,
      { method: 'PATCH', body: JSON.stringify({ answer }) },
    );
    return FeatureSpecQuestionSchema.parse(response.question);
  },

  /** AC-5.4: AI mengisi Plan dari ide dan jawaban; server memvalidasi lalu menyimpan sebagai draf. */
  async generatePlan(
    workspaceId: string,
    specId: string,
    version: number,
  ): Promise<{ featureSpec: FeatureSpec; aiFilledFields: string[] }> {
    const response = await apiClient<{ featureSpec: unknown; aiFilledFields: string[] }>(
      `/workspaces/${workspaceId}/feature-specs/${specId}/generate/plan`,
      { method: 'POST', body: JSON.stringify({ version }) },
    );
    return {
      featureSpec: FeatureSpecSchema.parse(response.featureSpec),
      aiFilledFields: response.aiFilledFields,
    };
  },
};
