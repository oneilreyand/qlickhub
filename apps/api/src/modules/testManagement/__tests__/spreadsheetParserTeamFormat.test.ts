import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  findIgnoredSpreadsheetHeaders,
  findUnmappedSpreadsheetHeaders,
  resolveSpreadsheetColumnMapping,
} from '../spreadsheetParser.js';

const TEAM_HEADERS = [
  'Test Case ID',
  'Test Title',
  'Requirement ID',
  'Description (Langkah Uji)',
  'Expected Result',
  'Test Data',
  'Priority',
  'Type',
  'Status',
  'Evidance',
  'Notes',
  'Sprint',
  'Date',
];

describe('team spreadsheet header handling', () => {
  test('maps the team columns and skips result/metadata columns without errors', () => {
    const mapping = resolveSpreadsheetColumnMapping(TEAM_HEADERS);
    assert.strictEqual(mapping['Test Case ID'], 'external_reference');
    assert.strictEqual(mapping['Test Title'], 'title');
    assert.strictEqual(mapping['Requirement ID'], 'requirement_code');
    assert.strictEqual(mapping['Description (Langkah Uji)'], 'steps');
    assert.strictEqual(mapping['Priority'], 'priority');
    assert.deepStrictEqual(findUnmappedSpreadsheetHeaders(TEAM_HEADERS), []);
    assert.deepStrictEqual(findIgnoredSpreadsheetHeaders(TEAM_HEADERS), [
      'Status',
      'Evidance',
      'Notes',
      'Sprint',
      'Date',
    ]);
  });

  test('still reports genuinely unknown columns', () => {
    assert.deepStrictEqual(findUnmappedSpreadsheetHeaders(['Title', 'Warna Favorit']), [
      'Warna Favorit',
    ]);
  });
});
