import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TaskCommentBox } from '../TaskCommentBox';
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
          body: 'Looks good! Verified on staging environment.',
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
        title="Subtask Collaboration Discussion"
        onPostComment={vi.fn()}
      />
    );

    // Title and total comments count
    expect(screen.getByText('Subtask Collaboration Discussion')).toBeInTheDocument();
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
      />
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

  it('allows quick prompt for adding Image and Video links', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/demo.mp4');

    render(
      <TaskCommentBox
        comments={[]}
        currentUserId="user-1"
        members={mockMembers}
        onPostComment={vi.fn()}
      />
    );

    const videoBtn = screen.getByRole('button', { name: /\+ Video Link/i });
    fireEvent.click(videoBtn);

    expect(promptSpy).toHaveBeenCalledWith(expect.stringContaining('Video'));
    const input = screen.getByPlaceholderText(/Write a message to your team/i);
    expect(input).toHaveValue('https://example.com/demo.mp4');

    promptSpy.mockRestore();
  });

  it('opens contextual inline reply box under parent comment and handles reply submit', async () => {
    const handlePostComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        comments={mockComments}
        currentUserId="user-1"
        members={mockMembers}
        onPostComment={handlePostComment}
      />
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
      />
    );

    // Click edit on Bob's own message
    const editBtn = screen.getByRole('button', { name: /Edit message/i });
    fireEvent.click(editBtn);

    // Form switches to textarea editor
    const editTextarea = screen.getByDisplayValue(/Here is the API draft response/i);
    expect(editTextarea).toBeInTheDocument();

    fireEvent.change(editTextarea, { target: { value: 'Updated API draft response with schema' } });

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleUpdateComment).toHaveBeenCalledWith('comm-1', 'Updated API draft response with schema');
  });

  it('renders bubble variant with WhatsApp-style layout (self right, other left) and bottom input bar', async () => {
    const handlePostComment = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCommentBox
        variant="bubble"
        comments={mockComments}
        currentUserId="user-2"
        members={mockMembers}
        onPostComment={handlePostComment}
      />
    );

    // Title and total comments count badge
    expect(screen.getByText('Subtask Collaboration Discussion')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // User-2 is currentUserId -> displayed as Anda (DEV)
    expect(screen.getByText(/Anda \(DEV\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Here is the API draft response/i)).toBeInTheDocument();

    // User-3 is other member -> displayed as Charlie QA
    expect(screen.getByText('Charlie QA')).toBeInTheDocument();
    expect(screen.getByText(/Looks good! Verified on staging environment/i)).toBeInTheDocument();

    // Send new message via bubble bottom bar
    const input = screen.getByPlaceholderText(/Tulis pesan untuk tim/i);
    fireEvent.change(input, { target: { value: 'New message from developer' } });

    const sendBtn = screen.getByRole('button', { name: /Kirim/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(handlePostComment).toHaveBeenCalledWith('New message from developer', null, []);
  });
});
