import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskAttachment, TaskLink } from '@qlick/contracts';
import { FeatureReferencesAndMedia } from '../FeatureReferencesAndMedia';
import { FeatureReferencesPanel } from '../FeatureReferencesPanel';
import { FeatureMediaGallery } from '../FeatureMediaGallery';

const taskLinkServiceMocks = vi.hoisted(() => ({
  listLinks: vi.fn(),
  createLink: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
  reorderLinks: vi.fn(),
}));

const attachmentServiceMocks = vi.hoisted(() => ({
  listAttachments: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  getDownloadUrl: vi
    .fn()
    .mockImplementation((_ws: string, _t: string, id: string) => `/download/${id}`),
}));

vi.mock('../../../../../lib/api/taskLinkService', () => ({
  taskLinkService: taskLinkServiceMocks,
}));

vi.mock('../../../../../lib/api/attachmentService', () => ({
  attachmentService: attachmentServiceMocks,
}));

const mockLinks: TaskLink[] = [
  {
    id: 'link-1',
    workspaceId: 'ws-1',
    taskId: 'task-1',
    title: 'Figma UI Mockups',
    url: 'https://www.figma.com/design/sample123',
    linkType: 'figma',
    sortOrder: 0,
    createdBy: 'user-1',
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  },
  {
    id: 'link-2',
    workspaceId: 'ws-1',
    taskId: 'task-1',
    title: 'Demo Walkthrough Video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    linkType: 'video',
    sortOrder: 1,
    createdBy: 'user-1',
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  },
];

const mockAttachments: TaskAttachment[] = [
  {
    id: 'att-1',
    workspaceId: 'ws-1',
    taskId: 'task-1',
    fileName: 'dashboard-preview.png',
    fileSize: 102400,
    mimeType: 'image/png',
    storageProvider: 'local',
    category: 'product_media',
    caption: 'Dashboard high fidelity',
    uploaderId: 'user-1',
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  },
  {
    id: 'att-2',
    workspaceId: 'ws-1',
    taskId: 'task-1',
    fileName: 'qa-result.png',
    fileSize: 51200,
    mimeType: 'image/png',
    storageProvider: 'local',
    category: 'qa_evidence', // should be excluded from product_media gallery
    caption: null,
    uploaderId: 'user-2',
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  },
];

describe('FeatureReferencesAndMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskLinkServiceMocks.listLinks.mockResolvedValue([...mockLinks]);
    attachmentServiceMocks.listAttachments.mockResolvedValue([...mockAttachments]);
  });

  it('renders both references and media gallery within the section container', async () => {
    render(<FeatureReferencesAndMedia workspaceId="ws-1" taskId="task-1" canManage={true} />);

    expect(screen.getByRole('region', { name: 'Referensi dan Media' })).toBeInTheDocument();
    expect(screen.getByText('Referensi & Media Produk')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Figma UI Mockups')).toBeInTheDocument();
      expect(screen.getAllByText('Demo Walkthrough Video').length).toBeGreaterThan(0);
    });
  });

  describe('FeatureReferencesPanel', () => {
    it('renders list of links and direct redirect anchors with target="_blank"', async () => {
      render(<FeatureReferencesPanel workspaceId="ws-1" taskId="task-1" canManage={false} />);

      await waitFor(() => {
        expect(screen.getByText('Figma UI Mockups')).toBeInTheDocument();
      });

      const figmaAnchor = screen.getByTestId('direct-redirect-link-link-1');
      expect(figmaAnchor).toHaveAttribute('href', 'https://www.figma.com/design/sample123');
      expect(figmaAnchor).toHaveAttribute('target', '_blank');
      expect(figmaAnchor).toHaveAttribute('rel', 'noopener noreferrer');

      const videoAnchor = screen.getByTestId('direct-redirect-link-link-2');
      expect(videoAnchor).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(videoAnchor).toHaveAttribute('target', '_blank');
    });

    it('enforces RBAC: hides management controls for Developer / QA (canManage = false)', async () => {
      render(<FeatureReferencesPanel workspaceId="ws-1" taskId="task-1" canManage={false} />);

      await waitFor(() => {
        expect(screen.getByText('Figma UI Mockups')).toBeInTheDocument();
      });

      // Add link button should not exist
      expect(screen.queryByTestId('add-link-button')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tambah Tautan/i })).not.toBeInTheDocument();

      // Edit, delete, and reorder buttons should not exist
      expect(screen.queryByRole('button', { name: /Sunting tautan/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Hapus tautan/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Pindahkan ke atas/i })).not.toBeInTheDocument();
    });

    it('enforces RBAC: shows management controls for Owner / Admin / PO (canManage = true)', async () => {
      render(<FeatureReferencesPanel workspaceId="ws-1" taskId="task-1" canManage={true} />);

      await waitFor(() => {
        expect(screen.getByText('Figma UI Mockups')).toBeInTheDocument();
      });

      expect(screen.getByTestId('add-link-button')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Sunting tautan/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /Hapus tautan/i })).toHaveLength(2);
    });

    it('validates URL protocol and calls createLink when adding a reference link', async () => {
      taskLinkServiceMocks.createLink.mockResolvedValue({
        id: 'link-3',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        title: 'Project Roadmap',
        url: 'https://docs.google.com/spreadsheets/d/123',
        linkType: 'sheet',
        sortOrder: 2,
        createdBy: 'user-1',
        createdAt: '2026-11-09T00:00:00.000Z',
        updatedAt: '2026-11-09T00:00:00.000Z',
      });

      render(<FeatureReferencesPanel workspaceId="ws-1" taskId="task-1" canManage={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('add-link-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('add-link-button'));

      expect(screen.getByRole('heading', { name: 'Tambah Tautan Referensi' })).toBeInTheDocument();

      // Attempt to submit with invalid protocol
      fireEvent.change(screen.getByTestId('link-title-input'), {
        target: { value: 'Insecure Link' },
      });
      fireEvent.change(screen.getByTestId('link-url-input'), {
        target: { value: 'http://insecure.com' },
      });
      fireEvent.click(screen.getByTestId('submit-link-button'));

      expect(
        screen.getByText('Hanya tautan aman dengan protokol https:// yang diizinkan.'),
      ).toBeInTheDocument();

      // Submit with valid https URL
      fireEvent.change(screen.getByTestId('link-title-input'), {
        target: { value: 'Project Roadmap' },
      });
      fireEvent.change(screen.getByTestId('link-url-input'), {
        target: { value: 'https://docs.google.com/spreadsheets/d/123' },
      });
      fireEvent.change(screen.getByTestId('link-type-select'), { target: { value: 'sheet' } });
      fireEvent.click(screen.getByTestId('submit-link-button'));

      await waitFor(() => {
        expect(taskLinkServiceMocks.createLink).toHaveBeenCalledWith('ws-1', 'task-1', {
          title: 'Project Roadmap',
          url: 'https://docs.google.com/spreadsheets/d/123',
          linkType: 'sheet',
        });
      });
    });

    it('calls deleteLink when confirmed in the delete modal', async () => {
      taskLinkServiceMocks.deleteLink.mockResolvedValue(undefined);

      render(<FeatureReferencesPanel workspaceId="ws-1" taskId="task-1" canManage={true} />);

      await waitFor(() => {
        expect(screen.getByText('Figma UI Mockups')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Hapus tautan/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByRole('heading', { name: 'Hapus Tautan Referensi' })).toBeInTheDocument();
      expect(screen.getByText(/Apakah Anda yakin ingin menghapus tautan/)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirm-delete-link-button'));

      await waitFor(() => {
        expect(taskLinkServiceMocks.deleteLink).toHaveBeenCalledWith('ws-1', 'task-1', 'link-1');
      });
    });
  });

  describe('FeatureMediaGallery', () => {
    it('filters attachments to category="product_media" and displays images', async () => {
      render(
        <FeatureMediaGallery
          workspaceId="ws-1"
          taskId="task-1"
          canManage={false}
          links={mockLinks}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('dashboard-preview.png')).toBeInTheDocument();
      });

      // 'qa-result.png' has category 'qa_evidence', should not be listed in media gallery
      expect(screen.queryByText('qa-result.png')).not.toBeInTheDocument();
    });

    it('embeds video player iframe when external video link is present in links', async () => {
      render(
        <FeatureMediaGallery
          workspaceId="ws-1"
          taskId="task-1"
          canManage={false}
          links={mockLinks}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Video Penjelasan Produk')).toBeInTheDocument();
      });

      const iframe = screen.getByTitle('Demo Walkthrough Video');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', expect.stringContaining('/embed/dQw4w9WgXcQ'));
    });

    it('enforces RBAC on upload: hides upload button for canManage = false', async () => {
      render(
        <FeatureMediaGallery
          workspaceId="ws-1"
          taskId="task-1"
          canManage={false}
          links={mockLinks}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('dashboard-preview.png')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Unggah Gambar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Hapus gambar/i })).not.toBeInTheDocument();
    });

    it('enforces RBAC on upload: shows upload and delete button for canManage = true', async () => {
      render(
        <FeatureMediaGallery
          workspaceId="ws-1"
          taskId="task-1"
          canManage={true}
          links={mockLinks}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('dashboard-preview.png')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Unggah Gambar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hapus gambar/i })).toBeInTheDocument();
    });
  });
});
