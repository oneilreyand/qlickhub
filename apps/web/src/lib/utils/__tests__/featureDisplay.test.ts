import { describe, expect, it } from 'vitest';
import {
  formatDateRange,
  formatShortDate,
  getAreaLabel,
  getFolderPath,
  getInitials,
} from '../featureDisplay';

const folders = [
  {
    id: 'y2026',
    name: '2026',
    children: [
      { id: 'okt', name: 'Oktober' },
      { id: 'nov', name: 'November' },
    ],
  },
  { id: 'y2027', name: '2027' },
];

describe('featureDisplay', () => {
  it('mengembalikan jalur folder dari akar', () => {
    expect(getFolderPath(folders, 'okt')).toEqual(['2026', 'Oktober']);
    expect(getFolderPath(folders, 'y2027')).toEqual(['2027']);
    expect(getFolderPath(folders, 'tidak-ada')).toEqual([]);
    expect(getFolderPath(folders, null)).toEqual([]);
  });

  it('memformat tanggal tanpa bergeser zona waktu', () => {
    expect(formatShortDate('2026-09-30')).toBe('30 Sep');
    expect(formatShortDate('2026-10-05T00:00:00.000Z')).toBe('5 Okt');
    expect(formatShortDate(null)).toBe('');
    expect(formatDateRange('2026-09-30', '2026-10-05')).toBe('30 Sep – 5 Okt');
    expect(formatDateRange('2026-09-30', null)).toBe('30 Sep');
    expect(formatDateRange(null, null)).toBe('');
  });

  it('membuat inisial dan label area', () => {
    expect(getInitials('Reyand Oneil')).toBe('RO');
    expect(getInitials('Sari')).toBe('S');
    expect(getInitials('')).toBe('?');
    expect(getAreaLabel('backend')).toBe('BE');
    expect(getAreaLabel('frontend')).toBe('FE');
    expect(getAreaLabel(null)).toBe('—');
  });
});
