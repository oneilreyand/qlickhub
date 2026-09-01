import React, { useState } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  SlidersHorizontal,
  Trash2,
  Edit3,
  Inbox,
} from 'lucide-react';

// Import Atomic Design System Components
import { Button } from '../components/ui/atoms/Button';
import { Badge } from '../components/ui/atoms/Badge';
import { Input } from '../components/ui/atoms/Input';
import { Select } from '../components/ui/atoms/Select';
import { Checkbox, ToggleSwitch } from '../components/ui/atoms/Checkbox';
import { Avatar } from '../components/ui/atoms/Avatar';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { ProgressBar } from '../components/ui/atoms/ProgressBar';
import { LoadingSpinner, LoadingOverlay } from '../components/ui/atoms/LoadingSpinner';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/atoms/Accordion';

import { Tooltip } from '../components/ui/atoms/Tooltip';
import { DateRangePicker, DateRange } from '../components/ui/molecules/DateRangePicker';

import { Modal } from '../components/ui/molecules/Modal';
import { Drawer } from '../components/ui/molecules/Drawer';
import { Tabs } from '../components/ui/molecules/Tabs';
import { DropdownMenu } from '../components/ui/molecules/DropdownMenu';
import { EmptyState } from '../components/ui/molecules/EmptyState';
import { SearchInput } from '../components/ui/molecules/SearchInput';
import { ReleaseReadinessSignal } from '../components/ui/molecules/ReleaseReadinessSignal';
import { EvidenceCard } from '../components/ui/molecules/EvidenceCard';
import {
  EvidencePreviewModal,
  EvidencePreviewItem,
} from '../components/ui/organisms/EvidencePreviewModal';

import { StatCard } from '../components/ui/organisms/StatCard';
import { DataTable } from '../components/ui/organisms/DataTable';
import { FileDropzone } from '../components/ui/organisms/FileDropzone';
import { BarChart, LineChart } from '../components/ui/organisms/Chart';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCurrentUserRole } from '../store/authSlice';
import {
  enqueueSnackbar,
  enqueueApiResponse,
  reportError,
  runUiDemoAction,
  simulateApiCallAction,
} from '../store/uiSlice';

const Section: React.FC<{
  category: string;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ category, title, description, children }) => (
  <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md sm:p-6 space-y-4 dark:border-stone-800/80 dark:bg-[#1C1A19] dark:text-stone-100">
    <div>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#141413] bg-[#B1E743] px-2 py-0.5 rounded-full dark:bg-[#B1E743] dark:text-[#141413]">
        {category}
      </span>
      <h2 className="text-lg font-bold text-stone-900 mt-2 dark:text-stone-100">{title}</h2>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>
    </div>
    <div className="pt-2">{children}</div>
  </section>
);

export const ComponentGalleryPage: React.FC = () => {
  // Demos State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab-1');
  const [activePillTab, setActivePillTab] = useState('tab-1');
  const [toggleChecked, setToggleChecked] = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSimulatedLoading, setIsSimulatedLoading] = useState(false);
  const [demoSearchQuery, setDemoSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    startDate: '2026-08-01',
    endDate: '2026-08-13',
  });
  const [demoEvidencePreview, setDemoEvidencePreview] = useState<EvidencePreviewItem | null>(null);
  const dispatch = useAppDispatch();

  const isGlobalActionPending = useAppSelector((state) => state.ui.pendingOperations.length > 0);
  const currentUserRole = useAppSelector(selectCurrentUserRole);
  const { workspaces, activeWorkspaceId } = useAppSelector((state) => state.workspace);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const userRole = (
    activeWorkspace?.role ||
    activeWorkspace?.myRole ||
    currentUserRole ||
    ''
  ).toLowerCase();
  const canAccessUI = userRole === 'owner';

  if (!canAccessUI) {
    return (
      <AccessRestricted
        workspaceName={activeWorkspace?.name}
        title="UI System Access Restricted"
        description="Hanya Workspace Owner yang dapat mengakses UI System & Component Gallery."
        actionHref="/work"
        actionLabel="Return to Work Hub"
      />
    );
  }

  const sampleTableData = [
    {
      id: 'TASK-101',
      title: 'Implement OAuth2 login flow',
      req: 'REQ-01',
      status: 'Passed',
      owner: 'John Doe',
    },
    {
      id: 'TASK-102',
      title: 'JWT Refresh Token revocation',
      req: 'REQ-04',
      status: 'Passed',
      owner: 'Sarah Connor',
    },
    {
      id: 'TASK-103',
      title: 'Stripe Webhook Signature check',
      req: 'REQ-12',
      status: 'In Review',
      owner: 'Alex Smith',
    },
    {
      id: 'TASK-104',
      title: 'Payment Gateway 502 Retry Policy',
      req: 'REQ-14',
      status: 'Blocked',
      owner: 'Mike Ross',
    },
  ];

  const barChartData = [
    { label: 'Mon', value: 12, secondaryValue: 2 },
    { label: 'Tue', value: 18, secondaryValue: 1 },
    { label: 'Wed', value: 15, secondaryValue: 3 },
    { label: 'Thu', value: 24, secondaryValue: 0 },
    { label: 'Fri', value: 20, secondaryValue: 2 },
    { label: 'Sat', value: 8, secondaryValue: 0 },
    { label: 'Sun', value: 10, secondaryValue: 1 },
  ];

  const lineChartData = [
    { label: 'Sprint 1', value: 65 },
    { label: 'Sprint 2', value: 72 },
    { label: 'Sprint 3', value: 85 },
    { label: 'Sprint 4', value: 94 },
    { label: 'Sprint 5', value: 98 },
  ];

  return (
    <div className="w-full space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-stone-200/80 pb-6 dark:border-stone-800">
        <div className="flex items-center gap-2 text-xs font-bold text-[#141413] dark:text-[#B1E743]">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#B1E743] text-[#141413] font-black">
            Q
          </div>
          <span>Atomic Design System</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          Component Gallery
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Exhaustive UI library aligned with the new global design palette (Lime Primary{' '}
          <code className="bg-stone-100 px-1 py-0.5 rounded text-[#141413] font-semibold dark:bg-stone-800 dark:text-[#B1E743]">
            #B1E743
          </code>
          , Charcoal Dark{' '}
          <code className="bg-stone-100 px-1 py-0.5 rounded text-[#141413] font-semibold dark:bg-stone-800 dark:text-[#B1E743]">
            #141413
          </code>
          , and Stone Neutrals).
        </p>
      </div>

      {/* 1. ATOMS SECTION */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">1. Atoms</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Section
            category="Atoms"
            title="Buttons"
            description="Primary, secondary, destructive, ghost, and icon button variants with loading states."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                isLoading={isGlobalActionPending}
                onClick={() => void dispatch(runUiDemoAction('Primary action'))}
              >
                Primary Action
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>
                Delete
              </Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Badges"
            description="Status indicators representing QA states and system metadata tags."
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="passed">Passed</Badge>
              <Badge variant="review">In Review</Badge>
              <Badge variant="blocked">Blocked</Badge>
              <Badge variant="draft">Draft</Badge>
              <Badge variant="info">Requirement Mapped</Badge>
              <Badge variant="neutral">System Token</Badge>
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Progress Bars"
            description="Animated progress indicators with status color variants and percentage labels."
          >
            <div className="space-y-4 max-w-md">
              <ProgressBar value={85} label="Test Suite Coverage" variant="brand" size="md" />
              <ProgressBar
                value={100}
                label="Sprint Requirement Pass Rate"
                variant="brand"
                size="sm"
              />
              <ProgressBar value={45} label="Pending Reviews" variant="amber" size="md" />
              <ProgressBar value={20} label="Critical Defect Resolution" variant="rose" size="lg" />
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Loading Indicators & Overlays"
            description="Circular spinners, pulsing dot loaders, and full-panel loading overlays."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <LoadingSpinner size="sm" label="Small" />
                <LoadingSpinner size="md" label="Medium" />
                <LoadingSpinner size="lg" label="Large" />
                <LoadingSpinner size="xl" label="Extra Large" />
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsSimulatedLoading(true);
                    setTimeout(() => setIsSimulatedLoading(false), 2000);
                  }}
                >
                  Simulate Container Overlay Loading (2s)
                </Button>
              </div>
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Inputs & Search"
            description="Form text fields with icons, shortcuts, and validation state."
          >
            <div className="space-y-3 max-w-md">
              <Input
                label="Search Requirements"
                leftIcon={<Search className="h-4 w-4 text-stone-400" />}
                shortcut="⌘K"
                placeholder="Search anything..."
              />
              <Input
                label="Task Title"
                placeholder="Enter title"
                error="Title is required for task creation"
              />
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Form Selection Controls"
            description="Accessible selects, checkboxes, and interactive toggle switches."
          >
            <div className="flex flex-col gap-3">
              <Select label="Task status" defaultValue="in_progress" className="max-w-md">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </Select>
              <Checkbox
                label="Enable automated QA notifications"
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
              />
              <ToggleSwitch
                label="Dark mode preview"
                checked={toggleChecked}
                onChange={setToggleChecked}
              />
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Avatars"
            description="User initials badge with status indicators and size variants."
          >
            <div className="flex items-center gap-4">
              <Avatar name="John Doe" size="sm" status="online" />
              <Avatar name="Sarah Connor" size="md" status="busy" />
              <Avatar name="Alex Smith" size="lg" status="offline" />
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Skeletons"
            description="Animated placeholders used during API data loading."
          >
            <div className="space-y-3">
              <Skeleton variant="text" className="w-1/3" />
              <Skeleton variant="text" className="w-full" />
              <Skeleton variant="text" className="w-4/5" />
            </div>
          </Section>

          <Section
            category="Atoms"
            title="Tooltips"
            description="Contextual micro-popovers with directional positioning (top, bottom, left, right)."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Tooltip content="Tooltip on Top" position="top">
                <Button variant="outline" size="sm">
                  Hover Me (Top)
                </Button>
              </Tooltip>
              <Tooltip content="Tooltip on Bottom" position="bottom">
                <Button variant="outline" size="sm">
                  Hover Me (Bottom)
                </Button>
              </Tooltip>
              <Tooltip content="Tooltip on Left" position="left">
                <Button variant="outline" size="sm">
                  Hover Me (Left)
                </Button>
              </Tooltip>
              <Tooltip content="Tooltip on Right" position="right">
                <Button variant="outline" size="sm">
                  Hover Me (Right)
                </Button>
              </Tooltip>
            </div>
          </Section>
        </div>
      </div>

      {/* 2. MOLECULES SECTION */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">2. Molecules</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Section
            category="Molecules"
            title="Search Input"
            description="Standardized search input with Lucide vector icon, clear button, shortcut badges, and dark mode support."
          >
            <div className="space-y-3">
              <SearchInput
                value={demoSearchQuery}
                onChange={(e) => setDemoSearchQuery(e.target.value)}
                onClear={() => setDemoSearchQuery('')}
                placeholder="Type something to see clear button..."
                shortcut="⌘K"
              />
              <SearchInput
                disabled
                value="Disabled search input state"
                placeholder="Disabled state..."
              />
            </div>
          </Section>

          <Section
            category="Molecules"
            title="Date Range Picker"
            description="Range selection control with quick presets (Today, 7 days, 30 days) and custom date inputs."
          >
            <div>
              <DateRangePicker
                value={dateRange}
                onChange={(range) => {
                  setDateRange(range);
                  if (range) {
                    dispatch(
                      enqueueSnackbar(
                        `Selected range: ${range.startDate} to ${range.endDate}`,
                        'info',
                      ),
                    );
                  }
                }}
              />
            </div>
          </Section>

          <Section
            category="Molecules"
            title="Release Readiness Signal"
            description="Compact presentation of the backend-evaluated release gate snapshot, including loading and access states."
          >
            <div className="flex flex-wrap items-center gap-3">
              <ReleaseReadinessSignal />
              <ReleaseReadinessSignal
                state={{ snapshot: null, isLoading: false, error: null, permissionDenied: true }}
              />
              <ReleaseReadinessSignal
                state={{
                  snapshot: null,
                  isLoading: false,
                  error: 'Readiness service unavailable.',
                  permissionDenied: false,
                }}
              />
            </div>
          </Section>

          <Section
            category="Molecules"
            title="Modal & Drawer Controls"
            description="Overlay popups for confirmation actions and detail side inspection panels."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Modal Demo
              </Button>
              <Button variant="outline" onClick={() => setIsDrawerOpen(true)}>
                Open Drawer Demo
              </Button>
            </div>
          </Section>

          <Section
            category="Molecules"
            title="Navigation Tabs"
            description="Underline and pill navigation tab bars with badge counts."
          >
            <div className="space-y-4">
              <Tabs
                variant="underline"
                activeTabId={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: 'tab-1', label: 'Overview', count: 12 },
                  { id: 'tab-2', label: 'Requirements', count: 4 },
                  { id: 'tab-3', label: 'QA Execution', count: 2 },
                ]}
              />
              <Tabs
                variant="pills"
                activeTabId={activePillTab}
                onChange={setActivePillTab}
                tabs={[
                  { id: 'tab-1', label: 'All Tasks' },
                  { id: 'tab-2', label: 'Passed', count: 8 },
                  { id: 'tab-3', label: 'Blocked', count: 1 },
                ]}
              />
            </div>
          </Section>

          <Section
            category="Molecules"
            title="Dropdown Context Menu"
            description="Popover action list trigger for record mutations."
          >
            <DropdownMenu
              triggerLabel="Task Actions"
              triggerIcon={<SlidersHorizontal className="h-4 w-4 text-stone-500" />}
              items={[
                {
                  id: 'edit',
                  label: 'Edit Task Specs',
                  icon: <Edit3 className="h-4 w-4" />,
                  onClick: () => {
                    dispatch(enqueueSnackbar('Edit action clicked', 'info'));
                  },
                },
                {
                  id: 'link',
                  label: 'Link Requirement',
                  icon: <FileText className="h-4 w-4" />,
                  onClick: () => {
                    dispatch(enqueueSnackbar('Link requirement clicked', 'info'));
                  },
                },
                {
                  id: 'delete',
                  label: 'Delete Record',
                  destructive: true,
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => {
                    dispatch(
                      reportError(
                        'Delete record requires confirmation in the production workflow.',
                      ),
                    );
                  },
                },
              ]}
            />
          </Section>

          <Section
            category="Molecules"
            title="Empty & Error State"
            description="Illustrative container when search yields 0 items or dataset is empty."
          >
            <EmptyState
              icon={<Inbox className="h-6 w-6 text-stone-400" />}
              title="No Requirements Found"
              description="There are currently no linked requirements for this task folder."
              actionLabel="Create Requirement"
              onAction={() => setIsModalOpen(true)}
            />
          </Section>

          <Section
            category="Molecules"
            title="Global Snackbar & API Response Notifications"
            description="Redux-driven global toast notifications for user interactions, async thunk states, and backend API responses (HTTP 200, 422, 403, 500)."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    dispatch(
                      enqueueApiResponse({
                        status: 200,
                        detail: 'API 200 OK: Task status updated to Passed',
                      }),
                    )
                  }
                >
                  🟢 200 OK (Success)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    dispatch(
                      enqueueApiResponse({
                        type: 'info',
                        detail: 'API Info: Auth session token auto-refreshed',
                      }),
                    )
                  }
                >
                  🔵 Info Message
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    dispatch(
                      enqueueApiResponse({
                        status: 422,
                        detail: 'API 422 Warning: Duplicate requirement title detected',
                      }),
                    )
                  }
                >
                  🟠 422 Warning
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    dispatch(
                      enqueueApiResponse({
                        status: 403,
                        detail:
                          'API 403 Forbidden: You lack admin privileges for this workspace action',
                      }),
                    )
                  }
                >
                  🔴 403 Error
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <span className="text-xs font-semibold text-stone-500">
                  Async Thunk API Simulation:
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isGlobalActionPending}
                  onClick={() => dispatch(simulateApiCallAction({ shouldFail: false }))}
                >
                  ⚡ Run API Success Thunk
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isGlobalActionPending}
                  onClick={() => dispatch(simulateApiCallAction({ shouldFail: true }))}
                >
                  ⚡ Run API Failure Thunk
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* 3. ORGANISMS SECTION */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">3. Organisms</h2>
        <div className="space-y-6">
          {/* Data Analytics Charts */}
          <Section
            category="Organisms"
            title="Analytics Charts & Visualizations"
            description="Bar charts and trend line charts for dashboard test execution metrics."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <BarChart
                title="Daily Test Runs (Pass vs Fail)"
                subtitle="Weekly execution outcome breakdown"
                data={barChartData}
              />
              <LineChart
                title="QA Requirements Coverage %"
                subtitle="Historical trend across recent sprints"
                data={lineChartData}
              />
            </div>
          </Section>

          <Section
            category="Organisms"
            title="Dashboard Stat Cards"
            description="KPI metric overview cards with trend indicators."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Total Tasks"
                value="24"
                description="Across 4 active sprint folders"
                icon={<FileText className="h-5 w-5 text-stone-700 dark:text-stone-300" />}
                trend={{ value: '+12%', isPositive: true }}
              />
              <StatCard
                title="QA Pass Rate"
                value="91.6%"
                description="22 out of 24 test suites passing"
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                trend={{ value: '+4.2%', isPositive: true }}
              />
              <StatCard
                title="Blocked Defects"
                value="2"
                description="Requires dev investigation"
                icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
                trend={{ value: '-1', isPositive: false }}
              />
            </div>
          </Section>

          <Section
            category="Organisms"
            title="Data Table"
            description="Structured dashboard table with custom cell rendering and pagination."
          >
            <LoadingOverlay isLoading={isSimulatedLoading} message="Updating table records...">
              <DataTable
                data={sampleTableData}
                keyExtractor={(item) => item.id}
                columns={[
                  {
                    key: 'id',
                    header: 'Task ID',
                    render: (row) => (
                      <span className="font-mono font-bold text-[#22201F] dark:text-[#B1E743]">
                        {row.id}
                      </span>
                    ),
                  },
                  { key: 'title', header: 'Task Title' },
                  {
                    key: 'req',
                    header: 'Requirement',
                    render: (row) => (
                      <span className="inline-flex items-center gap-1 font-semibold text-stone-700 dark:text-stone-300">
                        <FileText className="h-3.5 w-3.5 text-stone-500" />
                        {row.req}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'QA Readiness',
                    render: (row) => (
                      <Badge
                        variant={
                          row.status === 'Passed'
                            ? 'passed'
                            : row.status === 'In Review'
                              ? 'review'
                              : 'blocked'
                        }
                      >
                        {row.status}
                      </Badge>
                    ),
                  },
                  { key: 'owner', header: 'Owner' },
                ]}
                pagination={{
                  currentPage: currentPage,
                  totalPages: 3,
                  onPageChange: (p) => setCurrentPage(p),
                }}
              />
            </LoadingOverlay>
          </Section>

          <Section
            category="Organisms"
            title="File Dropzone Attachment"
            description="Drag-and-drop file upload container with file list preview."
          >
            <FileDropzone maxFiles={3} />
          </Section>

          <Section
            category="Organisms"
            title="Error Boundary & 404 Fallback"
            description="Production error boundary fallback view with high-res illustration, status alert, technical diagnostics, and recovery navigation."
          >
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/30">
              <ErrorBoundaryFallback
                title="Example Error Boundary Fallback"
                description="This interactive preview demonstrates how runtime exceptions or 404 views are presented to the user."
                error={new Error('Simulated runtime error: ChunkLoadError or rendering failure')}
                resetErrorBoundary={() =>
                  dispatch(enqueueSnackbar('Reset error boundary simulated', 'info'))
                }
                showHomeButton={false}
              />
            </div>
          </Section>

          <Section
            category="Organisms"
            title="Access Restricted (403 Permission Guard)"
            description="Clear and accessible permission restriction screen with high-resolution illustration, context explanation, and return-to-hub CTA."
          >
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/30">
              <AccessRestricted
                workspaceName="Alpha Engineering QA"
                actionLabel="Simulate Return"
                onAction={() => dispatch(enqueueSnackbar('Return action triggered', 'info'))}
              />
            </div>
          </Section>

          <Section
            category="Atoms & Molecules"
            title="Accordion & Expandable Subtask Workspace"
            description="Accessible WAI-ARIA collapsible panel system for hierarchical task breakdowns, in-place description editing, evidence file management, and per-subtask collaboration."
          >
            <div className="space-y-3">
              <Accordion defaultValue={['demo-item-1']}>
                <AccordionItem id="demo-item-1">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        FE
                      </span>
                      <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                        Implement Interactive Subtask Accordion (Sample)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      This expandable workspace renders inside the AccordionContent component,
                      providing smooth animation, accessibility keyboard navigation, and embedded
                      sub-panels.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem id="demo-item-2">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        BE
                      </span>
                      <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                        Verify Subtask Persistence & Attachments (Sample)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Subtask attachments and discussion notes map directly to the existing
                      workspace API endpoints.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Section>

          {/* Section: Evidence Cards & Media Preview */}
          <Section
            category="Molecules & Organisms"
            title="Formal QA Evidence Links & Sandboxed Preview"
            description="Preview cards and sandboxed modal for external video/image evidence from YouTube, Loom, Vimeo, Google Drive, and direct HTTPS assets."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EvidenceCard
                link={{
                  id: 'demo-1',
                  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                  normalizedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
                  provider: 'youtube',
                  mediaKind: 'video',
                  label: 'E2E Checkout Failure Reproduction Video',
                  previewStatus: 'ready',
                }}
                onPreview={(l) =>
                  setDemoEvidencePreview({
                    url: l.url,
                    normalizedUrl: l.normalizedUrl,
                    provider: l.provider,
                    mediaKind: l.mediaKind,
                    label: l.label,
                    previewStatus: 'ready',
                  })
                }
              />
              <EvidenceCard
                link={{
                  id: 'demo-2',
                  url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
                  normalizedUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
                  provider: 'direct_image',
                  mediaKind: 'image',
                  label: 'Console Error Screenshot',
                  previewStatus: 'ready',
                }}
                onPreview={(l) =>
                  setDemoEvidencePreview({
                    url: l.url,
                    normalizedUrl: l.normalizedUrl,
                    provider: l.provider,
                    mediaKind: l.mediaKind,
                    label: l.label,
                    previewStatus: 'ready',
                  })
                }
              />
            </div>
          </Section>
        </div>
      </div>

      {/* Evidence Preview Modal */}
      <EvidencePreviewModal
        isOpen={Boolean(demoEvidencePreview)}
        onClose={() => setDemoEvidencePreview(null)}
        evidence={demoEvidencePreview}
      />

      {/* Interactive Modal Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Requirement"
        description="Link a new functional requirement specification to the delivery task."
        primaryActionLabel="Save Requirement"
        secondaryActionLabel="Cancel"
        onPrimaryAction={() => {
          setIsModalOpen(false);
          void dispatch(runUiDemoAction('New requirement'));
        }}
      >
        <div className="space-y-4">
          <Input
            label="Requirement Title"
            placeholder="e.g., REQ-25: Multi-Factor Authentication"
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Acceptance Criteria
            </label>
            <textarea
              rows={3}
              placeholder="Detail explicit acceptance criteria..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:border-[#22201F] focus:bg-white focus:ring-2 focus:ring-[#22201F]/10 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-[#B1E743] dark:focus:bg-stone-950 dark:focus:ring-[#B1E743]/20"
            />
          </div>
        </div>
      </Modal>

      {/* Interactive Drawer Demo */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Task Detail Inspection"
        subtitle="TASK-101 · Core Auth Folder"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(false)}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900">
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Linked Requirement: REQ-01
            </h4>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              OAuth2 Multi-provider authentication flow with Google & GitHub providers.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
              QA Readiness Signal
            </h4>
            <Badge variant="passed">100% Passed</Badge>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
