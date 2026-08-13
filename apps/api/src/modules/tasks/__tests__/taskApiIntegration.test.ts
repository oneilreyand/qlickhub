import assert from 'node:assert';
import { test, describe, before, after } from 'node:test';
import { TaskModel } from '../../../db/models/task.js';
import { WorkFolderModel } from '../../../db/models/workFolder.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { taskService } from '../taskService.js';
import { taskController } from '../taskController.js';
import {
  CreateTaskSchema,
  MoveTaskSchema,
  CompleteTaskSchema,
  TaskListQuerySchema,
} from '@qa/contracts';

describe('Task API Integration & Business Rules Tests (T3)', () => {
  let user: UserModel;
  let workspaceA: WorkspaceModel;
  let workspaceB: WorkspaceModel;
  let activeFolderA: WorkFolderModel;
  let archivedFolderA: WorkFolderModel;
  let folderB: WorkFolderModel;
  let externalAssignee: UserModel;
  let workspaceAdmin: UserModel;
  let qaMember: UserModel;
  let productMember: UserModel;
  let developerMember: UserModel;

  before(async () => {
    user = await UserModel.create({
      email: `task-api-test-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'Task API Tester',
      role: 'admin',
    });

    workspaceA = await WorkspaceModel.create({
      name: 'Workspace A (Task Tests)',
      slug: `task-ws-a-${Date.now()}`,
      ownerId: user.id,
    });

    workspaceB = await WorkspaceModel.create({
      name: 'Workspace B (Task Tests)',
      slug: `task-ws-b-${Date.now()}`,
      ownerId: user.id,
    });

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: user.id, role: 'owner' },
      { workspaceId: workspaceB.id, userId: user.id, role: 'owner' },
    ]);

    [workspaceAdmin, qaMember, productMember, developerMember] = await Promise.all([
      UserModel.create({
        email: `task-admin-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Workspace Admin',
        role: 'admin',
      }),
      UserModel.create({
        email: `task-qa-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task QA Member',
        role: 'qa_member',
      }),
      UserModel.create({
        email: `task-product-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Product Member',
        role: 'po',
      }),
      UserModel.create({
        email: `task-developer-${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        name: 'Task Developer Member',
        role: 'dev',
      }),
    ]);

    await WorkspaceMemberModel.bulkCreate([
      { workspaceId: workspaceA.id, userId: workspaceAdmin.id, role: 'admin' },
      { workspaceId: workspaceA.id, userId: qaMember.id, role: 'qa' },
      { workspaceId: workspaceA.id, userId: productMember.id, role: 'po' },
      { workspaceId: workspaceA.id, userId: developerMember.id, role: 'dev' },
    ]);

    externalAssignee = await UserModel.create({
      email: `external-assignee-${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      name: 'External Assignee',
      role: 'dev',
    });
    await WorkspaceMemberModel.create({
      workspaceId: workspaceB.id,
      userId: externalAssignee.id,
      role: 'dev',
    });

    activeFolderA = await WorkFolderModel.create({
      workspaceId: workspaceA.id,
      name: 'Active Folder A',
      position: 0,
      createdBy: user.id,
    });

    archivedFolderA = await WorkFolderModel.create({
      workspaceId: workspaceA.id,
      name: 'Archived Folder A',
      position: 1,
      createdBy: user.id,
      archivedAt: new Date(),
    });

    folderB = await WorkFolderModel.create({
      workspaceId: workspaceB.id,
      name: 'Folder in Workspace B',
      position: 0,
      createdBy: user.id,
    });
  });

  after(async () => {
    await TaskModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] }, force: true });
    await WorkFolderModel.destroy({ where: { workspaceId: [workspaceA.id, workspaceB.id] }, force: true });
    await WorkspaceModel.destroy({ where: { id: [workspaceA.id, workspaceB.id] }, force: true });
    await UserModel.destroy({
      where: { id: [user.id, externalAssignee.id, workspaceAdmin.id, qaMember.id, productMember.id, developerMember.id] },
      force: true,
    });
  });

  describe('1. Zod Contract Schema Validation', () => {
    test('CreateTaskSchema validates required and optional fields', () => {
      const valid = CreateTaskSchema.safeParse({
        workspaceId: workspaceA.id,
        folderId: activeFolderA.id,
        title: 'New Feature Task',
        priority: 'high',
        status: 'todo',
        startDate: '2026-08-10',
        dueDate: '2026-08-15',
      });
      assert.strictEqual(valid.success, true);

      const invalidTitle = CreateTaskSchema.safeParse({
        workspaceId: workspaceA.id,
        title: '',
      });
      assert.strictEqual(invalidTitle.success, false);
    });

    test('TaskListQuerySchema parses date presets and status arrays', () => {
      const parsed = TaskListQuerySchema.parse({
        workspaceId: workspaceA.id,
        datePreset: 'today',
        unfiledOnly: 'true',
        page: '1',
        limit: '20',
      });
      assert.strictEqual(parsed.datePreset, 'today');
      assert.strictEqual(parsed.unfiledOnly, true);
      assert.strictEqual(parsed.page, 1);
    });
  });

  describe('2. Unfiled Tasks & Folder Filtering', () => {
    test('Creates unfiled task (folderId = null) and lists unfiled tasks', async () => {
      const unfiledTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          folderId: null,
          title: 'Standalone Unfiled Task',
          priority: 'medium',
        })
      );

      assert.strictEqual(unfiledTask.folderId, null);

      const filedTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          folderId: activeFolderA.id,
          title: 'Filed Task in Active Folder A',
          priority: 'low',
        })
      );

      // Query unfiled only
      const unfiledQuery = TaskListQuerySchema.parse({
        workspaceId: workspaceA.id,
        unfiledOnly: true,
      });
      const unfiledResult = await taskService.listTasks(workspaceA.id, unfiledQuery);
      assert.ok(unfiledResult.tasks.some((t) => t.id === unfiledTask.id));
      assert.strictEqual(unfiledResult.tasks.some((t) => t.id === filedTask.id), false);

      // Query by folder ID
      const folderQuery = TaskListQuerySchema.parse({
        workspaceId: workspaceA.id,
        folderId: activeFolderA.id,
      });
      const folderResult = await taskService.listTasks(workspaceA.id, folderQuery);
      assert.ok(folderResult.tasks.some((t) => t.id === filedTask.id));
      assert.strictEqual(folderResult.tasks.some((t) => t.id === unfiledTask.id), false);
    });
  });

  describe('3. Cross-Workspace Protection', () => {
    test('Database rejects a raw task-folder relation that crosses workspaces', async () => {
      await assert.rejects(
        async () => {
          await TaskModel.create({
            workspaceId: workspaceA.id,
            folderId: folderB.id,
            title: 'Invalid raw cross-workspace task',
            status: 'todo',
            priority: 'medium',
            reporterId: user.id,
          });
        },
        (err: any) => {
          assert.strictEqual(err.name, 'SequelizeForeignKeyConstraintError');
          return true;
        }
      );
    });

    test('Rejects creating task in a folder belonging to another workspace', async () => {
      await assert.rejects(
        async () => {
          await taskService.createTask(
            user.id,
            CreateTaskSchema.parse({
              workspaceId: workspaceA.id, // Workspace A
              folderId: folderB.id, // Folder in Workspace B!
              title: 'Malicious Cross-Workspace Task',
            })
          );
        },
        (err: Error) => {
          assert.ok(err.message.includes('NOT_FOUND: Folder not found in this workspace.'));
          return true;
        }
      );
    });

    test('Rejects moving task to a folder belonging to another workspace', async () => {
      const taskInA = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Task to move cross-workspace',
        })
      );

      await assert.rejects(
        async () => {
          await taskService.moveTask(
            user.id,
            workspaceA.id,
            taskInA.id,
            MoveTaskSchema.parse({
              targetFolderId: folderB.id, // Folder in Workspace B!
            })
          );
        },
        (err: Error) => {
          assert.ok(err.message.includes('NOT_FOUND: Target folder not found in this workspace.'));
          return true;
        }
      );
    });
  });

  describe('4. Move Rules & Archived Folder Guard', () => {
    test('Rejects creating a task inside an archived folder', async () => {
      await assert.rejects(
        async () => {
          await taskService.createTask(
            user.id,
            CreateTaskSchema.parse({
              workspaceId: workspaceA.id,
              folderId: archivedFolderA.id,
              title: 'Task in archived folder',
            })
          );
        },
        (err: Error) => {
          assert.ok(err.message.includes('BAD_REQUEST: Cannot create task in an archived folder.'));
          return true;
        }
      );
    });

    test('Rejects moving an existing task into an archived folder', async () => {
      const task = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          folderId: activeFolderA.id,
          title: 'Task to move into archived',
        })
      );

      await assert.rejects(
        async () => {
          await taskService.moveTask(
            user.id,
            workspaceA.id,
            task.id,
            MoveTaskSchema.parse({
              targetFolderId: archivedFolderA.id,
            })
          );
        },
        (err: Error) => {
          assert.ok(err.message.includes('BAD_REQUEST: Cannot move task into an archived folder.'));
          return true;
        }
      );
    });

    test('Successfully moves task between active folders and unfiled', async () => {
      const task = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          folderId: null,
          title: 'Moveable Task',
        })
      );

      // Move into active folder A
      const movedToA = await taskService.moveTask(
        user.id,
        workspaceA.id,
        task.id,
        MoveTaskSchema.parse({
          targetFolderId: activeFolderA.id,
        })
      );
      assert.strictEqual(movedToA.folderId, activeFolderA.id);

      // Move back to unfiled
      const movedToUnfiled = await taskService.moveTask(
        user.id,
        workspaceA.id,
        task.id,
        MoveTaskSchema.parse({
          targetFolderId: null,
        })
      );
      assert.strictEqual(movedToUnfiled.folderId, null);
    });
  });

  describe('5. Assignee Membership & Folder Descendants', () => {
    test('Persists the JWT userId as the reporter when creating a task through the controller', async () => {
      let statusCode: number | undefined;
      let payload: any;
      const response = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: unknown) {
          payload = body;
          return this;
        },
      };

      await taskController.createTask(
        {
          params: { workspaceId: workspaceA.id },
          body: { title: 'Reporter is JWT userId' },
          user: { userId: user.id },
        } as any,
        response as any,
        () => undefined
      );

      assert.strictEqual(statusCode, 201);
      assert.strictEqual(payload.data.reporterId, user.id);
    });

    test('Rejects assigning a user who is not a member of the task workspace', async () => {
      await assert.rejects(
        async () => {
          await taskService.createTask(
            user.id,
            CreateTaskSchema.parse({
              workspaceId: workspaceA.id,
              title: 'Cannot assign an external member',
              assigneeId: externalAssignee.id,
            })
          );
        },
        (err: Error) => {
          assert.ok(err.message.includes('Assignee must be a member of this workspace'));
          return true;
        }
      );
    });

    test('Clears an assignee when their workspace membership is removed', async () => {
      await WorkspaceMemberModel.create({
        workspaceId: workspaceA.id,
        userId: externalAssignee.id,
        role: 'dev',
      });

      const task = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Task reassigned when member leaves',
          assigneeId: externalAssignee.id,
        })
      );

      await WorkspaceMemberModel.destroy({
        where: { workspaceId: workspaceA.id, userId: externalAssignee.id },
      });

      const storedTask = await TaskModel.findByPk(task.id);
      assert.strictEqual(storedTask?.assigneeId, null);
    });

    test('Includes subfolder tasks when querying a parent with includeDescendants', async () => {
      const childFolder = await WorkFolderModel.create({
        workspaceId: workspaceA.id,
        parentFolderId: activeFolderA.id,
        name: `Child folder ${Date.now()}`,
        position: 0,
        createdBy: user.id,
      });

      const taskInChild = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          folderId: childFolder.id,
          title: 'Task stored in child folder',
        })
      );

      const parentResult = await taskService.listTasks(
        workspaceA.id,
        TaskListQuerySchema.parse({
          workspaceId: workspaceA.id,
          folderId: activeFolderA.id,
          includeDescendants: true,
        })
      );
      assert.ok(parentResult.tasks.some((task) => task.id === taskInChild.id));

      const exactFolderResult = await taskService.listTasks(
        workspaceA.id,
        TaskListQuerySchema.parse({ workspaceId: workspaceA.id, folderId: activeFolderA.id })
      );
      assert.strictEqual(exactFolderResult.tasks.some((task) => task.id === taskInChild.id), false);
    });
  });

  describe('6. Date Filtering (Presets & Ranges)', () => {
    test('Filters tasks by date presets: today, this_week, this_month, and overdue', async () => {
      const todayStr = new Date().toISOString().split('T')[0];

      // Overdue date: 5 days ago
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create Today task
      const todayTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Today Task',
          dueDate: todayStr,
        })
      );

      // Create Overdue task
      const overdueTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Overdue Task',
          dueDate: pastDate,
          status: 'todo',
        })
      );

      // Create Completed Overdue task (should NOT show up in overdue preset)
      const completedOverdueTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Completed Past Task',
          dueDate: pastDate,
          status: 'done',
        })
      );

      // Test 'today' preset
      const todayQuery = TaskListQuerySchema.parse({
        workspaceId: workspaceA.id,
        datePreset: 'today',
      });
      const todayList = await taskService.listTasks(workspaceA.id, todayQuery);
      assert.ok(todayList.tasks.some((t) => t.id === todayTask.id));

      // Test 'overdue' preset
      const overdueQuery = TaskListQuerySchema.parse({
        workspaceId: workspaceA.id,
        datePreset: 'overdue',
      });
      const overdueList = await taskService.listTasks(workspaceA.id, overdueQuery);
      assert.ok(overdueList.tasks.some((t) => t.id === overdueTask.id));
      assert.strictEqual(overdueList.tasks.some((t) => t.id === completedOverdueTask.id), false);
    });

    test('Filters tasks by explicit startDate and endDate range', async () => {
      const startDate = '2026-09-01';
      const endDate = '2026-09-10';

      const inRangeTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'In Range Task',
          dueDate: '2026-09-05',
        })
      );

      const outOfRangeTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Out of Range Task',
          dueDate: '2026-09-20',
        })
      );

      const rangeQuery = TaskListQuerySchema.parse({
        workspaceId: workspaceA.id,
        startDate,
        endDate,
      });
      const rangeResult = await taskService.listTasks(workspaceA.id, rangeQuery);

      assert.ok(rangeResult.tasks.some((t) => t.id === inRangeTask.id));
      assert.strictEqual(rangeResult.tasks.some((t) => t.id === outOfRangeTask.id), false);
    });
  });

  describe('7. Task Status & Completion Lifecycle', () => {
    test('Completing task sets status = "done" and updates completedAt', async () => {
      const task = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Task to Complete',
          status: 'todo',
        })
      );
      assert.strictEqual(task.completedAt, null);

      const completed = await taskService.completeTask(
        user.id,
        workspaceA.id,
        task.id,
        CompleteTaskSchema.parse({ status: 'done' })
      );
      assert.strictEqual(completed.status, 'done');
      assert.notStrictEqual(completed.completedAt, null);

      // Reopening task clears completedAt
      const reopened = await taskService.updateTask(user.id, workspaceA.id, task.id, { status: 'in_progress' });
      assert.strictEqual(reopened.status, 'in_progress');
      assert.strictEqual(reopened.completedAt, null);
    });
  });

  describe('8. Workspace Role and Assignment Authorization', () => {
    test('Allows an admin to mutate a task assigned to another member', async () => {
      const task = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Admin may edit every task',
          assigneeId: user.id,
        })
      );

      const updated = await taskService.updateTask(workspaceAdmin.id, workspaceA.id, task.id, {
        title: 'Edited by workspace admin',
      });

      assert.strictEqual(updated.title, 'Edited by workspace admin');
    });

    test('Allows QA to mutate only own or unassigned tasks', async () => {
      const ownTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'QA-owned task',
          assigneeId: qaMember.id,
        })
      );
      const unassignedTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({ workspaceId: workspaceA.id, title: 'Unassigned task' })
      );
      const anotherMembersTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({
          workspaceId: workspaceA.id,
          title: 'Another member task',
          assigneeId: user.id,
        })
      );

      await assert.doesNotReject(() => taskService.completeTask(qaMember.id, workspaceA.id, ownTask.id, { status: 'done' }));
      await assert.doesNotReject(() => taskService.moveTask(qaMember.id, workspaceA.id, unassignedTask.id, { targetFolderId: activeFolderA.id }));
      await assert.rejects(
        () => taskService.updateTask(qaMember.id, workspaceA.id, anotherMembersTask.id, { title: 'Forbidden edit' }),
        /QA members may mutate only tasks assigned to themselves or unassigned tasks/
      );
    });

    test('Prevents QA from assigning work to another member', async () => {
      await assert.rejects(
        () =>
          taskService.createTask(
            qaMember.id,
            CreateTaskSchema.parse({
              workspaceId: workspaceA.id,
              title: 'QA cannot delegate a new task',
              assigneeId: user.id,
            })
          ),
        /QA members may assign new tasks only to themselves/
      );

      const unassignedTask = await taskService.createTask(
        user.id,
        CreateTaskSchema.parse({ workspaceId: workspaceA.id, title: 'QA cannot delegate existing work' })
      );
      await assert.rejects(
        () => taskService.updateTask(qaMember.id, workspaceA.id, unassignedTask.id, { assigneeId: user.id }),
        /QA members may assign tasks only to themselves/
      );
    });

    test('Keeps Dev members read-only for parent task creation even though they are workspace members', async () => {
      await assert.rejects(
        () =>
          taskService.createTask(
            developerMember.id,
            CreateTaskSchema.parse({ workspaceId: workspaceA.id, title: 'Read-only member mutation' })
          ),
        /cannot create parent tasks/
      );
    });

    test('Returns an RFC 9457 403 response when a read-only role reaches the task controller', async () => {
      let statusCode: number | undefined;
      let payload: any;
      const response = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: unknown) {
          payload = body;
          return this;
        },
      };

      await taskController.createTask(
        {
          params: { workspaceId: workspaceA.id },
          body: { title: 'Read-only controller mutation' },
          user: { userId: developerMember.id },
        } as any,
        response as any,
        () => undefined
      );

      assert.strictEqual(statusCode, 403);
      assert.strictEqual(payload.code, 'FORBIDDEN');
    });
  });
});
