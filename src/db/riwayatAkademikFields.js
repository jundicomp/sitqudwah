// Sheet "Riwayat Akademik" -- SATU baris per (NISN + Tahun Ajaran), sumber kebenaran
// riwayat Kelas/Tingkat, Rombel, Wali Kelas, dan Status siswa dari Kelas 1 sampai
// tamat/keluar. Data Siswa (siswaFields.js) tetap py Kelas/Tingkat, Rombel, Status --
// itu cuma CACHE "kondisi saat ini", disalin dari baris riwayat paling baru siswa itu
// tiap kali diproses lewat menu Kenaikan Kelas (lihat kenaikanKelasHelpers.js).
export const RIWAYAT_AKADEMIK_HEADERS = [
  'No', 'NISN', 'Nama Siswa', 'Tahun Ajaran', 'Kelas/Tingkat', 'Rombel', 'Wali Kelas', 'Status', 'Tanggal', 'Keterangan',
];

// "Aktif" = tahun ajaran itu masih berjalan utk siswa ybs (belum ada keputusan akhir
// tahun). Status lain diisi begitu Proses Kenaikan Kelas Tahunan dijalankan utk
// tahun ajaran itu.
export const STATUS_RIWAYAT_AKADEMIK_OPTIONS = ['Aktif', 'Naik Kelas', 'Tinggal Kelas', 'Lulus', 'Pindah Sekolah', 'Berhenti'];

export const STATUS_RIWAYAT_BADGE = {
  Aktif: 'badge-muted',
  'Naik Kelas': 'badge-green',
  'Tinggal Kelas': 'badge-gold',
  Lulus: 'badge-blue',
  'Pindah Sekolah': 'badge-red',
  Berhenti: 'badge-red',
};

export function normalizeSheetRiwayatAkademik(row, idx) {
  return {
    id: 'RIW-' + (row['No'] ?? idx),
    no: row['No'],
    nisn: String(row['NISN'] ?? '').trim(),
    namaSiswa: String(row['Nama Siswa'] ?? '').trim(),
    tahunAjaran: String(row['Tahun Ajaran'] ?? '').trim(),
    kelasTingkat: String(row['Kelas/Tingkat'] ?? '').trim(),
    rombel: String(row['Rombel'] ?? '').trim(),
    waliKelas: String(row['Wali Kelas'] ?? '').trim(),
    status: String(row['Status'] ?? '').trim() || 'Aktif',
    tanggal: String(row['Tanggal'] ?? '').trim(),
    keterangan: String(row['Keterangan'] ?? '').trim(),
  };
}

// Cari baris riwayat 1 siswa (by NISN) utk 1 Tahun Ajaran spesifik -- dipakai di mana
// pun butuh tahu "siswa ini kelas/rombel apa PADA tahun ajaran tsb", BUKAN kondisinya
// sekarang. Kembalikan null kalau belum pernah tercatat (mis. tahun ajaran sebelum
// fitur Riwayat Akademik ini mulai dipakai).
export function cariRiwayatAkademik(nisn, tahunAjaran, riwayatAkademik) {
  return riwayatAkademik.find(r => r.nisn === nisn && r.tahunAjaran === tahunAjaran) || null;
}

// Kelas/Rombel siswa PADA suatu Tahun Ajaran tertentu -- utamakan baris Riwayat
// Akademik kalau sudah ada (sumber kebenaran); kalau BELUM ada (siswa/tahun itu belum
// pernah diproses lewat Kenaikan Kelas, mis. data lama sebelum fitur ini ada), jatuhkan
// ke `fallback` (biasanya kondisi Data Siswa SAAT INI) apa adanya -- lebih baik
// menampilkan kondisi terbaik yg tersedia drpd kosong sama sekali.
export function kelasRombelPadaTahun(nisn, tahunAjaran, riwayatAkademik, fallback) {
  const rec = cariRiwayatAkademik(nisn, tahunAjaran, riwayatAkademik);
  if (rec) return { kelasTingkat: rec.kelasTingkat, rombel: rec.rombel, dariRiwayat: true };
  return { ...fallback, dariRiwayat: false };
}

// Riwayat lengkap 1 siswa, terurut dari Tahun Ajaran PALING AWAL ke PALING BARU --
// dipakai tampilan timeline "Kelas 1 sampai tamat" di tab Riwayat Siswa. Sort by
// label (format "2020/2021") aman scr leksikografis krn tahun awal selalu 4 digit.
export function riwayatSiswaUrut(nisn, riwayatAkademik) {
  return riwayatAkademik.filter(r => r.nisn === nisn).slice().sort((a, b) => a.tahunAjaran.localeCompare(b.tahunAjaran));
}
