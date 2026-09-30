// "Akun" ditaruh di AKHIR (kompatibel mundur) -- akun kas/bank yg BENAR-BENAR mengeluarkan
// uangnya, dipilih manual per transaksi.
export const PENGELUARAN_HEADERS = ['No', 'Tanggal', 'Kategori', 'Keterangan', 'Nominal', 'Akun'];
import { todayWIB } from './helpers';

export const KATEGORI_PENGELUARAN_OPTIONS = [
  'Gaji & Honor', 'Listrik / Air / Internet', 'ATK & Perlengkapan',
  'Pemeliharaan & Perbaikan', 'Kegiatan Siswa', 'Konsumsi', 'Lain-lain',
];

export const PENGELUARAN_FIELDS = [
  { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true },
  { key: 'Kategori', label: 'Kategori', type: 'select', options: KATEGORI_PENGELUARAN_OPTIONS, required: true },
  { key: 'Keterangan', label: 'Keterangan', type: 'text', required: true, placeholder: 'mis. Gaji guru bulan Juli 2026' },
  { key: 'Nominal', label: 'Nominal (Rp)', type: 'number', required: true },
];

export function emptyPengeluaranRow() {
  return { Tanggal: todayWIB(), Kategori: '', Keterangan: '', Nominal: '', Akun: 'Kas' };
}

export function normalizeSheetPengeluaran(row, idx) {
  return {
    id: 'PGL-' + (row['No'] ?? idx),
    no: row['No'],
    tanggal: String(row['Tanggal'] ?? '').trim(),
    kategori: String(row['Kategori'] ?? '').trim(),
    keterangan: String(row['Keterangan'] ?? '').trim(),
    nominal: Number(row['Nominal']) || 0,
    akun: String(row['Akun'] ?? '').trim(),
  };
}
