import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDeliveryTraceFixture } from '../../../../test/deliveryTraceFixture';
import { FeaturePlanningStageBadge } from '../FeaturePlanningStageBadge';

describe('backend planning stage presentation', () => {
  it('presents the server stage even if the Task status differs', () => {
    const task = {
      ...createDeliveryTraceFixture().featureTask,
      featureStage: 'prd' as const,
      featureStageSource: 'spec' as const,
    };
    render(<FeaturePlanningStageBadge task={task} />);
    expect(screen.getByText('PRD')).toBeVisible();
    expect(screen.queryByText('Diterapkan')).not.toBeInTheDocument();
  });
  it('identifies legacy inference without claiming an historical Apply', () => {
    render(
      <FeaturePlanningStageBadge
        task={{
          ...createDeliveryTraceFixture().featureTask,
          featureStage: 'task',
          featureStageSource: 'legacy',
        }}
      />,
    );
    expect(screen.getByTitle(/tidak menyatakan adanya Apply historis/)).toHaveTextContent('Task');
  });
  it('does not guess a stage when a response lacks it', () => {
    render(<FeaturePlanningStageBadge task={createDeliveryTraceFixture().featureTask} />);
    expect(screen.getByText('Tahap belum tersedia')).toBeVisible();
  });
});
