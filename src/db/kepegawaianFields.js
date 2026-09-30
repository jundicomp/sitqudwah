// Modul Kepegawaian: Jadwal Mengajar (turunan Jadwal Pelajaran), Presensi Guru & Staff,
// Penilaian Kinerja, Pelatihan & Sertifikasi. Istilah mengikuti versi HTML.
import { TINGKAT_LOMBA_OPTIONS, SEMESTER_OPTIONS } from './akademikFields';

export const STATUS_PRESENSI_GURU = ['Hadir', 'Sakit', 'Izin', 'Dinas Luar', 'Alpha'];
export const SINGKAT_PRESENSI_GURU = { Hadir: 'H', Sakit: 'S', Izin: 'I', 'Dinas Luar': 'DL', Alpha: 'A' };
export const JENIS_KEGIATAN_GURU = ['Pelatihan', 'Workshop', 'Seminar', 'Diklat', 'Sertifikasi Profesi', 'Studi Lanjut', 'Bimtek'];
export const TINGKAT_KEGIATAN = TINGKAT_LOMBA_OPTIONS;
export const ASPEK_KINERJA = ['Perencanaan', 'Pelaksanaan', 'Penilaian', 'Kedisiplinan', 'Komunikasi'];

// 1 JP di MI = 35 menit. Target beban mengajar guru bersertifikat = 24 JP/minggu.
export const MENIT_PER_JP = 35;
export const TARGET_JP_MINGGU = 24;

export const PRESENSI_GURU_HEADERS = ['No', 'Tanggal', 'Nama', 'NIP', 'Kategori', 'Status', 'Jam Masuk', 'Jam Pulang', 'Metode', 'Menit Terlambat', 'Keterangan', 'Dicatat Oleh'];
export const KINERJA_HEADERS = ['No', 'Tahun Ajaran', 'Semester', 'Tanggal Penilaian', 'Nama Guru', 'Penilai', 'Perencanaan', 'Pelaksanaan', 'Penilaian', 'Kedisiplinan', 'Komunikasi', 'Skor Total', 'Predikat'];
export const PELATIHAN_HEADERS = ['No', 'Nama Guru', 'Jenis Kegiatan', 'Nama Kegiatan', 'Tingkat', 'Penyelenggara', 'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah JP', 'No Sertifikat'];

const s = (v) => String(v ?? '').trim();
const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export function predikatKinerja(skor) {
  if (skor === null || skor === undefined || Number.isNaN(skor)) return '';
  if (skor >= 90) return 'Amat Baik';
  if (skor >= 80) return 'Baik';
  if (skor >= 70) return 'Cukup';
  return 'Perlu Pembinaan';
}
export function badgeKinerja(p) {
  return { 'Amat Baik': 'badge-green', Baik: 'badge-blue', Cukup: 'badge-gold', 'Perlu Pembinaan': 'badge-red' }[p] || 'badge-muted';
}
export function badgePresensiGuru(st) {
  return { Hadir: 'badge-green', 'Dinas Luar': 'badge-purple', Sakit: 'badge-blue', Izin: 'badge-gold', Alpha: 'badge-red' }[st] || 'badge-muted';
}

// Pegawai yg masih aktif (status kosong dianggap aktif).
export function pegawaiAktif(guru) {
  return guru.filter(g => g.nama && !/non ?aktif|pensiun|keluar|berhenti|mutasi/i.test(g.status || ''))
    .sort((a, b) => (a.kategori || '').localeCompare(b.kategori || '') || a.nama.localeCompare(b.nama, 'id'));
}

export function menitAntara(mulai, selesai) {
  const [h1, m1] = String(mulai).split(':').map(Number);
  const [h2, m2] = String(selesai).split(':').map(Number);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return 0;
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
}
export const jpDariMenit = (menit) => Math.round((menit / MENIT_PER_JP) * 10) / 10;

export function normalizeSheetPresensiGuru(r, i) {
  return {
    id: 'PSG-' + (r['No'] ?? i), no: r['No'], tanggal: s(r['Tanggal']).slice(0, 10), nama: s(r['Nama']), nip: s(r['NIP']),
    kategori: s(r['Kategori']), status: s(r['Status']), jamMasuk: s(r['Jam Masuk']), jamPulang: s(r['Jam Pulang']), keterangan: s(r['Keterangan']),
    dicatatOleh: s(r['Dicatat Oleh']), metode: s(r['Metode']) || 'Manual', menitTerlambat: Number(r['Menit Terlambat']) || 0, denda: Number(r['Denda']) || 0,
  };
}
export function normalizeSheetKinerja(r, i) {
  return {
    id: 'PKJ-' + (r['No'] ?? i), no: r['No'], tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), tanggal: s(r['Tanggal Penilaian']).slice(0, 10),
    guru: s(r['Nama Guru']), penilai: s(r['Penilai']), skor: Object.fromEntries(ASPEK_KINERJA.map(a => [a, n(r[a])])),
    total: n(r['Skor Total']), predikat: s(r['Predikat']), catatan: s(r['Catatan Supervisor']), rekomendasi: s(r['Rekomendasi']),
  };
}
export function normalizeSheetPelatihan(r, i) {
  return {
    id: 'PLT-' + (r['No'] ?? i), no: r['No'], guru: s(r['Nama Guru']), jenis: s(r['Jenis Kegiatan']), kegiatan: s(r['Nama Kegiatan']),
    tingkat: s(r['Tingkat']), penyelenggara: s(r['Penyelenggara']), mulai: s(r['Tanggal Mulai']).slice(0, 10), selesai: s(r['Tanggal Selesai']).slice(0, 10),
    jp: Number(r['Jumlah JP']) || 0, sertifikat: s(r['No Sertifikat']),
  };
}

// Skor tiap aspek 0-100, total = rata-rata 5 aspek (dibulatkan 1 desimal).
export function lengkapiKinerja(row) {
  const out = { ...row };
  const nilai = ASPEK_KINERJA.map(a => {
    const v = Number(row[a]);
    if (row[a] === '' || row[a] === undefined || !Number.isFinite(v) || v < 0 || v > 100) throw new Error(`Skor ${a} harus angka 0–100.`);
    out[a] = v;
    return v;
  });
  const total = Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 10) / 10;
  return { ...out, 'Skor Total': total, Predikat: predikatKinerja(total) };
}

export function buildKinerjaFields({ guruOptions, tahunAjaranOptions }) {
  return [
    { key: 'Nama Guru', label: 'Guru yang dinilai', type: 'select', options: guruOptions, required: true },
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions, required: true },
    { key: 'Semester', label: 'Semester', type: 'select', options: SEMESTER_OPTIONS, required: true },
    { key: 'Tanggal Penilaian', label: 'Tanggal Penilaian', type: 'date', required: true },
    { key: 'Penilai', label: 'Penilai / Supervisor', type: 'text', required: true },
    ...ASPEK_KINERJA.map(a => ({ key: a, label: `Skor ${a} (0–100)`, type: 'number', required: true })),
    { key: 'Catatan Supervisor', label: 'Catatan Supervisor', type: 'text' },
    { key: 'Rekomendasi', label: 'Rekomendasi Tindak Lanjut', type: 'text' },
  ];
}

export function buildPelatihanFields({ guruOptions }) {
  return [
    { key: 'Nama Guru', label: 'Guru / Pegawai', type: 'select', options: guruOptions, required: true },
    { key: 'Jenis Kegiatan', label: 'Jenis Kegiatan', type: 'select', options: JENIS_KEGIATAN_GURU, required: true },
    { key: 'Nama Kegiatan', label: 'Nama Kegiatan', type: 'text', required: true, placeholder: 'mis. Bimtek Kurikulum Merdeka' },
    { key: 'Tingkat', label: 'Tingkat', type: 'select', options: TINGKAT_KEGIATAN, required: true },
    { key: 'Penyelenggara', label: 'Penyelenggara', type: 'text' },
    { key: 'Tanggal Mulai', label: 'Tanggal Mulai', type: 'date', required: true },
    { key: 'Tanggal Selesai', label: 'Tanggal Selesai', type: 'date' },
    { key: 'Jumlah JP', label: 'Jumlah JP', type: 'number' },
    { key: 'No Sertifikat', label: 'No. Sertifikat', type: 'text' },
    { key: 'Keterangan', label: 'Keterangan', type: 'text' },
  ];
}
