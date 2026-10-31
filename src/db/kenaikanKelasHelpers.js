import { TINGKAT_OPTIONS, JENJANG, tingkatTerakhirJenjang, jenjangDariTingkat, formatRaporTingkat, namaTingkat } from '../config/jenjang';
import { cariRiwayatAkademik } from './riwayatAkademikFields';

// Siswa di tingkat TERAKHIR jenjangnya (KB B, TK B, 6, 9, 12): kalau sekolah punya
// jenjang berikutnya, bisa "Lanjut Jenjang" -- siswa TETAP satu data (baris Data Siswa
// & ID Siswa sama), cuma pindah ke tingkat pertama jenjang berikutnya, jadi penilaian,
// rapor & riwayatnya tidak terputus. Default: PAUD -> lanjut, jenjang sekolah -> Lulus.
export const LABEL_KEPUTUSAN = { 'Lanjut Jenjang': 'Lanjut ke jenjang berikutnya' };
export const labelKeputusan = (k) => LABEL_KEPUTUSAN[k] || k;

// Jenjang aktif sesudah jenjang `tingkat` (urutan di Jenjang & Tingkat) -> { kode, nama, tingkat }.
export function jenjangBerikutnya(tingkat) {
  const kode = jenjangDariTingkat(tingkat);
  const i = JENJANG.findIndex(j => j.kode === kode);
  if (i === -1) return null;
  const next = JENJANG.slice(i + 1).find(j => j.tingkat.length);
  return next ? { kode: next.kode, nama: next.nama, tingkat: next.tingkat[0] } : null;
}

// Tingkat berikutnya sesudah `tingkat` -- null kalau sudah tingkat tertinggi ATAU
// tingkatnya tidak dikenali (mis. data lama yg kosong/aneh).
export function tingkatBerikutnya(tingkat) {
  const idx = TINGKAT_OPTIONS.indexOf(String(tingkat));
  if (idx === -1 || tingkatTerakhirJenjang(tingkat)) return null;
  const next = TINGKAT_OPTIONS[idx + 1];
  return next && jenjangDariTingkat(next) === jenjangDariTingkat(tingkat) ? next : null;
}

// Keputusan DEFAULT utk 1 siswa, sebelum admin override manual -- siswa di tingkat
// tertinggi otomatis disarankan "Lulus", selainnya disarankan "Naik Kelas".
export function keputusanDefault(kelasTingkatSaatIni) {
  if (!tingkatTerakhirJenjang(kelasTingkatSaatIni)) return 'Naik Kelas';
  return formatRaporTingkat(kelasTingkatSaatIni) === 'PAUD' && jenjangBerikutnya(kelasTingkatSaatIni) ? 'Lanjut Jenjang' : 'Lulus';
}

// Kelas/Tingkat TUJUAN utk 1 keputusan -- "Naik Kelas" pindah ke tingkat berikutnya,
// "Tinggal Kelas" TETAP di tingkat yg sama (mengulang), keputusan lain (Lulus/Pindah
// Sekolah/Berhenti) tidak perlu Kelas/Tingkat tujuan sama sekali (siswa tidak lanjut).
export function targetKelasUntukKeputusan(decision, kelasTingkatSaatIni) {
  if (decision === 'Naik Kelas') return tingkatBerikutnya(kelasTingkatSaatIni);
  if (decision === 'Lanjut Jenjang') return tingkatTerakhirJenjang(kelasTingkatSaatIni) ? (jenjangBerikutnya(kelasTingkatSaatIni)?.tingkat || null) : null;
  if (decision === 'Tinggal Kelas') return kelasTingkatSaatIni;
  return null;
}

// Rombel tujuan yg DISARANKAN di tingkat baru: kalau ada rombel bernama SAMA di
// tingkat tujuan (mis. "A" tetap "A" walau pindah dari Kelas 1 ke Kelas 2), pakai itu;
// kalau tingkat tujuan cuma py SATU rombel, pakai itu; selain itu kosongkan (admin
// pilih manual) -- drpd asal tebak & salah tempatkan siswa ke rombel yg keliru.
export function saranRombelTujuan(daftarKelas, tingkatTujuan, namaRombelSaatIni) {
  const rombelDiTingkat = daftarKelas.filter(k => k.tingkat === tingkatTujuan && k.namaKelas);
  if (namaRombelSaatIni) {
    const cocok = rombelDiTingkat.find(k => k.namaKelas === namaRombelSaatIni);
    if (cocok) return cocok.namaKelas;
  }
  if (rombelDiTingkat.length === 1) return rombelDiTingkat[0].namaKelas;
  return '';
}

export function waliKelasUntuk(daftarKelas, tingkat, namaRombel) {
  const k = daftarKelas.find(x => x.tingkat === tingkat && x.namaKelas === namaRombel);
  return k?.waliKelas || '';
}

// Status yg TIDAK melanjutkan siswa ke tahun ajaran berikutnya (tidak perlu baris
// riwayat baru di Tahun Ajaran Tujuan, dan Data Siswa cache-nya cukup diubah Status-nya saja).
export const STATUS_TIDAK_LANJUT = ['Lulus', 'Pindah Sekolah', 'Berhenti'];

// Bangun RENCANA lengkap 1x proses Kenaikan Kelas Tahunan -- FUNGSI MURNI (tidak
// menyentuh network sama sekali) supaya gampang ditelusuri/diuji terpisah dari UI.
// keputusanPerSiswa: Map/objek { [siswaId]: { decision, targetKelas, targetRombel, keterangan } }
// utk siswa yg SUDAH diberi keputusan (biasanya lewat default + override manual di UI).
// Hasil: { riwayatAsalUpdate: [{no, patch}], riwayatAsalInsert: [row,...],
//          riwayatTujuanInsert: [row,...], siswaCacheUpdate: [{no, patch}] }
export function buildRencanaKenaikanKelas({
  siswaTerpilih, keputusanPerSiswa, taAsalLabel, taTujuanLabel, riwayatAkademik, tanggalHariIni,
}) {
  const riwayatAsalUpdate = [];
  const riwayatAsalInsert = [];
  const riwayatTujuanInsert = [];
  const siswaCacheUpdate = [];

  siswaTerpilih.forEach(s => {
    const keputusan = keputusanPerSiswa[s.id];
    if (!keputusan || !keputusan.decision) return;
    const { decision, targetKelas, targetRombel, targetWaliKelas, keterangan } = keputusan;

    // ---- 1. Tutup baris riwayat Tahun Ajaran ASAL (isi Status akhir tahunnya) ----
    const riwayatAsal = cariRiwayatAkademik(s, taAsalLabel, riwayatAkademik);
    const ketOtomatis = decision === 'Lanjut Jenjang' ? `Lulus ${jenjangDariTingkat(s.kelasTingkat)}, lanjut ke ${namaTingkat(targetKelas)}` : '';
    if (riwayatAsal) {
      riwayatAsalUpdate.push({ no: riwayatAsal.no, patch: { Status: decision, Keterangan: keterangan || ketOtomatis || riwayatAsal.keterangan || '', Tanggal: tanggalHariIni, ...(s.idSiswa ? { 'ID Siswa': s.idSiswa } : {}) } });
    } else {
      // Belum pernah tercatat sama sekali utk tahun ajaran ini (baru pertama kali
      // pakai fitur ini) -- buat baris baseline-nya SEKARANG, pakai kondisi Data
      // Siswa saat ini apa adanya, supaya riwayatnya tetap ada titik awalnya.
      riwayatAsalInsert.push({
        NISN: s.nisn, 'ID Siswa': s.idSiswa || '', 'Nama Siswa': s.nama, 'Tahun Ajaran': taAsalLabel,
        'Kelas/Tingkat': s.kelasTingkat, Rombel: s.rombel, 'Wali Kelas': '',
        Status: decision, Tanggal: tanggalHariIni, Keterangan: keterangan || ketOtomatis || '',
      });
    }

    if (STATUS_TIDAK_LANJUT.includes(decision)) {
      // ---- 2a. Siswa TIDAK lanjut ke tahun ajaran baru -- cache Data Siswa cuma
      // Status-nya yg berubah, Kelas/Rombel dibiarkan (jadi "kelas terakhir"). ----
      siswaCacheUpdate.push({ no: s.no, patch: { Status: decision } });
    } else {
      // ---- 2b. Siswa LANJUT (Naik/Tinggal Kelas) -- baris riwayat baru di Tahun
      // Ajaran TUJUAN, dan cache Data Siswa disalin dari keputusan ini. ----
      riwayatTujuanInsert.push({
        NISN: s.nisn, 'ID Siswa': s.idSiswa || '', 'Nama Siswa': s.nama, 'Tahun Ajaran': taTujuanLabel,
        'Kelas/Tingkat': targetKelas, Rombel: targetRombel || '', 'Wali Kelas': targetWaliKelas || '',
        Status: 'Aktif', Tanggal: tanggalHariIni, Keterangan: '',
      });
      siswaCacheUpdate.push({ no: s.no, patch: { 'Kelas/Tingkat': targetKelas, Rombel: targetRombel || '', Status: 'Aktif', Jenjang: jenjangDariTingkat(targetKelas) || s.jenjang || '' } });
    }
  });

  return { riwayatAsalUpdate, riwayatAsalInsert, riwayatTujuanInsert, siswaCacheUpdate };
}
