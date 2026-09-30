export const PEMELIHARAAN_HEADERS = ['No', 'Nama Aset', 'Tanggal', 'Jenis Pemeliharaan', 'Biaya', 'Keterangan', 'Status'];
import { todayWIB } from './helpers';

export const JENIS_PEMELIHARAAN_OPTIONS = ['Servis Rutin', 'Perbaikan', 'Penggantian Part', 'Lainnya'];
export const STATUS_PEMELIHARAAN_OPTIONS = ['Dalam Proses', 'Selesai'];

export function buildPemeliharaanFields(asetOptions) {
  return [
    { key: 'Nama Aset', label: 'Nama Aset', type: 'select', options: asetOptions, required: true },
    { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'Jenis Pemeliharaan', label: 'Jenis Pemeliharaan', type: 'select', options: JENIS_PEMELIHARAAN_OPTIONS, required: true },
    { key: 'Biaya', label: 'Biaya (Rp)', type: 'number' },
    { key: 'Keterangan', label: 'Keterangan', type: 'text', placeholder: 'mis. Ganti roda kursi yang patah' },
    { key: 'Status', label: 'Status', type: 'select', options: STATUS_PEMELIHARAAN_OPTIONS, required: true },
  ];
}

export function emptyPemeliharaanRow() {
  return { 'Nama Aset': '', Tanggal: todayWIB(), 'Jenis Pemeliharaan': '', Biaya: '', Keterangan: '', Status: 'Dalam Proses' };
}

export function normalizeSheetPemeliharaan(row, idx) {
  return {
    id: 'PML-' + (row['No'] ?? idx),
    no: row['No'],
    namaAset: String(row['Nama Aset'] ?? '').trim(),
    tanggal: String(row['Tanggal'] ?? '').trim(),
    jenis: String(row['Jenis Pemeliharaan'] ?? '').trim(),
    biaya: Number(row['Biaya']) || 0,
    keterangan: String(row['Keterangan'] ?? '').trim(),
    status: String(row['Status'] ?? '').trim(),
  };
}
