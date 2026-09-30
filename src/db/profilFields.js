export const PROFIL_FIELDS = [
  { key: 'Nama Sekolah', label: 'Nama Sekolah', type: 'text', required: true },
  { key: 'NPSN', label: 'NPSN', type: 'text' },
  { key: 'Alamat', label: 'Alamat', type: 'text' },
  { key: 'Kepala Sekolah', label: 'Kepala Sekolah', type: 'text' },
  { key: 'Telepon', label: 'Telepon', type: 'text' },
  { key: 'Email', label: 'Email', type: 'email' },
];

export function emptyProfilRow() {
  const row = {};
  PROFIL_FIELDS.forEach(f => { row[f.key] = ''; });
  row['Logo'] = '';
  return row;
}

export function normalizeSheetProfil(row) {
  return {
    nama: String(row['Nama Sekolah'] ?? '').trim(),
    npsn: String(row['NPSN'] ?? '').trim(),
    alamat: String(row['Alamat'] ?? '').trim(),
    kepalaSekolah: String(row['Kepala Sekolah'] ?? '').trim(),
    telepon: String(row['Telepon'] ?? '').trim(),
    email: String(row['Email'] ?? '').trim(),
    logo: row['Logo'] ? String(row['Logo']) : null,
  };
}

// Batas ukuran file logo -- base64 disimpan di 1 sel Google Sheets (limit ~50.000 karakter/sel).
// 30KB file asli -> ~40KB base64, aman di bawah limit.
export const LOGO_MAX_BYTES = 30 * 1024;
