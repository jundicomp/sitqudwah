// v1.38.0: Akreditasi, Periode Semester, Mutasi Siswa, Pengumuman, Surat Menyurat.
export { setPeriodeSemester } from './akademikFields';

const s = (v) => String(v ?? '').trim();
const tgl = (v) => s(v).slice(0, 10);

export const PERINGKAT_AKREDITASI = ['Unggul', 'Baik Sekali', 'Baik', 'A', 'B', 'C', 'Tidak Terakreditasi'];
export const JENIS_MUTASI = ['Mutasi Masuk', 'Mutasi Keluar', 'Mengundurkan Diri', 'Dikeluarkan', 'Meninggal Dunia'];
export const STATUS_SISWA_SETELAH = { 'Mutasi Keluar': 'Pindah', 'Mengundurkan Diri': 'Berhenti', Dikeluarkan: 'Berhenti', 'Meninggal Dunia': 'Berhenti' };
export const KATEGORI_PENGUMUMAN = ['Umum', 'Akademik', 'Kegiatan', 'Keuangan', 'Libur', 'Kepegawaian'];
export const DITUJUKAN_OPTIONS = ['Semua', 'Guru & Staff', 'Siswa & Orang Tua', 'Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];
export const SIFAT_SURAT = ['Biasa', 'Penting', 'Segera', 'Rahasia'];
export const STATUS_SURAT_MASUK = ['Diterima', 'Didisposisi', 'Ditindaklanjuti', 'Selesai', 'Diarsipkan'];
export const STATUS_SURAT_KELUAR = ['Draft', 'Ditandatangani', 'Terkirim', 'Diarsipkan'];
// Kode klasifikasi umum arsip sekolah/madrasah (bisa diketik bebas juga).
export const KLASIFIKASI_SURAT = ['PP (Pendidikan & Pengajaran)', 'KP (Kepegawaian)', 'KU (Keuangan)', 'HM (Kehumasan)', 'PS (Kesiswaan)', 'TU (Ketatausahaan)', 'RT (Rumah Tangga/Sarpras)', 'UND (Undangan)', 'KET (Keterangan)'];

export function normalizeSheetAkreditasi(r, i) {
  return { id: 'AKR-' + (r['No'] ?? i), no: r['No'], tahun: s(r['Tahun']), peringkat: s(r['Peringkat']), nilai: s(r['Nilai']), sk: s(r['Nomor SK']), tanggalSk: tgl(r['Tanggal SK']), berlaku: tgl(r['Berlaku Sampai']), lembaga: s(r['Lembaga']) };
}
export function normalizeSheetSemester(r, i) {
  return { id: 'SMS-' + (r['No'] ?? i), no: r['No'], tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), mulai: tgl(r['Mulai']), selesai: tgl(r['Selesai']) };
}
export function normalizeSheetMutasi(r, i) {
  return { id: 'MTS-' + (r['No'] ?? i), no: r['No'], tanggal: tgl(r['Tanggal']), jenis: s(r['Jenis Mutasi']), nisn: s(r['NISN']), nama: s(r['Nama Siswa']), tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), sekolah: s(r['Sekolah Asal / Tujuan']), alasan: s(r['Alasan']), nomorSurat: s(r['Nomor Surat']) };
}
export function normalizeSheetPengumuman(r, i) {
  return {
    id: 'PGM-' + (r['No'] ?? i), no: r['No'], raw: r, judul: s(r['Judul']), isi: s(r['Isi']), kategori: s(r['Kategori']) || 'Umum', ditujukan: s(r['Ditujukan']) || 'Semua',
    terbit: tgl(r['Tanggal Terbit']), sampai: tgl(r['Berlaku Sampai']), penting: /^(ya|true|1)$/i.test(s(r['Penting'])), oleh: s(r['Dibuat Oleh']),
  };
}
export function normalizeSheetSurat(r, i) {
  return {
    id: 'SRT-' + (r['No'] ?? i), no: r['No'], jenis: s(r['Jenis']), nomor: s(r['Nomor Surat']), tanggal: tgl(r['Tanggal Surat']), tanggalProses: tgl(r['Tanggal Diterima / Dikirim']),
    pihak: s(r['Pengirim / Tujuan']), perihal: s(r['Perihal']), klasifikasi: s(r['Kode Klasifikasi']), sifat: s(r['Sifat']) || 'Biasa', status: s(r['Status']),
  };
}

export const pengumumanAktif = (p, hariIni) => p.terbit <= hariIni && (!p.sampai || p.sampai >= hariIni);

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
// Nomor surat keluar: urut per tahun kalender / kode klasifikasi / kode instansi / bulan romawi / tahun.
export function nomorSuratBerikutnya(surat, tanggal, kodeKlas, kodeInstansi) {
  const tahun = tanggal.slice(0, 4);
  const urut = surat.filter(x => x.jenis === 'Keluar' && x.tanggal.slice(0, 4) === tahun)
    .reduce((m, x) => { const n = Number((x.nomor.match(/^(\d+)/) || [])[1]); return n > m ? n : m; }, 0) + 1;
  const klas = String(kodeKlas || '').split(' ')[0] || 'TU';
  return `${String(urut).padStart(3, '0')}/${klas}/${kodeInstansi || 'MI'}/${ROMAWI[Number(tanggal.slice(5, 7)) - 1]}/${tahun}`;
}
export function kodeInstansiDari(namaSekolah) {
  const kata = String(namaSekolah || 'MI').split(/\s+/).filter(Boolean);
  return kata.length > 1 ? `${kata[0].toUpperCase()}.${kata.slice(1).map(k => k.slice(0, 3).toUpperCase()).join('')}` : kata[0].toUpperCase();
}
