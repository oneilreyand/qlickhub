import assert from 'node:assert';
import { describe, test } from 'node:test';
import { featureSpecRoutes } from '../featureSpecRoutes.js';

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: unknown[] };
}

function handlerCount(method: 'get' | 'post' | 'put' | 'patch', path: string): number {
  const layer = (featureSpecRoutes.stack as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route.methods[method],
  );
  assert.ok(layer?.route, `${method.toUpperCase()} ${path} is not registered`);
  return layer.route.stack.length;
}

const base = '/workspaces/:workspaceId/feature-specs';

describe('Feature Spec route wiring (guards against a handler landing on the wrong route)', () => {
  test('the list route runs only the member check and the list handler', () => {
    assert.strictEqual(handlerCount('get', base), 2);
  });

  test('read routes run the member check and one handler', () => {
    assert.strictEqual(handlerCount('get', `${base}/:specId`), 2);
    assert.strictEqual(handlerCount('get', `${base}/:specId/questions`), 2);
  });

  test('AI routes add the user and workspace rate limiters after the member check', () => {
    assert.strictEqual(handlerCount('post', `${base}/:specId/questions`), 4);
    assert.strictEqual(handlerCount('post', `${base}/:specId/generate/plan`), 4);
  });

  test('write routes run the planner check and one handler', () => {
    assert.strictEqual(handlerCount('post', base), 2);
    assert.strictEqual(handlerCount('put', `${base}/:specId/sections/:section`), 2);
    assert.strictEqual(handlerCount('patch', `${base}/:specId/questions/:questionId`), 2);
  });
});
