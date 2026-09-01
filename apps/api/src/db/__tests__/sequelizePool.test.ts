import assert from 'node:assert';
import { describe, test } from 'node:test';
import { getSequelizePoolConfig } from '../sequelizePool.js';

describe('Sequelize pool configuration', () => {
  test('limits production processes to one database connection', () => {
    assert.equal(getSequelizePoolConfig('production', true).max, 1);
  });

  test('keeps a local production-like process responsive without weakening Vercel limits', () => {
    assert.equal(getSequelizePoolConfig('production', false).max, 10);
  });

  test('allows an explicit bounded pool capacity for a managed deployment', () => {
    assert.equal(getSequelizePoolConfig('production', true, 2).max, 2);
  });
});
