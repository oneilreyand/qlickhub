import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { TaskCommentBox, EMPTY_DISCUSSION_ILLUSTRATION_URL } from '../TaskCommentBox';
import type { TaskComment } from '@qlick/contracts';

describe('TaskCommentBox Molecule Component', () => {
  const mockMembers = [
    {
      userId: 'user-1',
      role: 'po',
      user: { name: 'Sarah PO', email: 'sarah@qlick.test' },
    },
    {
      userId: 'user-2',
      role: 'dev',
      user: { name: 'Bob Developer', email: 'bob@qlick.test' },
    },
    {
      userId: 'user-3',
      role: 'qa',
      user: { name: 'Charlie QA', email: 'charlie@qlick.test' },
    },
  ];

  const mockComments: TaskComment[] = [
    {
      id: 'comm-1',
      workspaceId: 'ws-1',
      taskId: 'task-1',
      authorId: 'user-2',
      authorName: 'Bob Developer',
      parentCommentId: null,
      body: 'Here is the API draft response: https://example.com/api-docs.png',
      editedAt: null,
      deletedAt: null,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
      mentions: [],
      replies: [
        {
          id: 'comm-2',
          workspaceId: 'ws-1',
          taskId: 'task-1',
          authorId: 'user-3',
          authorName: 'Charlie QA',
          parentCommentId: 'comm-1',
          body: 'Looks good! Terverifikasi on staging environment.',
          editedAt: '2026-08-20T10:15:00.000Z',
          deletedAt: null,
          createdAt: '2026-08-20T10:10:00.000Z',
          updatedAt: '2026-08-20T10:15:00.000Z',
          mentions: [],
        },
      ],
    },
  ];

  it('renders root comments and nested replies with author avatar and role badges', () => {
    render(
      <TaskCommentBox
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        title="Diskusi Kolaborasi Subtask"
        onPostComment={vi.fn()}
      />,
    );

    // Title and total comments count
    expect(screen.getByText('Diskusi Kolaborasi Subtask')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();

    // Authors and role badges
    expect(screen.getByText('Bob Developer')).toBeInTheDocument();
    expect(screen.getByText('Anda (DEV)')).toBeInTheDocument();

    expect(screen.getByText('Charlie QA')).toBeInTheDocument();
    expect(screen.getByText('QA')).toBeInTheDocument();

    // Edited indicator on reply
    expect(screen.getByText(/✏️ diedit/i)).toBeInTheDocument();
  });

  it('allows adding member mentions and @channel broadcast', () => {
    const handlePostComment = vi.fn();
    render(
      <TaskCommentBox
        comments={[]}
        currentUserId="user-1"
        members={mockMembers}
        showMentionChips={true}
        onPostComment={handlePostComment}
      />,
    );

    // @channel broadcast chip click
    const channelBtn = screen.getByRole('button', { name: /@channel/i });
    fireEvent.click(channelBtn);

    const input = screen.getByPlaceholderText(/Write a message to your team/i);
    expect(input).toHaveValue('@channel ');

    // Member mention chip click
    const memberChip = screen.getByRole('button', { name: /@Bob Developer/i });
    fireEvent.click(memberChip);

    expect(memberChip).toHaveClass('bg-[#B1E743]');
  });

  it('adds image and video links to a root comment through application modals', () => {
    const promptSpy = vi.spyOn(window, 'prompt');
    render(
      <TaskCommentBox
        comments={[]}
        currentUserId="user-1"
        members={mockMembers}
        onPostComment={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /\+ Image Link/i }));

    const imageDialog = screen.getByRole('dialog', { name: /Tambahkan tautan gambar/i });
    fireEvent.change(within(imageDialog).getByLabelText(/URL gambar/i), {
      target: { value: 'https://example.com/screenshot.png' },
    });
    fireEvent.click(within(imageDialog).getByRole('button', { name: /Tambahkan gambar/i }));

    const input = screen.getByPlaceholderText(/Write a message to your team/i);
    expect(input).toHaveValue('https://example.com/screenshot.png');

    const videoBtn = screen.getByRole('button', { name: /\+ Video Link/i });
    fireEvent.click(videoBtn);

    const videoDialog = screen.getByRole('dialog', { name: /Tambahkan tautan video/i });
    fireEvent.change(within(videoDialog).getByLabelText(/URL video/i), {
      target: { value: 'https://example.com/demo.mp4' },
    });
    fireEvent.click(within(videoDialog).getByRole('button', { name: /Tambahkan video/i }));

    expect(input).toHaveValue('https://example.com/screenshot.png\nhttps://example.com/demo.mp4');
    expect(promptSpy).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('adds a video link through the bubble discussion modal', () => {
    render(
      <TaskCommentBox
        variant="bubble"
        comments={[]}
        currentUserId="user-1"
        members={mockMembers}
        onPostComment={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /\+ Video Link/i }));
    const dialog = screen.getByRole('dialog', { name: /Tambahkan tautan video/i });
    fireEvent.change(within(dialog).getByLabelText(/URL video/i), {
      target: { value: 'https://example.com/bubble-demo.mp4' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Tambahkan video/i }));

    expect(screen.getByPlaceholderText(/Tulis pesan untuk tim/i)).toHaveValue(
      'https://example.com/bubble-demo.mp4',
    );
  });

  it('adds an image link to an inline reply through the application modal', () => {
    render(
      <TaskCommentBox
        comments={mockComments}
        currentUserId="user-1"
        members={mockMembers}
        onPostComment={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Balas/i }));
    fireEvent.click(screen.getByRole('button', { name: /\+ Gambar/i }));

    const dialog = screen.getByRole('dialog', { name: /Tambahkan tautan gambar/i });
    fireEvent.change(within(dialog).getByLabelText(/URL gambar/i), {
      target: { value: 'https://example.com/reply-screenshot.png' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Tambahkan gambar/i }));

    expect(screen.getByPlaceholderText(/Tulis balasan langsung untuk @Bob Developer/i)).toHaveValue(
      'https://example.com/reply-screenshot.png',
    );
  });

  it('opens contextual inline reply box under parent comment and handles reply submit', async () => {
    const handlePostComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        comments={mockComments}
        currentUserId="user-1"
        members={mockMembers}
        onPostComment={handlePostComment}
      />,
    );

    // Click "Balas" button on Bob's comment
    const replyBtn = screen.getByRole('button', { name: /Balas/i });
    fireEvent.click(replyBtn);

    expect(screen.getByText(/Membalas @Bob Developer/i)).toBeInTheDocument();

    const replyInput = screen.getByPlaceholderText(/Tulis balasan langsung untuk @Bob Developer/i);
    fireEvent.change(replyInput, { target: { value: 'Great work Bob, ready to merge!' } });

    const submitReplyBtn = screen.getByRole('button', { name: /Kirim Balasan/i });
    await act(async () => {
      fireEvent.click(submitReplyBtn);
    });

    expect(handlePostComment).toHaveBeenCalledWith('Great work Bob, ready to merge!', 'comm-1');
  });

  it('handles in-place multi-line comment editing', async () => {
    const handleUpdateComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={vi.fn()}
        onUpdateComment={handleUpdateComment}
      />,
    );

    // Click edit on Bob's own message
    const editBtn = screen.getByRole('button', { name: /Edit pesan/i });
    fireEvent.click(editBtn);

    // Form switches to textarea editor
    const editTextarea = screen.getByDisplayValue(/Here is the API draft response/i);
    expect(editTextarea).toBeInTheDocument();

    fireEvent.change(editTextarea, { target: { value: 'Updated API draft response with schema' } });

    const saveBtn = screen.getByRole('button', { name: /Simpan/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleUpdateComment).toHaveBeenCalledWith(
      'comm-1',
      'Updated API draft response with schema',
    );
  });

  it.each(['thread', 'bubble'] as const)(
    'never shows edit or delete actions for another account message in the %s layout',
    (variant) => {
      render(
        <TaskCommentBox
          variant={variant}
          comments={mockComments}
          currentUserId="user-1"
          members={mockMembers}
          onPostComment={vi.fn()}
          onUpdateComment={vi.fn()}
          onDeleteComment={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /Edit pesan/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Hapus pesan/i })).not.toBeInTheDocument();
    },
  );

  it('renders bubble variant with WhatsApp-style layout (self right, other left) and bottom input bar', async () => {
    const handlePostComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        variant="bubble"
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={handlePostComment}
      />,
    );

    // Title and total comments count badge
    expect(screen.getByText('Diskusi Kolaborasi Subtask')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // User-2 is currentUserId -> displayed as Anda (DEV)
    expect(screen.getByText(/Anda \(DEV\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Here is the API draft response/i)).toBeInTheDocument();

    // User-3 is other member -> displayed as Charlie QA
    expect(screen.getByText('Charlie QA')).toBeInTheDocument();
    expect(
      screen.getByText(/Looks good! Terverifikasi on staging environment/i),
    ).toBeInTheDocument();

    // Send new message via bubble bottom bar
    const input = screen.getByPlaceholderText(/Tulis pesan untuk tim/i);
    fireEvent.change(input, { target: { value: 'New message from developer' } });

    const sendBtn = screen.getByRole('button', { name: /Kirim/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(handlePostComment).toHaveBeenCalledWith('New message from developer', null, []);
  });

  it('opens delete confirmation modal when delete button is clicked and cancels on cancel', async () => {
    const handleDeleteComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={vi.fn()}
        onDeleteComment={handleDeleteComment}
      />,
    );

    // Click delete button on user-2's comment
    const deleteBtn = screen.getByRole('button', { name: /Hapus pesan/i });
    fireEvent.click(deleteBtn);

    // Modal dialog should appear
    const dialog = screen.getByRole('dialog', { name: /Hapus komentar\?/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Yakin ingin menghapus komentar ini/i)).toBeInTheDocument();

    // Click cancel button
    const cancelBtn = within(dialog).getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelBtn);

    // Modal should close and onDeleteComment should not be called
    expect(screen.queryByRole('dialog', { name: /Hapus komentar\?/i })).not.toBeInTheDocument();
    expect(handleDeleteComment).not.toHaveBeenCalled();
  });

  it('opens delete confirmation modal and calls onDeleteComment on confirm', async () => {
    const handleDeleteComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={vi.fn()}
        onDeleteComment={handleDeleteComment}
      />,
    );

    // Click delete button
    const deleteBtn = screen.getByRole('button', { name: /Hapus pesan/i });
    fireEvent.click(deleteBtn);

    // Modal dialog should appear
    const dialog = screen.getByRole('dialog', { name: /Hapus komentar\?/i });
    expect(dialog).toBeInTheDocument();

    // Click confirm delete button
    const confirmDeleteBtn = within(dialog).getByRole('button', { name: /Hapus Komentar/i });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    expect(handleDeleteComment).toHaveBeenCalledWith('comm-1');
    expect(screen.queryByRole('dialog', { name: /Hapus komentar\?/i })).not.toBeInTheDocument();
  });

  it('renders stream variant with team stream layout, role badges, and sticky bottom dock', () => {
    const streamMembers = [
      {
        userId: 'user-1',
        role: 'po',
        user: { name: 'Sarah PO', email: 'sarah@qlick.test' },
      },
      {
        userId: 'user-2',
        role: 'dev',
        specialty: 'frontend' as const,
        user: { name: 'Bob Developer', email: 'bob@qlick.test' },
      },
      {
        userId: 'user-3',
        role: 'qa',
        user: { name: 'Charlie QA', email: 'charlie@qlick.test' },
      },
    ];

    render(
      <TaskCommentBox
        variant="stream"
        comments={mockComments}
        currentUserId="user-2"
        members={streamMembers}
        onPostComment={vi.fn()}
      />,
    );

    // Title & count
    expect(screen.getByText(/Diskusi Kolaborasi Tim/i)).toBeInTheDocument();

    // Role Badges: user-2 is current user -> 'Anda'
    expect(screen.getByText(/Anda/i)).toBeInTheDocument();
    // user-3 reply -> 'QA'
    expect(screen.getByText('QA')).toBeInTheDocument();

    // Tools in sticky bottom dock
    expect(screen.getByRole('button', { name: /@channel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Image Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Video Link/i })).toBeInTheDocument();
    expect(screen.getByText(/Ctrl/i)).toBeInTheDocument();
    expect(screen.getByText(/untuk kirim/i)).toBeInTheDocument();
  });

  it('handles keyboard shortcuts in stream variant: Enter allows newline, Ctrl+Enter or Cmd+Enter submits', async () => {
    const handlePostComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        variant="stream"
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={handlePostComment}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Write a message to your team/i);
    fireEvent.change(textarea, { target: { value: 'Line 1 of comment' } });

    // Plain Enter should NOT trigger submit
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: false, metaKey: false });
    expect(handlePostComment).not.toHaveBeenCalled();

    // Ctrl + Enter should trigger submit
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    });
    expect(handlePostComment).toHaveBeenCalledWith('Line 1 of comment', null, []);
  });

  it('renders top-positioned pagination button in stream variant and calls onLoadMore', () => {
    const handleLoadMore = vi.fn();
    render(
      <TaskCommentBox
        variant="stream"
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        hasMore={true}
        onLoadMore={handleLoadMore}
        onPostComment={vi.fn()}
      />,
    );

    const loadMoreBtn = screen.getByRole('button', { name: /Muat komentar sebelumnya/i });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);
    expect(handleLoadMore).toHaveBeenCalledTimes(1);
  });

  it('supports inline reply and delete modal in stream variant', async () => {
    const handlePostComment = vi.fn().mockResolvedValue(undefined);
    const handleDeleteComment = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskCommentBox
        variant="stream"
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={handlePostComment}
        onDeleteComment={handleDeleteComment}
      />,
    );

    // Click "Balas" button on parent comment
    const replyButtons = screen.getAllByRole('button', { name: /Balas/i });
    fireEvent.click(replyButtons[0]);

    expect(screen.getByText(/Membalas @Bob Developer/i)).toBeInTheDocument();
    const replyInput = screen.getByPlaceholderText(/Tulis balasan langsung untuk @Bob Developer/i);
    fireEvent.change(replyInput, { target: { value: 'Balasan tim FE' } });

    const sendReplyBtn = screen.getByRole('button', { name: /Kirim Balasan/i });
    await act(async () => {
      fireEvent.click(sendReplyBtn);
    });
    expect(handlePostComment).toHaveBeenCalledWith('Balasan tim FE', 'comm-1');

    // Delete comment
    const deleteBtn = screen.getByRole('button', { name: /Hapus pesan/i });
    fireEvent.click(deleteBtn);

    const dialog = screen.getByRole('dialog', { name: /Hapus pesan\?/i });
    expect(dialog).toBeInTheDocument();

    const confirmDeleteBtn = within(dialog).getByRole('button', { name: /Hapus Pesan/i });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });
    expect(handleDeleteComment).toHaveBeenCalledWith('comm-1');
  });

  it('renders empty discussion illustration and falls back to default icon when image loading fails in stream variant', () => {
    render(
      <TaskCommentBox
        variant="stream"
        comments={[]}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={vi.fn()}
      />,
    );

    // Initial render: empty illustration img is displayed with valid link
    const img = screen.getByAltText('Belum ada pesan diskusi');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', EMPTY_DISCUSSION_ILLUSTRATION_URL);

    // Trigger onError (broken image) -> img unmounts and default icon takes over
    fireEvent.error(img);
    expect(screen.queryByAltText('Belum ada pesan diskusi')).not.toBeInTheDocument();
    expect(screen.getByText('Belum ada pesan dalam diskusi ini. Mulai percakapan pertama!')).toBeInTheDocument();
  });

  it('renders empty discussion illustration and falls back to default icon in thread variant', () => {
    render(
      <TaskCommentBox
        variant="thread"
        comments={[]}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={vi.fn()}
      />,
    );

    const img = screen.getByAltText('Belum ada pesan diskusi');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', EMPTY_DISCUSSION_ILLUSTRATION_URL);

    // Trigger onError (broken image)
    fireEvent.error(img);
    expect(screen.queryByAltText('Belum ada pesan diskusi')).not.toBeInTheDocument();
  });

  it('renders default icon directly if emptyIllustrationUrl is empty or not provided', () => {
    render(
      <TaskCommentBox
        variant="stream"
        comments={[]}
        currentUserId="user-2"
        members={mockMembers}
        emptyIllustrationUrl=""
        onPostComment={vi.fn()}
      />,
    );

    // No image tag should be rendered
    expect(screen.queryByAltText('Belum ada pesan diskusi')).not.toBeInTheDocument();
    expect(screen.getByText('Belum ada pesan dalam diskusi ini. Mulai percakapan pertama!')).toBeInTheDocument();
  });
});
