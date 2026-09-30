import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';

const TIPE_LAIN_WAJIB = ['Sekali Masuk', 'Per Tahun'];

/**
 * Deteksi siswa AKTIF yang perlu tindak lanjut -- baik siswa baru, pindahan,
 * atau siapa pun yang datanya belum lengkap dibanding kondisi kelas/tagihan saat ini:
 *   1. Belum ada Kelas/Tingkat sama sekali diisi
 *   2. SUDAH ada Kelas/Tingkat, TAPI belum ditempatkan ke Rombel spesifik (mis. Yaman,
 *      Epitamala) -- sejak v1.31.27: dulu kasus ini TIDAK KETAHUAN sama sekali di sini
 *      (cuma dicek `!s.kelasTingkat`, padahal labelnya menyebut "(rombel)"), jadi siswa
 *      yg py Kelas tapi blm py Rombel lolos dari notifikasi ini -- ketahuannya cuma kalau
 *      admin sengaja buka menu Pengaturan > Data Kelas & Rombel > Pindah Rombel Massal
 *   3. Kurang tagihan SPP utk bulan-bulan yg SUDAH diterbitkan di tahun ajaran aktif
 *   4. Kurang Tagihan Lain (Uang Pangkal, Seragam, dst) yg SUDAH diterbitkan
 *      utk siswa lain -- HANYA utk tarif yg cakupan kelasnya memang relevan buat
 *      siswa itu (kalau tarifnya khusus Kelas 1, siswa Kelas 4 TIDAK ditandai
 *      kurang, karena memang bukan untuknya)
 *
 * Sengaja berbasis DATA (bukan label "pindahan" semata), supaya menangkap SEMUA
 * kasus siswa aktif yg belum lengkap -- apa pun sebabnya.
 */
export default function useSiswaPerluTindakLanjut() {
  const { siswa, tagihanSpp, tagihanLain, tarif, tahunAjaranAktif } = useAppData();

  return useMemo(() => {
    if (!tahunAjaranAktif) return [];
    const aktif = siswa.filter(s => (s.status || 'Aktif') === 'Aktif');
    const tagihanTA = tagihanSpp.filter(t => t.tahunAjaran === tahunAjaranAktif.label);
    const tagihanLainTA = tagihanLain.filter(t => t.tahunAjaran === tahunAjaranAktif.label);
    const tarifLainTA = tarif.filter(t => t.tahunAjaran === tahunAjaranAktif.label && TIPE_LAIN_WAJIB.includes(t.tipe));

    // Semua kombinasi bulan+tahun yg SUDAH pernah diterbitkan (minimal 1 siswa punya tagihan itu)
    const bulanTerbitSet = new Set(tagihanTA.map(t => `${t.bulan}-${t.tahunKalender}`));

    return aktif.map(s => {
      const masalah = [];
      if (!s.kelasTingkat) masalah.push('Belum ada Kelas/Tingkat');
      else if (!s.rombel) masalah.push('Sudah ada Kelas, tapi belum ditempatkan ke Rombel');

      const tagihanSiswa = tagihanTA.filter(t => t.nisn === s.nisn);
      const bulanSiswaSet = new Set(tagihanSiswa.map(t => `${t.bulan}-${t.tahunKalender}`));
      const bulanKurang = Array.from(bulanTerbitSet).filter(b => !bulanSiswaSet.has(b));
      if (bulanKurang.length > 0) masalah.push(`${bulanKurang.length} bulan SPP belum ditagih (sudah terbit utk siswa lain)`);

      // Tagihan Lain: HANYA cek tarif yg cakupan kelasnya relevan buat siswa ini
      // (Semua Kelas, ATAU spesifik = kelasTingkat siswa ini), DAN yg sudah pernah
      // diterbitkan ke SETIDAKNYA SATU siswa lain dlm cakupan yg sama.
      const relevantTarif = tarifLainTA.filter(t => t.kelasTingkat === 'Semua Kelas' || t.kelasTingkat === s.kelasTingkat);
      const jenisLainKurang = relevantTarif
        .filter(t => {
          const sudahTertagihUtk = tagihanLainTA.filter(x => x.label === t.jenis).map(x => x.nisn);
          const adaYgSudahTertagih = sudahTertagihUtk.length > 0; // sudah pernah diterbitkan
          const siswaIniSudah = sudahTertagihUtk.includes(s.nisn);
          return adaYgSudahTertagih && !siswaIniSudah;
        })
        .map(t => t.jenis);
      if (jenisLainKurang.length > 0) masalah.push(`Belum ditagih: ${jenisLainKurang.join(', ')} (sudah terbit utk siswa lain)`);

      return { siswa: s, masalah };
    }).filter(x => x.masalah.length > 0);
  }, [siswa, tagihanSpp, tagihanLain, tarif, tahunAjaranAktif]);
}
