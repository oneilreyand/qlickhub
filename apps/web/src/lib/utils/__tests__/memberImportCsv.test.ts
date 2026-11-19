import { describe, expect, it } from 'vitest';
import { MEMBER_IMPORT_CSV_EXAMPLE, parseMemberImportCsv } from '../memberImportCsv';

describe('parseMemberImportCsv (MEMBER-ACCESS-HUB P4)', () => {
  it('reads the example with header, quotes and an empty specialty column', () => {
    expect(parseMemberImportCsv(MEMBER_IMPORT_CSV_EXAMPLE)).toEqual({
      error: null,
      rows: [
        { email: 'rina@perusahaan.com', workspace: 'Acme Core', role: 'qa', specialties: '' },
        {
          email: 'budi@perusahaan.com',
          workspace: 'acme-core',
          role: 'dev',
          specialties: 'frontend;backend',
        },
      ],
    });
  });

  it('accepts Indonesian headers in any order, quoted commas, BOM and CRLF', () => {
    const text =
      '\uFEFFPeran,Surel,Ruang Kerja,Spesialisasi\r\ndev,a@x.co,"Tim, Inti","frontend,mobile"\r\n\r\n';
    expect(parseMemberImportCsv(text).rows).toEqual([
      { email: 'a@x.co', workspace: 'Tim, Inti', role: 'dev', specialties: 'frontend,mobile' },
    ]);
  });

  it('uses semicolons when the first line has no commas (Excel, Indonesian locale)', () => {
    expect(parseMemberImportCsv('email;workspace;role\nb@x.co;Acme;qa').rows).toEqual([
      { email: 'b@x.co', workspace: 'Acme', role: 'qa', specialties: '' },
    ]);
  });

  it('treats a file without header as email, workspace, role, spesialisasi', () => {
    expect(parseMemberImportCsv('c@x.co,Acme,po').rows[0]).toEqual({
      email: 'c@x.co',
      workspace: 'Acme',
      role: 'po',
      specialties: '',
    });
  });

  it('reports empty files, missing columns and more than 200 rows', () => {
    expect(parseMemberImportCsv('  \n').error).toMatch(/kosong/);
    expect(parseMemberImportCsv('email,role\na@x.co,qa').error).toMatch(
      /email, workspace, dan role/,
    );
    expect(parseMemberImportCsv('email,workspace,role\n').error).toMatch(/Tidak ada baris/);
    const big = `email,workspace,role\n${'a@x.co,Acme,qa\n'.repeat(201)}`;
    expect(parseMemberImportCsv(big).error).toMatch(/Maksimal 200/);
  });
});
