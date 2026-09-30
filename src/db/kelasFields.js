export const KELAS_HEADERS = ['No', 'Nama Kelas', 'Tingkat', 'Wali Kelas', 'Ruang', 'Kapasitas'];

export const TINGKAT_OPTIONS = ['1', '2', '3', '4', '5', '6'];

// waliKelasOptions diisi dinamis dari data Guru asli (lihat DataKelas.jsx)
export function buildKelasFields(waliKelasOptions) {
  return [
    { key: 'Nama Kelas', label: 'Nama Kelas', type: 'text', required: true, placeholder: 'mis. Kelas 1A' },
    { key: 'Tingkat', label: 'Tingkat', type: 'select', options: TINGKAT_OPTIONS, required: true },
    { key: 'Wali Kelas', label: 'Wali Kelas', type: 'select', options: waliKelasOptions },
    { key: 'Ruang', label: 'Ruang', type: 'text', placeholder: 'mis. Ruang 1A' },
    { key: 'Kapasitas', label: 'Kapasitas', type: 'number', placeholder: 'mis. 28' },
  ];
}

export function emptyKelasRow() {
  return { 'Nama Kelas': '', 'Tingkat': '', 'Wali Kelas': '', 'Ruang': '', 'Kapasitas': '' };
}

export function normalizeSheetKelas(row, idx) {
  return {
    id: 'KELAS-' + (row['No'] ?? idx),
    no: row['No'],
    namaKelas: String(row['Nama Kelas'] ?? '').trim(),
    tingkat: String(row['Tingkat'] ?? '').trim(),
    waliKelas: String(row['Wali Kelas'] ?? '').trim(),
    ruang: String(row['Ruang'] ?? '').trim(),
    kapasitas: row['Kapasitas'],
  };
}
