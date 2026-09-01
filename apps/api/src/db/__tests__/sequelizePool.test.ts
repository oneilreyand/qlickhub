import assert from 'node:assert';
import { describe, test } from 'node:test';
import { getSequelizePoolConfig } from '../sequelizePool.js';

describe('Sequelize pool configuration', () => {
  test('limits production processes to one database connection by default', () => {
    assert.strictEqual(getSequelizePoolConfig('production').max, 1);
    assert.strictEqual(getSequelizePoolConfig({ nodeEnv: 'production' }).max, 1);
  });

  test('keeps the local development pool capacity at 10 by default', () => {
    assert.strictEqual(getSequelizePoolConfig('development').max, 10);
    assert.strictEqual(getSequelizePoolConfig({ nodeEnv: 'development' }).max, 10);
    assert.strictEqual(getSequelizePoolConfig().max, 10);
  });

  test('defaults test environment pool to 10 connections', () => {
    assert.strictEqual(getSequelizePoolConfig('test').max, 10);
    assert.strictEqual(getSequelizePoolConfig({ nodeEnv: 'test' }).max, 10);
  });

  test('allows overriding pool max in development via positional parameter', () => {
    assert.strictEqual(getSequelizePoolConfig('development', 5).max, 5);
    assert.strictEqual(getSequelizePoolConfig('development', 20).max, 20);
  });

  test('allows overriding pool max via options object', () => {
    assert.strictEqual(getSequelizePoolConfig({ nodeEnv: 'development', poolMax: 15 }).max, 15);
    assert.strictEqual(getSequelizePoolConfig({ nodeEnv: 'production', poolMax: 2 }).max, 2);
  });

  test('falls back to environment default if poolMax is invalid or zero', () => {
    assert.strictEqual(getSequelizePoolConfig('development', 0).max, 10);
    assert.strictEqual(getSequelizePoolConfig('development', -5).max, 10);
    assert.strictEqual(getSequelizePoolConfig({ nodeEnv: 'production', poolMax: 0 }).max, 1);
    assert.strictEqual(getSequelizePoolConfig({ nodeEnv: 'production', poolMax: -1 }).max, 1);
  });

  test('preserves connection lifecycle parameters', () => {
    const config = getSequelizePoolConfig('development', 10);
    assert.strictEqual(config.min, 0);
    assert.strictEqual(config.acquire, 30000);
    assert.strictEqual(config.idle, 10000);
  });
});
