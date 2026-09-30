// "Kode", "Baik", "Rusak Ringan", "Rusak Berat", "Gambar", "Harga Estimasi" ditaruh di
// AKHIR (kompatibel mundur). "Kondisi"+"Jumlah" versi LAMA tetap ada di Sheets (data
// lama tidak hilang), tapi form & tampilan sekarang pakai kolom Baik/RR/RB terpisah --
// Total dihitung otomatis (Baik+RR+RB), TIDAK diisi manual.
export const ASET_HEADERS = ['No', 'Kode', 'Nama Aset', 'Kategori', 'Lokasi', 'Baik', 'Rusak Ringan', 'Rusak Berat', 'Tahun Perolehan', 'Keterangan', 'Harga Estimasi'];

export const KATEGORI_ASET_OPTIONS = [
  'Furniture', 'Elektronik', 'Alat Peraga / Edukasi', 'Alat Olahraga',
  'Buku & Perpustakaan', 'Kendaraan', 'Bangunan & Ruang', 'Lain-lain',
];

// Ukuran gambar dibatasi ketat -- 1 sel Google Sheets maks ~50.000 karakter,
// dan base64 menambah ~37% dari ukuran biner asli. Target base64 akhir <40rb
// karakter (sisa headroom), jadi gambar biner sebelum encode harus <~28KB --
// makanya gambar di-resize+kompresi otomatis (lihat ImageField.jsx) sebelum disimpan.
export const ASET_GAMBAR_MAX_BASE64 = 40000;

export const ASET_FIELDS = [
  { key: 'Kode', label: 'Kode Aset', type: 'text', placeholder: 'mis. INV-001 (diisi manual)' },
  { key: 'Nama Aset', label: 'Nama Aset', type: 'text', required: true, placeholder: 'mis. Meja Belajar Kelas 3' },
  { key: 'Kategori', label: 'Kategori', type: 'select', options: KATEGORI_ASET_OPTIONS, required: true },
  { key: 'Lokasi', label: 'Lokasi / Ruang', type: 'text', placeholder: 'mis. Ruang Kelas 3A' },
  { key: 'Baik', label: 'Jumlah Kondisi Baik', type: 'number' },
  { key: 'Rusak Ringan', label: 'Jumlah Rusak Ringan (RR)', type: 'number' },
  { key: 'Rusak Berat', label: 'Jumlah Rusak Berat (RB)', type: 'number' },
  { key: 'Harga Estimasi', label: 'Harga Estimasi per Unit (Rp)', type: 'number', placeholder: 'mis. 250000 -- opsional, utk hitung total nilai Sarpras' },
  { key: 'Tahun Perolehan', label: 'Tahun Perolehan', type: 'number', placeholder: 'mis. 2024' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
  { key: 'Gambar', label: 'Foto Aset', type: 'image' },
];

export function emptyAsetRow() {
  return { Kode: '', 'Nama Aset': '', Kategori: '', Lokasi: '', Baik: '', 'Rusak Ringan': '', 'Rusak Berat': '', 'Harga Estimasi': '', 'Tahun Perolehan': '', Keterangan: '', Gambar: '' };
}

// Logika breakdown Baik/RR/RB -- DIPISAH jadi fungsi sendiri (bukan cuma di dalam
// normalizeSheetAset) supaya bisa dipakai ULANG persis sama di tabel mentah (yg
// menampilkan raw row utk keperluan edit), bukan cuma di data yg sudah dinormalisasi.
// Tanpa ini, tabel bisa menampilkan kosong utk data lama padahal kartu ringkasan
// (yg pakai normalizeSheetAset) sudah benar menghitungnya -- jadi tidak konsisten.
export function hitungBreakdownAset(row) {
  const baikRaw = row['Baik'];
  const rrRaw = row['Rusak Ringan'];
  const rbRaw = row['Rusak Berat'];
  const adaDataBaru = [baikRaw, rrRaw, rbRaw].some(v => v !== undefined && v !== '');

  let baik = Number(baikRaw) || 0;
  let rusakRingan = Number(rrRaw) || 0;
  let rusakBerat = Number(rbRaw) || 0;

  if (!adaDataBaru) {
    const kondisiLama = String(row['Kondisi'] ?? '').trim();
    const jumlahLama = Number(row['Jumlah']) || 0;
    if (kondisiLama === 'Baik') baik = jumlahLama;
    else if (kondisiLama === 'Rusak Ringan') rusakRingan = jumlahLama;
    else if (kondisiLama === 'Rusak Berat') rusakBerat = jumlahLama;
  }

  return { baik, rusakRingan, rusakBerat, total: baik + rusakRingan + rusakBerat };
}

export function normalizeSheetAset(row, idx) {
  const { baik, rusakRingan, rusakBerat, total } = hitungBreakdownAset(row);
  const hargaEstimasi = Number(row['Harga Estimasi']) || 0;
  return {
    id: 'ASET-' + (row['No'] ?? idx),
    no: row['No'],
    kode: String(row['Kode'] ?? '').trim(),
    nama: String(row['Nama Aset'] ?? '').trim(),
    kategori: String(row['Kategori'] ?? '').trim(),
    lokasi: String(row['Lokasi'] ?? '').trim(),
    baik, rusakRingan, rusakBerat, total,
    hargaEstimasi,
    nilaiTotal: hargaEstimasi * total, // harga per unit x jumlah unit (semua kondisi)
    tahunPerolehan: row['Tahun Perolehan'],
    keterangan: String(row['Keterangan'] ?? '').trim(),
    gambar: String(row['Gambar'] ?? '').trim(),
  };
}
