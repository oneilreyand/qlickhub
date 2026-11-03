import { sequelize } from '../sequelize.js';

/**
 * Test support: runs `action` while recording every SQL statement Sequelize executes, so an
 * integration test can assert how many queries a request issues (for example, no N+1 loop).
 * The previous logging setting is always restored.
 */
export async function captureSql<T>(
  action: () => Promise<T>,
): Promise<{ result: T; statements: string[] }> {
  const statements: string[] = [];
  // `options` is a public runtime property that Sequelize's type definitions do not declare.
  const options = (sequelize as unknown as { options: { logging?: unknown } }).options;
  const previousLogging = options.logging;
  options.logging = (sql: string) => {
    statements.push(sql);
  };
  try {
    const result = await action();
    return { result, statements };
  } finally {
    options.logging = previousLogging;
  }
}
