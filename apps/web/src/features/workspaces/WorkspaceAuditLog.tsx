import React, { useCallback, useEffect, useState } from 'react';
import type { WorkspaceActivityItem } from '@qlick/contracts';
import { WorkspaceAuditLogCard } from '../../components/ui/organisms/WorkspaceAuditLogCard';
import { workspaceService } from '../../lib/api/workspaceService';

/** MEMBER-ACCESS-HUB P6: loads the membership audit log of one Workspace. */
export const WorkspaceAuditLog: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [activities, setActivities] = useState<WorkspaceActivityItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setActivities(await workspaceService.getMembershipActivities(workspaceId));
    } catch (err) {
      setActivities(null);
      setError(err instanceof Error ? err.message : 'Log audit gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <WorkspaceAuditLogCard
      activities={activities}
      isLoading={isLoading}
      error={error}
      onRetry={() => void load()}
    />
  );
};
