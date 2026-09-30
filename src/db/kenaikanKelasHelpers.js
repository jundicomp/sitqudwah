import { TINGKAT_OPTIONS } from './kelasFields';
import { cariRiwayatAkademik } from './riwayatAkademikFields';

// Tingkat tertinggi di jenjang MI (Kelas 6) -- siswa di tingkat ini defaultnya Lulus,
// bukan Naik Kelas, krn tidak ada Kelas 7. Kalau suatu saat aplikasi ini dipakai utk
// jenjang lain (MTs/MA) dgn tingkat berbeda, cukup ganti TINGKAT_OPTIONS di kelasFields.js.
const TINGKAT_TERTINGGI = TINGKAT_OPTIONS[TINGKAT_OPTIONS.length - 1];

// Tingkat berikutnya sesudah `tingkat` -- null kalau sudah tingkat tertinggi ATAU
// tingkatnya tidak dikenali (mis. data lama yg kosong/aneh).
export function tingkatBerikutnya(tingkat) {
  const idx = TINGKAT_OPTIONS.indexOf(String(tingkat));
  if (idx === -1 || idx === TINGKAT_OPTIONS.length - 1) return null;
  return TINGKAT_OPTIONS[idx + 1];
}

// Keputusan DEFAULT utk 1 siswa, sebelum admin override manual -- siswa di tingkat
// tertinggi otomatis disarankan "Lulus", selainnya disarankan "Naik Kelas".
export function keputusanDefault(kelasTingkatSaatIni) {
  return String(kelasTingkatSaatIni) === TINGKAT_TERTINGGI ? 'Lulus' : 'Naik Kelas';
}

// Kelas/Tingkat TUJUAN utk 1 keputusan -- "Naik Kelas" pindah ke tingkat berikutnya,
// "Tinggal Kelas" TETAP di tingkat yg sama (mengulang), keputusan lain (Lulus/Pindah
// Sekolah/Berhenti) tidak perlu Kelas/Tingkat tujuan sama sekali (siswa tidak lanjut).
export function targetKelasUntukKeputusan(decision, kelasTingkatSaatIni) {
  if (decision === 'Naik Kelas') return tingkatBerikutnya(kelasTingkatSaatIni);
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
    const riwayatAsal = cariRiwayatAkademik(s.nisn, taAsalLabel, riwayatAkademik);
    if (riwayatAsal) {
      riwayatAsalUpdate.push({ no: riwayatAsal.no, patch: { Status: decision, Keterangan: keterangan || riwayatAsal.keterangan || '', Tanggal: tanggalHariIni } });
    } else {
      // Belum pernah tercatat sama sekali utk tahun ajaran ini (baru pertama kali
      // pakai fitur ini) -- buat baris baseline-nya SEKARANG, pakai kondisi Data
      // Siswa saat ini apa adanya, supaya riwayatnya tetap ada titik awalnya.
      riwayatAsalInsert.push({
        NISN: s.nisn, 'Nama Siswa': s.nama, 'Tahun Ajaran': taAsalLabel,
        'Kelas/Tingkat': s.kelasTingkat, Rombel: s.rombel, 'Wali Kelas': '',
        Status: decision, Tanggal: tanggalHariIni, Keterangan: keterangan || '',
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
        NISN: s.nisn, 'Nama Siswa': s.nama, 'Tahun Ajaran': taTujuanLabel,
        'Kelas/Tingkat': targetKelas, Rombel: targetRombel || '', 'Wali Kelas': targetWaliKelas || '',
        Status: 'Aktif', Tanggal: tanggalHariIni, Keterangan: '',
      });
      siswaCacheUpdate.push({ no: s.no, patch: { 'Kelas/Tingkat': targetKelas, Rombel: targetRombel || '', Status: 'Aktif' } });
    }
  });

  return { riwayatAsalUpdate, riwayatAsalInsert, riwayatTujuanInsert, siswaCacheUpdate };
}
