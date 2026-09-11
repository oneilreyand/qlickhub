import React from 'react';
import { UserFlowGuide } from '../features/reports';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
import { useAppSelector } from '../store/hooks';

export const UserFlowPage: React.FC = () => {
  const {
    workspaces,
    isLoading: isWorkspaceLoading,
    isInitialized: isWorkspaceInitialized,
  } = useAppSelector((state) => state.workspace);

  if (!isWorkspaceInitialized || (isWorkspaceLoading && workspaces.length === 0)) {
    return (
      <div className="py-24 flex items-center justify-center" aria-label="Memuat user flow guide">
        <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  return (
    <div className="w-full">
      <UserFlowGuide />
    </div>
  );
};
