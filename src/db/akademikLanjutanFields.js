// Akademik Lanjutan: KKM, Kalender Akademik, Bank Soal & Ujian, Rapor Digital.
// Istilah & daftar pilihan mengikuti versi HTML (sumber_migrasi.html).
import { MAPEL_OPTIONS, SEMESTER_OPTIONS, semesterDariTanggal, dalamRentang } from './akademikFields';

export const KATEGORI_AGENDA_OPTIONS = ['Ujian', 'Libur', 'Kegiatan Sekolah', 'Rapat', 'Lainnya'];
export const CAKUPAN_AGENDA_OPTIONS = ['Semua Kelas', 'Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];
export const JENIS_SOAL_OPTIONS = ['Pilihan Ganda', 'Isian Singkat', 'Esai'];
export const KESULITAN_OPTIONS = ['Mudah', 'Sedang', 'Sulit'];
export const STATUS_UJIAN_OPTIONS = ['Draft', 'Aktif', 'Selesai'];
export const STATUS_RAPOR_OPTIONS = ['Draft', 'Terbit'];
export const SIKAP_OPTIONS = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan'];
export const TINGKAT_LIST = ['1', '2', '3', '4', '5', '6'];

// KKM bawaan per mapel dari versi HTML -- dipakai tombol "Isi nilai standar".
export const KKM_BASE = {
  "Al-Qur'an Hadits": 72, 'Akidah Akhlak': 72, Fiqih: 70, SKI: 68, 'Bahasa Arab': 65,
  PPKn: 70, 'Bahasa Indonesia': 68, Matematika: 65, IPA: 66, IPS: 68, SBdP: 75, PJOK: 75, 'Bahasa Inggris': 65,
};
export const kkmStandar = (mapel, tingkat) => Math.min(80, (KKM_BASE[mapel] || 68) + (Number(tingkat) - 1));

export const WARNA_AGENDA = { Ujian: 'var(--red)', Libur: 'var(--gold)', 'Kegiatan Sekolah': 'var(--green)', Rapat: 'var(--blue)', Lainnya: 'var(--muted)' };

export const KKM_HEADERS = ['No', 'Tahun Ajaran', 'Tingkat', 'Mata Pelajaran', 'KKM', 'Keterangan'];
export const AGENDA_HEADERS = ['No', 'Judul', 'Kategori', 'Tanggal Mulai', 'Tanggal Selesai', 'Cakupan', 'Tahun Ajaran', 'Keterangan'];
export const BANK_SOAL_TABEL = ['No', 'Mata Pelajaran', 'Tingkat', 'Jenis Soal', 'Kesulitan', 'Pertanyaan', 'Kunci Jawaban', 'Poin'];
export const UJIAN_TABEL = ['No', 'Judul', 'Mata Pelajaran', 'Kelas', 'Tanggal', 'Durasi (Menit)', 'Jumlah Soal', 'Status'];

const s = (v) => String(v ?? '').trim();

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------
export function normalizeSheetKkm(r, i) {
  return { id: 'KKM-' + (r['No'] ?? i), no: r['No'], tahunAjaran: s(r['Tahun Ajaran']), tingkat: s(r['Tingkat']), mapel: s(r['Mata Pelajaran']), kkm: r['KKM'] === '' ? null : Number(r['KKM']), keterangan: s(r['Keterangan']) };
}
export function normalizeSheetAgenda(r, i) {
  const mulai = s(r['Tanggal Mulai']).slice(0, 10);
  return {
    id: 'AGD-' + (r['No'] ?? i), no: r['No'], judul: s(r['Judul']), kategori: s(r['Kategori']) || 'Lainnya',
    mulai, selesai: s(r['Tanggal Selesai']).slice(0, 10) || mulai, cakupan: s(r['Cakupan']) || 'Semua Kelas',
    tahunAjaran: s(r['Tahun Ajaran']), keterangan: s(r['Keterangan']),
  };
}
export function normalizeSheetBankSoal(r, i) {
  return {
    id: 'SOAL-' + (r['No'] ?? i), no: s(r['No']), mapel: s(r['Mata Pelajaran']), tingkat: s(r['Tingkat']), jenis: s(r['Jenis Soal']),
    kesulitan: s(r['Kesulitan']), pertanyaan: s(r['Pertanyaan']),
    pilihan: ['A', 'B', 'C', 'D'].map(h => ({ huruf: h, teks: s(r['Pilihan ' + h]) })).filter(p => p.teks),
    kunci: s(r['Kunci Jawaban']), poin: Number(r['Poin']) || 0, tahunAjaran: s(r['Tahun Ajaran']), guru: s(r['Guru']),
  };
}
export function normalizeSheetUjian(r, i) {
  const soalNo = s(r['Soal No']).split(',').map(x => x.trim()).filter(Boolean);
  return {
    id: 'UJN-' + (r['No'] ?? i), no: r['No'], raw: r, judul: s(r['Judul']), mapel: s(r['Mata Pelajaran']), tingkat: s(r['Tingkat']), rombel: s(r['Rombel']),
    tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), tanggal: s(r['Tanggal']).slice(0, 10),
    durasi: Number(r['Durasi (Menit)']) || 0, status: s(r['Status']) || 'Draft', soalNo, guru: s(r['Guru Pengawas']), catatan: s(r['Catatan']),
  };
}
export function normalizeSheetRapor(r, i) {
  const n = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
  return {
    id: 'RPR-' + (r['No'] ?? i), no: r['No'], tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), nisn: s(r['NISN']),
    nama: s(r['Nama Siswa']), tingkat: s(r['Tingkat']), rombel: s(r['Rombel']),
    sikapSpiritual: s(r['Sikap Spiritual']), sikapSosial: s(r['Sikap Sosial']), ekskul: s(r['Ekstrakurikuler']),
    sakit: n(r['Sakit']), izin: n(r['Izin']), alpha: n(r['Alpha']), catatan: s(r['Catatan Wali Kelas']),
    status: s(r['Status']) || 'Draft', tanggalTerbit: s(r['Tanggal Terbit']).slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Helper hitung
// ---------------------------------------------------------------------------

// KKM utk (TA, tingkat, mapel). null kalau belum diatur.
export function buatLookupKkm(kkmRows) {
  const map = {};
  kkmRows.forEach(k => { if (k.kkm !== null) map[`${k.tahunAjaran}|${k.tingkat}|${k.mapel}`] = k.kkm; });
  return (ta, tingkat, mapel) => map[`${ta}|${tingkat}|${mapel}`] ?? null;
}

const rata1 = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

// Nilai akhir rapor per mapel = rata-rata semua penilaian di TA+semester itu
// (sama dgn versi HTML). Urutan mapel mengikuti MAPEL_OPTIONS.
export function nilaiRaporSiswa(nilaiRows, nisn, ta, semester, kkmOf, tingkat) {
  const milik = nilaiRows.filter(n => n.nisn === nisn && n.tahunAjaran === ta && n.semester === semester && n.nilai !== null);
  const per = {};
  milik.forEach(n => { (per[n.mapel] ||= []).push(n.nilai); });
  const urutan = [...MAPEL_OPTIONS.filter(m => per[m]), ...Object.keys(per).filter(m => !MAPEL_OPTIONS.includes(m))];
  return urutan.map(m => {
    const akhir = rata1(per[m]);
    const kkm = kkmOf(ta, tingkat, m);
    return { mapel: m, akhir, jumlah: per[m].length, kkm, tuntas: kkm === null ? null : akhir >= kkm };
  });
}

// Rekap kehadiran siswa dlm 1 semester (rentang TA dipotong per semester).
export function kehadiranSemester(presensiRows, nisn, taObj, semester) {
  const c = { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0 };
  presensiRows.forEach(p => {
    if (p.nisn !== nisn) return;
    if (taObj && !dalamRentang(p.tanggal, taObj.mulai, taObj.selesai)) return;
    if (semesterDariTanggal(p.tanggal) !== semester) return;
    if (c[p.status] !== undefined) c[p.status]++;
  });
  return c;
}

// Agenda yg jatuh pada tanggal ISO tertentu.
export function agendaPadaTanggal(agenda, iso) {
  return agenda.filter(a => a.mulai && iso >= a.mulai && iso <= a.selesai);
}

// ---------------------------------------------------------------------------
// Field form
// ---------------------------------------------------------------------------
export function buildAgendaFields({ tahunAjaranOptions }) {
  return [
    { key: 'Judul', label: 'Judul Agenda', type: 'text', required: true, placeholder: 'mis. Penilaian Tengah Semester Ganjil' },
    { key: 'Kategori', label: 'Kategori', type: 'select', options: KATEGORI_AGENDA_OPTIONS, required: true },
    { key: 'Tanggal Mulai', label: 'Tanggal Mulai', type: 'date', required: true },
    { key: 'Tanggal Selesai', label: 'Tanggal Selesai', type: 'date', placeholder: 'kosong = 1 hari' },
    { key: 'Cakupan', label: 'Berlaku untuk', type: 'select', options: CAKUPAN_AGENDA_OPTIONS, required: true },
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions, required: true },
    { key: 'Keterangan', label: 'Keterangan', type: 'text' },
  ];
}

export function buildBankSoalFields({ tahunAjaranOptions, guruOptions }) {
  return [
    { key: 'Mata Pelajaran', label: 'Mata Pelajaran', type: 'select', options: MAPEL_OPTIONS, required: true },
    { key: 'Tingkat', label: 'Kelas / Tingkat', type: 'select', options: TINGKAT_LIST, required: true },
    { key: 'Jenis Soal', label: 'Jenis Soal', type: 'select', options: JENIS_SOAL_OPTIONS, required: true },
    { key: 'Kesulitan', label: 'Tingkat Kesulitan', type: 'select', options: KESULITAN_OPTIONS, required: true },
    { key: 'Pertanyaan', label: 'Pertanyaan', type: 'text', required: true },
    { key: 'Pilihan A', label: 'Pilihan A (khusus pilihan ganda)', type: 'text' },
    { key: 'Pilihan B', label: 'Pilihan B', type: 'text' },
    { key: 'Pilihan C', label: 'Pilihan C', type: 'text' },
    { key: 'Pilihan D', label: 'Pilihan D', type: 'text' },
    { key: 'Kunci Jawaban', label: 'Kunci Jawaban', type: 'text', required: true, placeholder: 'PG: A/B/C/D · isian/esai: jawaban atau rubrik' },
    { key: 'Poin', label: 'Poin', type: 'number', required: true },
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions },
    { key: 'Guru', label: 'Guru Penyusun', type: 'select', options: guruOptions },
  ];
}

// Validasi soal sebelum simpan (tambah & edit).
export function validasiSoal(row) {
  if (row['Jenis Soal'] === 'Pilihan Ganda') {
    if (!s(row['Pilihan A']) || !s(row['Pilihan B'])) throw new Error('Soal pilihan ganda minimal punya Pilihan A dan B.');
    const kunci = s(row['Kunci Jawaban']).toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(kunci)) throw new Error('Kunci jawaban pilihan ganda harus A, B, C, atau D.');
    if (!s(row['Pilihan ' + kunci])) throw new Error(`Kunci ${kunci} dipilih tapi Pilihan ${kunci} kosong.`);
    return { ...row, 'Kunci Jawaban': kunci };
  }
  return { ...row, 'Pilihan A': '', 'Pilihan B': '', 'Pilihan C': '', 'Pilihan D': '' };
}

export function buildUjianFields({ tahunAjaranOptions, rombelLabels, guruOptions }) {
  return [
    { key: 'Judul', label: 'Judul Ujian', type: 'text', required: true, placeholder: 'mis. PTS Matematika Semester Ganjil' },
    { key: 'Mata Pelajaran', label: 'Mata Pelajaran', type: 'select', options: MAPEL_OPTIONS, required: true },
    { key: 'Kelas', label: 'Kelas / Rombel', type: 'select', options: rombelLabels, required: true },
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions, required: true },
    { key: 'Semester', label: 'Semester', type: 'select', options: SEMESTER_OPTIONS, required: true },
    { key: 'Tanggal', label: 'Tanggal Ujian', type: 'date', required: true },
    { key: 'Durasi (Menit)', label: 'Durasi (menit)', type: 'number', required: true },
    { key: 'Status', label: 'Status', type: 'select', options: STATUS_UJIAN_OPTIONS, required: true },
    { key: 'Guru Pengawas', label: 'Guru Pengawas', type: 'select', options: guruOptions },
    { key: 'Catatan', label: 'Catatan', type: 'text' },
  ];
}
