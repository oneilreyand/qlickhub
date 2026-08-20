import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Code2,
  Bug,
} from 'lucide-react';
import type { Task } from '@qlick/contracts';
import { Drawer } from '../../molecules/Drawer';
import { PoTeamICardGrid } from './PoTeamICardGrid';
import { DevWorkingDesk } from './DevWorkingDesk';
import { QaTestingDesk } from './QaTestingDesk';
import { taskService } from '../../../../lib/api/taskService';
import { useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store/store';
import { selectCurrentUserId } from '../../../../store/authSlice';

export interface MyTaskDetailWorkspaceDrawerProps {
  task: Task | null;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const MyTaskDetailWorkspaceDrawer: React.FC<MyTaskDetailWorkspaceDrawerProps> = ({
  task,
  userRole = 'dev',
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const { activeWorkspaceId } = useAppSelector((state: RootState) => state.workspace);
  const currentUserId = useAppSelector(selectCurrentUserId);

  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'po' | 'dev' | 'qa'>('po');
  const [activeSubtaskForExecution, setActiveSubtaskForExecution] = useState<Task | null>(null);

  const isPlanner = useMemo(
    () => ['owner', 'admin', 'po'].includes(userRole.toLowerCase()),
    [userRole]
  );

  // Determine initial view mode based on task and user role
  useEffect(() => {
    if (!task) return;

    // Reset subtask execution view
    setActiveSubtaskForExecution(null);

    const isSubtask = Boolean(task.parentTaskId);

    if (isSubtask) {
      if (task.deliveryArea === 'qa' || userRole.toLowerCase() === 'qa') {
        setActiveViewMode('qa');
      } else {
        setActiveViewMode('dev');
      }
    } else {
      if (isPlanner) {
        setActiveViewMode('po');
      } else {
        // Dev/QA looking at a parent task
        setActiveViewMode(userRole.toLowerCase() === 'qa' ? 'qa' : 'dev');
      }
    }
  }, [task, userRole, isPlanner]);

  // Load parent task if the selected item is a subtask
  useEffect(() => {
    if (!task || !task.parentTaskId || !activeWorkspaceId) {
      setParentTask(null);
      return;
    }

    let isMounted = true;
    taskService
      .getTask(activeWorkspaceId, task.parentTaskId)
      .then((res) => {
        if (isMounted) setParentTask(res);
      })
      .catch(() => {
        if (isMounted) setParentTask(null);
      });

    return () => {
      isMounted = false;
    };
  }, [task, activeWorkspaceId]);

  if (!task) return null;

  const isSubtask = Boolean(task.parentTaskId);
  const executionTask = activeSubtaskForExecution || task;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={`#${task.id.substring(0, 8)} • Workspace Flow`}
      width="4xl"
      defaultFullScreen={true}
      allowFullScreen={true}
    >
      <div className="space-y-6 pb-12">
        {/* Role View Switcher & Persona Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          {isPlanner ? (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {/* PO View Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveViewMode('po');
                  setActiveSubtaskForExecution(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeViewMode === 'po'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>PO Cockpit & iCards</span>
              </button>

              {/* Dev View Tab */}
              <button
                type="button"
                onClick={() => setActiveViewMode('dev')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeViewMode === 'dev'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Dev Working Desk</span>
              </button>

              {/* QA View Tab */}
              <button
                type="button"
                onClick={() => setActiveViewMode('qa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeViewMode === 'qa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                <Bug className="h-3.5 w-3.5" />
                <span>QA Testing Desk</span>
              </button>
            </div>
          ) : activeViewMode === 'dev' ? (
            <div className="flex items-center gap-2 px-2 py-1">
              <Code2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Developer Working Desk
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 font-extrabold border border-sky-200 dark:border-sky-800">
                Executor Workspace
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1">
              <Bug className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                QA Testing & Quality Desk
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800">
                QA Verification
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 px-2 shrink-0">
            <span className="capitalize font-bold text-stone-700 dark:text-stone-300">
              Role: {userRole}
            </span>
          </div>
        </div>

        {/* Dynamic Workspace View Mode */}
        {activeViewMode === 'po' && activeWorkspaceId && (
          <PoTeamICardGrid
            task={isSubtask && parentTask ? parentTask : task}
            workspaceId={activeWorkspaceId}
            currentUserId={currentUserId || undefined}
            onDataChanged={onDataChanged}
            onOpenDevView={(subtaskItem) => {
              setActiveSubtaskForExecution(subtaskItem);
              setActiveViewMode('dev');
            }}
            onOpenQaView={(subtaskItem) => {
              setActiveSubtaskForExecution(subtaskItem);
              setActiveViewMode('qa');
            }}
          />
        )}

        {activeViewMode === 'dev' && activeWorkspaceId && (
          <DevWorkingDesk
            subtask={executionTask}
            parentTask={parentTask || (isSubtask ? null : task)}
            workspaceId={activeWorkspaceId}
            currentUserId={currentUserId || undefined}
            onDataChanged={onDataChanged}
            onBackToOverview={() => setActiveViewMode('po')}
          />
        )}

        {activeViewMode === 'qa' && activeWorkspaceId && (
          <QaTestingDesk
            subtask={executionTask}
            parentTask={parentTask || (isSubtask ? null : task)}
            workspaceId={activeWorkspaceId}
            currentUserId={currentUserId || undefined}
            onDataChanged={onDataChanged}
            onBackToOverview={() => setActiveViewMode('po')}
          />
        )}
      </div>
    </Drawer>
  );
};
