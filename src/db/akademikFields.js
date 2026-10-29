import { bandingTingkat, namaTingkat } from '../config/jenjang';
// Konstanta & helper bersama modul Akademik (Jadwal, Presensi, Nilai) dan
// Kesiswaan (Prestasi, Pelanggaran, Laporan Siswa). Daftar pilihan diambil dari
// versi HTML (sumber_migrasi.html) supaya istilahnya sama persis.
import { todayWIB } from './helpers';

export const MAPEL_OPTIONS = ["Al-Qur'an Hadits", 'Akidah Akhlak', 'Fiqih', 'SKI', 'Bahasa Arab', 'PPKn', 'Bahasa Indonesia', 'Matematika', 'IPA', 'IPS', 'SBdP', 'PJOK', 'Bahasa Inggris'];
export const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const SEMESTER_OPTIONS = ['Ganjil', 'Genap'];
export const STATUS_PRESENSI = ['Hadir', 'Sakit', 'Izin', 'Alpha'];
export const JENIS_NILAI_OPTIONS = ['Harian', 'Tugas', 'UTS', 'UAS'];
export const JENIS_PRESTASI_OPTIONS = ['Akademik', 'Non-Akademik', 'Keagamaan', 'Olahraga', 'Seni'];
export const TINGKAT_LOMBA_OPTIONS = ['Sekolah', 'Kecamatan', 'Kabupaten/Kota', 'Provinsi', 'Nasional', 'Internasional'];
export const HASIL_PRESTASI_OPTIONS = ['Juara 1', 'Juara 2', 'Juara 3', 'Harapan 1', 'Harapan 2', 'Peserta Terbaik', 'Peserta'];
export const KATEGORI_PELANGGARAN_OPTIONS = ['Ringan', 'Sedang', 'Berat'];
export const POIN_DEFAULT_KATEGORI = { Ringan: 5, Sedang: 10, Berat: 25 };
export const PENANGANAN_OPTIONS = ['Teguran Lisan', 'Teguran Tertulis', 'Panggilan Orang Tua', 'Skorsing', 'Lainnya'];
export const STATUS_TINDAK_LANJUT_OPTIONS = ['Belum Ditangani', 'Proses', 'Selesai'];

// Ambang yg dipakai laporan (sama dgn versi HTML).
export const AMBANG_HADIR_BAIK = 90;
export const AMBANG_HADIR_CUKUP = 75;
export const AMBANG_POIN_TINGGI = 25;

export const JADWAL_HEADERS = ['No', 'Tahun Ajaran', 'Semester', 'Hari', 'Jam Mulai', 'Jam Selesai', 'Tingkat', 'Rombel', 'Mata Pelajaran', 'Guru', 'Ruang'];
export const PRESENSI_HEADERS = ['No', 'Tanggal', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Status', 'Jam Masuk', 'Jam Pulang', 'Metode', 'Menit Terlambat', 'Keterangan', 'Dicatat Oleh'];
export const NILAI_HEADERS = ['No', 'Tahun Ajaran', 'Semester', 'Tanggal', 'Mata Pelajaran', 'Jenis Nilai', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Nilai', 'Guru', 'Keterangan'];
export const PRESTASI_HEADERS = ['No', 'Tanggal', 'Tahun Ajaran', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Jenis Prestasi', 'Nama Kegiatan', 'Tingkat Lomba', 'Hasil', 'Penyelenggara', 'No Sertifikat', 'Keterangan'];
export const PELANGGARAN_HEADERS = ['No', 'Tanggal', 'Tahun Ajaran', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Kategori', 'Jenis Pelanggaran', 'Poin', 'Penanganan', 'Status Tindak Lanjut', 'Guru BK', 'Catatan Konseling'];

// ---------------------------------------------------------------------------
// Helper umum
// ---------------------------------------------------------------------------

const s = (v) => String(v ?? '').trim();

// Semester default dari tanggal: Juli–Desember = Ganjil, Januari–Juni = Genap.
// Kalau sekolah mengatur Periode Semester (Pengaturan › Profil & Tahun Ajaran),
// tanggal dicocokkan ke periode itu; kalau tidak ada yg cocok, pakai aturan bulan.
let periodeSemester = [];
export function setPeriodeSemester(rows) { periodeSemester = Array.isArray(rows) ? rows : []; }
export function semesterDariTanggal(iso = todayWIB()) {
  const t = String(iso).slice(0, 10);
  const p = periodeSemester.find(x => x.mulai && x.selesai && t >= x.mulai && t <= x.selesai);
  if (p) return p.semester;
  const bulan = Number(t.slice(5, 7));
  return bulan >= 7 ? 'Ganjil' : 'Genap';
}

// ---------------------------------------------------------------------------
// Skala predikat (huruf mutu) -- v1.43.0: diatur sekolah sendiri di
// Akademik › Kurikulum & KKM › Skala Predikat. Tiap baris = huruf + nilai minimal;
// nilai >= minimal dapat huruf itu (dicek dari minimal tertinggi). Sebelum sekolah
// menyimpan skala sendiri, dipakai skala bawaan di bawah.
// ---------------------------------------------------------------------------
export const SKALA_PREDIKAT_BAWAAN = [
  { huruf: 'A', min: 85, keterangan: 'Sangat Baik' },
  { huruf: 'A-', min: 80, keterangan: 'Sangat Baik' },
  { huruf: 'B+', min: 75, keterangan: 'Baik' },
  { huruf: 'B', min: 70, keterangan: 'Baik' },
  { huruf: 'B-', min: 65, keterangan: 'Baik' },
  { huruf: 'C+', min: 60, keterangan: 'Cukup' },
  { huruf: 'C', min: 55, keterangan: 'Cukup' },
  { huruf: 'D', min: 40, keterangan: 'Kurang' },
  { huruf: 'E', min: 0, keterangan: 'Sangat Kurang' },
];
let skalaPredikat = SKALA_PREDIKAT_BAWAAN;
// Objek "hidup": isinya diganti tiap skala berubah, jadi import lama tetap jalan.
export const PREDIKAT_LABEL = {};
function isiLabelPredikat() {
  Object.keys(PREDIKAT_LABEL).forEach(k => delete PREDIKAT_LABEL[k]);
  skalaPredikat.forEach(x => { PREDIKAT_LABEL[x.huruf] = x.keterangan || ''; });
}
isiLabelPredikat();
const urutSkala = (list) => [...list].sort((a, b) => b.min - a.min);
export function setSkalaPredikat(list) {
  const valid = (list || []).filter(x => x && x.huruf && Number.isFinite(x.min));
  skalaPredikat = valid.length ? urutSkala(valid) : SKALA_PREDIKAT_BAWAAN;
  isiLabelPredikat();
}
export const getSkalaPredikat = () => skalaPredikat;
export function normalizeSheetSkalaPredikat(row) {
  const huruf = s(row['Huruf']);
  const min = Number(String(row['Nilai Minimal'] ?? '').replace(',', '.'));
  if (!huruf || row['Nilai Minimal'] === '' || !Number.isFinite(min)) return null;
  return { huruf, min, keterangan: s(row['Keterangan']) };
}
// Teks rentang utk ditampilkan, mis. "80 – <85" / "85 – 100".
export function rentangPredikat(list, i) {
  const urut = urutSkala(list);
  const x = urut[i];
  return i === 0 ? `${x.min} – 100` : `${x.min} – <${urut[i - 1].min}`;
}

export function predikatNilai(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  const ketemu = skalaPredikat.find(x => v >= x.min);
  return (ketemu || skalaPredikat[skalaPredikat.length - 1]).huruf;
}
// Warna badge: huruf A/B = hijau, C = emas, D/E = merah. Huruf lain (mis. "SB", "Mumtaz")
// diwarnai menurut posisinya di skala (sepertiga atas hijau, tengah emas, bawah merah).
export function tingkatPredikat(p) {
  if (!p) return null;
  const awal = p[0].toUpperCase();
  if (awal === 'A' || awal === 'B') return 'baik';
  if (awal === 'C') return 'cukup';
  if (awal === 'D' || awal === 'E') return 'kurang';
  const i = skalaPredikat.findIndex(x => x.huruf === p);
  if (i < 0) return null;
  const f = i / Math.max(skalaPredikat.length - 1, 1);
  return f < 0.34 ? 'baik' : f < 0.67 ? 'cukup' : 'kurang';
}
export function badgePredikat(p) {
  return { baik: 'badge-green', cukup: 'badge-gold', kurang: 'badge-red' }[tingkatPredikat(p)] || 'badge-muted';
}
export function badgeHadir(persen) {
  if (persen === null) return 'badge-muted';
  return persen >= AMBANG_HADIR_BAIK ? 'badge-green' : persen >= AMBANG_HADIR_CUKUP ? 'badge-gold' : 'badge-red';
}
export function badgeStatusPresensi(st) {
  return { Hadir: 'badge-green', Sakit: 'badge-blue', Izin: 'badge-gold', Alpha: 'badge-red' }[st] || 'badge-muted';
}

// Daftar rombel dari data Kelas (1 baris Data Kelas = 1 rombel: Tingkat + Nama Kelas).
export function daftarRombel(kelas) {
  return kelas
    .filter(k => k.tingkat && k.namaKelas)
    .map(k => ({ key: `${k.tingkat}|${k.namaKelas}`, tingkat: k.tingkat, rombel: k.namaKelas, wali: k.waliKelas, label: labelRombel(k.tingkat, k.namaKelas) }))
    .sort((a, b) => bandingTingkat(a.tingkat, b.tingkat) || a.rombel.localeCompare(b.rombel, 'id'));
}
export function labelRombel(tingkat, rombel) {
  if (!tingkat && !rombel) return '';
  return `${namaTingkat(tingkat)} · ${rombel}`;
}
export function parseLabelRombel(label, rombelList) {
  return rombelList.find(r => r.label === label) || null;
}

export function siswaDiRombel(siswa, tingkat, rombel, hanyaAktif = true) {
  return siswa
    .filter(x => x.kelasTingkat === tingkat && x.rombel === rombel && (!hanyaAktif || x.status === 'Aktif'))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

export function labelSiswa(sw) {
  return `${sw.nama} (${sw.nisn || 'tanpa NISN'})`;
}

// Guru pengajar: semua data Guru & Staff kategori "Guru".
export function daftarNamaGuru(guru) {
  return guru.filter(g => (g.kategori || 'Guru') === 'Guru' && g.nama).map(g => g.nama).sort((a, b) => a.localeCompare(b, 'id'));
}

// Apakah tanggal ISO masuk rentang tahun ajaran (mulai/selesai boleh kosong).
export function dalamRentang(tanggal, mulai, selesai) {
  const t = s(tanggal);
  if (!t) return false;
  if (mulai && t < s(mulai).slice(0, 10)) return false;
  if (selesai && t > s(selesai).slice(0, 10)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Normalizer baris Sheet -> objek JS (dipakai AppContext)
// ---------------------------------------------------------------------------

export function normalizeSheetJadwal(r, i) {
  return {
    id: 'JDW-' + (r['No'] ?? i), no: r['No'], raw: r,
    tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), hari: s(r['Hari']),
    jamMulai: s(r['Jam Mulai']), jamSelesai: s(r['Jam Selesai']),
    tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), mapel: s(r['Mata Pelajaran']), guru: s(r['Guru']), ruang: s(r['Ruang']),
  };
}
export function normalizeSheetPresensi(r, i) {
  return {
    id: 'PRS-' + (r['No'] ?? i), no: r['No'], raw: r,
    tanggal: s(r['Tanggal']).slice(0, 10), nisn: s(r['NISN']), nama: s(r['Nama Siswa']),
    tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), status: s(r['Status']),
    jamMasuk: s(r['Jam Masuk']), keterangan: s(r['Keterangan']), dicatatOleh: s(r['Dicatat Oleh']),
    jamPulang: s(r['Jam Pulang']), metode: s(r['Metode']) || 'Manual', menitTerlambat: Number(r['Menit Terlambat']) || 0, denda: Number(r['Denda']) || 0,
  };
}
export function normalizeSheetNilai(r, i) {
  const n = r['Nilai'];
  return {
    id: 'NIL-' + (r['No'] ?? i), no: r['No'], raw: r,
    tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), tanggal: s(r['Tanggal']).slice(0, 10),
    mapel: s(r['Mata Pelajaran']), jenis: s(r['Jenis Nilai']), nisn: s(r['NISN']), nama: s(r['Nama Siswa']),
    tingkat: s(r['Tingkat']), rombel: s(r['Rombel']),
    nilai: n === '' || n === null || n === undefined ? null : Number(n),
    guru: s(r['Guru']), keterangan: s(r['Keterangan']),
  };
}
export function normalizeSheetPrestasi(r, i) {
  return {
    id: 'PST-' + (r['No'] ?? i), no: r['No'], raw: r,
    tanggal: s(r['Tanggal']).slice(0, 10), tahunAjaran: s(r['Tahun Ajaran']), nisn: s(r['NISN']), nama: s(r['Nama Siswa']),
    tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), jenis: s(r['Jenis Prestasi']), kegiatan: s(r['Nama Kegiatan']),
    tingkatLomba: s(r['Tingkat Lomba']), hasil: s(r['Hasil']),
  };
}
export function normalizeSheetPelanggaran(r, i) {
  return {
    id: 'PLG-' + (r['No'] ?? i), no: r['No'], raw: r,
    tanggal: s(r['Tanggal']).slice(0, 10), tahunAjaran: s(r['Tahun Ajaran']), nisn: s(r['NISN']), nama: s(r['Nama Siswa']),
    tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), kategori: s(r['Kategori']), jenis: s(r['Jenis Pelanggaran']),
    poin: Number(r['Poin']) || 0, penanganan: s(r['Penanganan']), statusTL: s(r['Status Tindak Lanjut']),
  };
}

// ---------------------------------------------------------------------------
// Field form untuk Jadwal, Prestasi, Pelanggaran (pola GenericManualForm)
// Field "Kelas" & "Siswa" adalah kolom VIRTUAL (tidak ada di Sheet) -- diubah
// jadi Tingkat/Rombel/NISN/Nama Siswa sebelum dikirim (lihat hooks/useVirtualFields.js).
// ---------------------------------------------------------------------------

export function buildJadwalFields({ tahunAjaranOptions, rombelLabels, guruOptions }) {
  return [
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions, required: true },
    { key: 'Semester', label: 'Semester', type: 'select', options: SEMESTER_OPTIONS, required: true },
    { key: 'Kelas', label: 'Kelas / Rombel', type: 'select', options: rombelLabels, required: true },
    { key: 'Hari', label: 'Hari', type: 'select', options: HARI_OPTIONS, required: true },
    { key: 'Jam Mulai', label: 'Jam Mulai', type: 'time', required: true },
    { key: 'Jam Selesai', label: 'Jam Selesai', type: 'time', required: true },
    { key: 'Mata Pelajaran', label: 'Mata Pelajaran', type: 'select', options: MAPEL_OPTIONS, required: true },
    { key: 'Guru', label: 'Guru Pengajar', type: 'select', options: guruOptions },
    { key: 'Ruang', label: 'Ruang', type: 'text', placeholder: 'kosongkan kalau di kelas sendiri' },
  ];
}

export function buildPrestasiFields({ siswaOptions, tahunAjaranOptions, withSiswa = true }) {
  return [
    ...(withSiswa ? [{ key: 'Siswa', label: 'Siswa', type: 'select', options: siswaOptions, required: true }] : []),
    { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions, required: true },
    { key: 'Jenis Prestasi', label: 'Jenis Prestasi', type: 'select', options: JENIS_PRESTASI_OPTIONS, required: true },
    { key: 'Nama Kegiatan', label: 'Nama Kegiatan / Lomba', type: 'text', required: true, placeholder: 'mis. MTQ Anak Tingkat Kabupaten' },
    { key: 'Tingkat Lomba', label: 'Tingkat', type: 'select', options: TINGKAT_LOMBA_OPTIONS, required: true },
    { key: 'Hasil', label: 'Hasil', type: 'select', options: HASIL_PRESTASI_OPTIONS, required: true },
    { key: 'Penyelenggara', label: 'Penyelenggara', type: 'text' },
    { key: 'No Sertifikat', label: 'No. Sertifikat', type: 'text' },
    { key: 'Keterangan', label: 'Keterangan', type: 'text' },
  ];
}

export function buildPelanggaranFields({ siswaOptions, tahunAjaranOptions, guruOptions, withSiswa = true }) {
  return [
    ...(withSiswa ? [{ key: 'Siswa', label: 'Siswa', type: 'select', options: siswaOptions, required: true }] : []),
    { key: 'Tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions, required: true },
    { key: 'Kategori', label: 'Kategori', type: 'select', options: KATEGORI_PELANGGARAN_OPTIONS, required: true },
    { key: 'Jenis Pelanggaran', label: 'Uraian Pelanggaran', type: 'text', required: true, placeholder: 'mis. Terlambat 3 kali dalam seminggu' },
    { key: 'Poin', label: 'Poin', type: 'number', placeholder: 'kosong = otomatis (Ringan 5, Sedang 10, Berat 25)' },
    { key: 'Penanganan', label: 'Penanganan', type: 'select', options: PENANGANAN_OPTIONS },
    { key: 'Status Tindak Lanjut', label: 'Status Tindak Lanjut', type: 'select', options: STATUS_TINDAK_LANJUT_OPTIONS, required: true },
    { key: 'Guru BK', label: 'Guru BK / Penangan', type: 'select', options: guruOptions },
    { key: 'Catatan Konseling', label: 'Catatan Konseling', type: 'text' },
  ];
}
