import { todayWIB } from './helpers';

// "Akun" ditaruh di AKHIR (kompatibel mundur) -- akun kas/bank yg BENAR-BENAR menerima
// uangnya, dipilih manual per transaksi.
export const PEMASUKAN_LAIN_HEADERS = ['No', 'Tanggal', 'Kategori', 'Keterangan', 'Nominal', 'Akun'];

// Sumber pemasukan sekolah di LUAR SPP dan biaya siswa (Tagihan Lain) -- mis. donasi,
// bantuan pemerintah, bunga bank, sewa aset, dst. Sengaja SATU sheet terpisah dari
// Tagihan Lain krn Tagihan Lain itu per-siswa (nagih ke siswa), sedangkan ini pemasukan
// yg TIDAK terikat ke siswa manapun.
export const KATEGORI_PEMASUKAN_LAIN_OPTIONS = [
  'Donasi', 'Bantuan Pemerintah (BOS/BOP)', 'Bunga Bank', 'Sewa Aset', 'Penjualan Barang Bekas', 'Lain-lain',
];

export const PEMASUKAN_LAIN_FIELDS = [
  { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true },
  { key: 'Kategori', label: 'Kategori', type: 'select', options: KATEGORI_PEMASUKAN_LAIN_OPTIONS, required: true },
  { key: 'Keterangan', label: 'Keterangan', type: 'text', required: true, placeholder: 'mis. Donasi wali murid kelas 3' },
  { key: 'Nominal', label: 'Nominal (Rp)', type: 'number', required: true },
];

export function emptyPemasukanLainRow() {
  return { Tanggal: todayWIB(), Kategori: '', Keterangan: '', Nominal: '', Akun: 'Kas' };
}

export function normalizeSheetPemasukanLain(row, idx) {
  return {
    id: 'PML-' + (row['No'] ?? idx),
    no: row['No'],
    tanggal: String(row['Tanggal'] ?? '').trim(),
    kategori: String(row['Kategori'] ?? '').trim(),
    keterangan: String(row['Keterangan'] ?? '').trim(),
    nominal: Number(row['Nominal']) || 0,
    akun: String(row['Akun'] ?? '').trim(),
  };
}
