export const TAHUN_AJARAN_HEADERS = ['No', 'Label', 'Mulai', 'Selesai', 'Aktif'];

export const TAHUN_AJARAN_FIELDS = [
  { key: 'Label', label: 'Label (mis. 2026/2027)', type: 'text', required: true, placeholder: '2026/2027' },
  { key: 'Mulai', label: 'Tanggal Mulai', type: 'date', required: true },
  { key: 'Selesai', label: 'Tanggal Selesai', type: 'date', required: true },
];

export function emptyTahunAjaranRow() {
  return { Label: '', Mulai: '', Selesai: '' };
}

export function normalizeSheetTahunAjaran(row, idx) {
  return {
    id: 'TA-' + (row['No'] ?? idx),
    no: row['No'],
    label: String(row['Label'] ?? '').trim(),
    mulai: row['Mulai'],
    selesai: row['Selesai'],
    aktif: String(row['Aktif'] ?? '').trim().toUpperCase() === 'TRUE',
  };
}
