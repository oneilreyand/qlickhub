import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateThemeSource } from './checkTheme.mjs';

test('rejects a visual module with no Light/Dark strategy', () => {
  const violations = evaluateThemeSource('Card.tsx', '<div className="bg-white text-stone-900" />');

  assert.equal(violations.length, 1);
  assert.match(violations[0], /semantic theme tokens or a paired dark:/);
});

test('accepts paired Light/Dark utilities and semantic tokens', () => {
  assert.deepEqual(
    evaluateThemeSource(
      'Card.tsx',
      '<div className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100" />',
    ),
    [],
  );
  assert.deepEqual(
    evaluateThemeSource('Card.tsx', '<div className="bg-surface text-foreground border-border" />'),
    [],
  );
});

test('rejects a local dark application surface even when another element is paired', () => {
  const source = [
    '<div className="bg-white dark:bg-stone-900" />',
    '<div className="bg-[#151a20] text-white" />',
  ].join('\n');

  const violations = evaluateThemeSource('Schedule.tsx', source);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /in this className needs a Light\/Dark counterpart/);
});

test('allows a documented invariant media stage', () => {
  const source = [
    '// theme-check: invariant-media — video and image content needs a neutral dark stage.',
    '<div className="bg-black text-white" />',
  ].join('\n');

  assert.deepEqual(evaluateThemeSource('Media.tsx', source), []);
});
