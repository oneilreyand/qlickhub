import assert from 'node:assert';
import { describe, test } from 'node:test';
import { getSequelizePoolConfig } from '../sequelizePool.js';

describe('Sequelize pool configuration', () => {
  test('limits production processes to one database connection', () => {
    assert.equal(getSequelizePoolConfig('production').max, 1);
  });

  test('keeps the local development pool capacity unchanged', () => {
    assert.equal(getSequelizePoolConfig('development').max, 10);
  });
});
