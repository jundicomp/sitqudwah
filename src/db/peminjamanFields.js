export const PEMINJAMAN_HEADERS = ['No', 'Nama Aset', 'Peminjam', 'Jenis Peminjam', 'Jumlah', 'Tanggal Pinjam', 'Rencana Kembali', 'Tanggal Dikembalikan', 'Status'];
import { todayWIB } from './helpers';

export const JENIS_PEMINJAM_OPTIONS = ['Guru', 'Siswa', 'Staff', 'Lainnya'];
export const STATUS_PEMINJAMAN_OPTIONS = ['Dipinjam', 'Dikembalikan'];

// asetOptions diisi dinamis dari data Aset asli (lihat PeminjamanAset.jsx)
export function buildPeminjamanFields(asetOptions) {
  return [
    { key: 'Nama Aset', label: 'Nama Aset', type: 'select', options: asetOptions, required: true },
    { key: 'Peminjam', label: 'Nama Peminjam', type: 'text', required: true },
    { key: 'Jenis Peminjam', label: 'Jenis Peminjam', type: 'select', options: JENIS_PEMINJAM_OPTIONS, required: true },
    { key: 'Jumlah', label: 'Jumlah Dipinjam', type: 'number', required: true },
    { key: 'Tanggal Pinjam', label: 'Tanggal Pinjam', type: 'date', required: true },
    { key: 'Rencana Kembali', label: 'Rencana Kembali', type: 'date', required: true },
    { key: 'Tanggal Dikembalikan', label: 'Tanggal Dikembalikan (kosongkan kalau belum)', type: 'date' },
    { key: 'Status', label: 'Status', type: 'select', options: STATUS_PEMINJAMAN_OPTIONS, required: true },
  ];
}

export function emptyPeminjamanRow() {
  return {
    'Nama Aset': '', Peminjam: '', 'Jenis Peminjam': '', Jumlah: '',
    'Tanggal Pinjam': todayWIB(), 'Rencana Kembali': '',
    'Tanggal Dikembalikan': '', Status: 'Dipinjam',
  };
}

export function normalizeSheetPeminjaman(row, idx) {
  return {
    id: 'PJM-' + (row['No'] ?? idx),
    no: row['No'],
    namaAset: String(row['Nama Aset'] ?? '').trim(),
    peminjam: String(row['Peminjam'] ?? '').trim(),
    jenisPeminjam: String(row['Jenis Peminjam'] ?? '').trim(),
    jumlah: Number(row['Jumlah']) || 0,
    tanggalPinjam: String(row['Tanggal Pinjam'] ?? '').trim(),
    rencanaKembali: String(row['Rencana Kembali'] ?? '').trim(),
    tanggalDikembalikan: String(row['Tanggal Dikembalikan'] ?? '').trim(),
    status: String(row['Status'] ?? '').trim(),
  };
}
