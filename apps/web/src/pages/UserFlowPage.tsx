import React from 'react';
import { UserFlowGuide } from '../components/ui/organisms/UserFlowGuide';
import { EmptyWorkspaceOnboarding } from '../components/ui/organisms/EmptyWorkspaceOnboarding';
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
