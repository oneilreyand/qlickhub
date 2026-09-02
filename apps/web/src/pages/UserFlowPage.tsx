import React from 'react';
import { UserFlowGuide } from '../features/reports';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
import { useAppSelector } from '../store/hooks';

export const UserFlowPage: React.FC = () => {
  const { workspaces, isLoading: isWorkspaceLoading } = useAppSelector((state) => state.workspace);

  if (!isWorkspaceLoading && workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  return (
    <div className="w-full">
      <UserFlowGuide />
    </div>
  );
};
