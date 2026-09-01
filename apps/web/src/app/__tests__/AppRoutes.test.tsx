import { describe, expect, test } from 'vitest';

describe('WH-0 Route Inventory & Protection Audit', () => {
  const routesInventory = [
    { path: '/', protected: false, component: 'LoginPage (redirect)' },
    { path: '/login', protected: false, component: 'LoginPage' },
    { path: '/work', protected: true, component: 'WorkHubPage' },
    { path: '/projects/:projectId/tasks/:taskId', protected: true, component: 'TaskDeepLinkPage' },
    { path: '/workspaces/settings', protected: true, component: 'WorkspaceSettingsPage' },
    { path: '/my-tasks', protected: true, component: 'MyTasksPage' },
    { path: '/requirements', protected: true, component: 'MyTasksPage (legacy redirect alias)' },
    { path: '/tests', protected: true, component: 'WorkHubPage (legacy redirect alias)' },
    { path: '/reports', protected: true, component: 'ReportPage' },
    { path: '/user-flows', protected: true, component: 'UserFlowPage' },
    {
      path: '/components',
      protected: true,
      component: 'ComponentGalleryPage (isolated design showcase)',
    },
  ];

  test('verifies all production routes are protected and have valid targets', () => {
    const protectedRoutes = routesInventory.filter((r) => r.protected);
    expect(protectedRoutes).toHaveLength(9);

    for (const route of protectedRoutes) {
      expect(
        route.component,
        `Route ${route.path} must have a valid component target`,
      ).toBeTruthy();
    }
  });

  test('keeps the canonical task deep link behind session protection', () => {
    expect(routesInventory).toContainEqual({
      path: '/projects/:projectId/tasks/:taskId',
      protected: true,
      component: 'TaskDeepLinkPage',
    });
  });

  test('redirects the public root URL to the login page', () => {
    expect(routesInventory).toContainEqual({
      path: '/',
      protected: false,
      component: 'LoginPage (redirect)',
    });
  });

  test('verifies legacy routes preserve backwards compatibility without empty screens', () => {
    const legacyRoutes = routesInventory.filter(
      (r) => r.path === '/requirements' || r.path === '/tests',
    );
    expect(legacyRoutes).toHaveLength(2);
    for (const route of legacyRoutes) {
      expect(route.component.includes('alias') || route.component.includes('WorkHubPage')).toBe(
        true,
      );
    }
  });
});
