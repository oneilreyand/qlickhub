import { FEATURE_PLANNING_STAGE_LABELS, type Task } from '@qlick/contracts';
import { Badge } from '../atoms/Badge';

export function FeaturePlanningStageBadge({ task }: { task: Task }) {
  if (task.parentTaskId) return null;
  return (
    <span
      title={
        task.featureStageSource === 'legacy'
          ? 'Tahap dari konten Feature lama; tidak menyatakan adanya Apply historis.'
          : 'Tahap dari Feature Spec tersimpan.'
      }
    >
      <Badge variant={task.featureStage === 'applied' ? 'passed' : 'neutral'} size="sm">
        {task.featureStage
          ? FEATURE_PLANNING_STAGE_LABELS[task.featureStage]
          : 'Tahap belum tersedia'}
      </Badge>
    </span>
  );
}
