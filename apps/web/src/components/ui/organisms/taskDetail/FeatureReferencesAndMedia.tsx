import React, { useState } from 'react';
import type { TaskLink } from '@qlick/contracts';
import { FeatureReferencesPanel } from './FeatureReferencesPanel';
import { FeatureMediaGallery } from './FeatureMediaGallery';

export interface FeatureReferencesAndMediaProps {
  workspaceId: string;
  taskId: string;
  canManage: boolean;
}

const cardClass =
  'rounded-2xl border border-stone-200/80 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900/60';

export const FeatureReferencesAndMedia: React.FC<FeatureReferencesAndMediaProps> = ({
  workspaceId,
  taskId,
  canManage,
}) => {
  const [links, setLinks] = useState<TaskLink[]>([]);

  return (
    <section aria-label="Referensi dan Media" className={`${cardClass} space-y-6`}>
      <div className="border-b border-stone-100 pb-3 dark:border-stone-800">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
          Referensi & Media Produk
        </h2>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          Tautan Figma, dokumen eksternal, galeri mockup, dan video acuan pengerjaan Feature.
        </p>
      </div>

      <FeatureReferencesPanel
        workspaceId={workspaceId}
        taskId={taskId}
        canManage={canManage}
        onLinksChange={setLinks}
      />

      <div className="border-t border-stone-100 pt-5 dark:border-stone-800">
        <FeatureMediaGallery
          workspaceId={workspaceId}
          taskId={taskId}
          canManage={canManage}
          links={links}
        />
      </div>
    </section>
  );
};
