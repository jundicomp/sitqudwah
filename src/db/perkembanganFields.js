// Catatan Perkembangan Siswa (v1.42.0). Aspek dikelola admin dari aplikasi
// (tab "Kategori Aspek"); ASPEK_BAWAAN hanya dipakai sebelum sekolah menyimpan daftarnya.
const s = (v) => String(v ?? '').trim();

export const ASPEK_BAWAAN = [
  { nama: 'Akademik', keterangan: 'Pemahaman materi, tugas, cara belajar', aktif: true },
  { nama: 'Akhlak & Karakter', keterangan: 'Adab, kejujuran, tanggung jawab', aktif: true },
  { nama: 'Ibadah & Tahfidz', keterangan: "Sholat, doa harian, hafalan Al-Qur'an", aktif: true },
  { nama: 'Sosial & Emosional', keterangan: 'Pertemanan, kerja sama, pengelolaan emosi', aktif: true },
  { nama: 'Kedisiplinan', keterangan: 'Kehadiran, ketepatan waktu, ketertiban', aktif: true },
];

export const ARAH_OPTIONS = ['Membaik', 'Tetap', 'Perlu Perhatian'];
export const IKON_ARAH = { Membaik: '⬆', Tetap: '➡', 'Perlu Perhatian': '⬇' };
export const BADGE_ARAH = { Membaik: 'badge-green', Tetap: 'badge-blue', 'Perlu Perhatian': 'badge-red' };
// Warna penanda tiap aspek di linimasa (berputar kalau aspek lebih banyak dari warnanya).
export const WARNA_ASPEK = ['#1C7A3C', '#1E4FA0', '#B07D10', '#5B3E8E', '#B23B2E', '#3A8F9E', '#C46A2B', '#7A7A2E'];

export function normalizeSheetAspek(r) {
  const nama = s(r['Nama']);
  if (!nama) return null;
  return { nama, keterangan: s(r['Keterangan']), aktif: !/^(tidak|false|0|nonaktif)$/i.test(s(r['Aktif'])) };
}

export function normalizeSheetPerkembangan(r, i) {
  return {
    id: 'PKB-' + (r['No'] ?? i), no: r['No'], raw: r, tanggal: s(r['Tanggal']).slice(0, 10),
    nisn: s(r['NISN']), nama: s(r['Nama Siswa']), tingkat: s(r['Tingkat']), rombel: s(r['Rombel']),
    aspek: s(r['Aspek']), catatan: s(r['Catatan']), arah: s(r['Arah']), tindakLanjut: s(r['Tindak Lanjut']),
    noKasus: s(r['No Kasus']), tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), oleh: s(r['Dicatat Oleh']),
  };
}
