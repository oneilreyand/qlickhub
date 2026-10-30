import type { CreateFeatureSpecInput, FeatureSpec, FeatureSpecSection } from '@qlick/contracts';
import { FeatureSpecSchema } from '@qlick/contracts';
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
};
