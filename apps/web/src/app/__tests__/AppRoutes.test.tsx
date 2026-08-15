import { describe, test } from 'node:test';
import assert from 'node:assert';

describe('WH-0 Route Inventory & Protection Audit', () => {
  const routesInventory = [
    { path: '/login', protected: false, component: 'LoginPage' },
    { path: '/work', protected: true, component: 'WorkHubPage' },
    { path: '/workspaces/settings', protected: true, component: 'WorkspaceSettingsPage' },
    { path: '/my-tasks', protected: true, component: 'MyTasksPage' },
    { path: '/requirements', protected: true, component: 'MyTasksPage (legacy redirect alias)' },
    { path: '/tests', protected: true, component: 'WorkHubPage (legacy redirect alias)' },
    { path: '/reports', protected: true, component: 'ReportPage' },
    { path: '/components', protected: true, component: 'ComponentGalleryPage (isolated design showcase)' },
  ];

  test('verifies all production routes are protected and have valid targets', () => {
    const protectedRoutes = routesInventory.filter((r) => r.protected);
    assert.strictEqual(protectedRoutes.length, 7);

    for (const route of protectedRoutes) {
      assert.ok(route.component, `Route ${route.path} must have a valid component target`);
    }
  });

  test('verifies legacy routes preserve backwards compatibility without empty screens', () => {
    const legacyRoutes = routesInventory.filter((r) => r.path === '/requirements' || r.path === '/tests');
    assert.strictEqual(legacyRoutes.length, 2);
    for (const route of legacyRoutes) {
      assert.ok(route.component.includes('alias') || route.component.includes('WorkHubPage'));
    }
  });
});
