// =====================================================================
// SURAT TANDA SERTA BELAJAR (STSB) PAUD -- v1.68.0
// Hal. 1: kop PAUD, judul, nomor surat, identitas anak, kalimat keikutsertaan,
//         tanda tangan Ketua Yayasan + Kepala Sekolah, pas foto di tengah.
// Hal. 2: Laporan Perkembangan Anak (nilai A-D per aspek).
// Pengaturan (Kunci = stsb) & isian per tahun ajaran (Kunci = stsb-<TA>) disimpan
// di sheet Pengaturan Sistem -> tanpa perubahan Apps Script.
// =====================================================================
import { nilaiKunci } from './sistemFields';
import { HALAMAN_STSB_BAWAAN, lengkapiHalaman } from './halamanFields';

const s = (v) => String(v ?? '').trim();

export const STSB_BAWAAN = {
  judul: 'SURAT TANDA SERTA BELAJAR',
  labelTahun: 'TAHUN PELAJARAN',
  formatNomor: '{no}/STSB/SITQ/KB.A9/{bulan}/{tahun}',
  digitNomor: 3,
  kalimat: 'Atas keikutsertaannya secara aktif dalam Program Pendidikan Anak Usia Dini di **KB ISLAM TERPADU QUDWAH** Kabupaten Banyuasin.',
  kelompokUsia: '5 – 6 TAHUN',
  tempat: 'Sungai Rengit',
  hurufBesar: true,
  kiri: { aktif: true, pembuka: 'Mengetahui,', jabatan: 'Ketua Yayasan\nKeluarga Kita\nSungai Rengit', nama: '', labelNomor: '', nomor: '' },
  kanan: { jabatan: 'Kepala Sekolah\nKB Islam Terpadu Qudwah\nKabupaten Banyuasin,', nama: '', labelNomor: 'NUPTK', nomor: '' },
  pasFoto: true,
  fotoSiswa: true,
  halaman2: true,
  judul2: 'LAPORAN PERKEMBANGAN ANAK',
  aspek: ['Moral dan Nilai - Nilai Agama', 'Fisik / Motorik', 'Bahasa', 'Kognitif', 'Sosial – Emosi', 'Seni'],
  skala: [
    { kode: 'A', nama: 'Berkembang Sangat Baik' },
    { kode: 'B', nama: 'Berkembang Sesuai Harapan' },
    { kode: 'C', nama: 'Mulai Berkembang' },
    { kode: 'D', nama: 'Belum Berkembang' },
  ],
  halaman: HALAMAN_STSB_BAWAAN,
  oleh: '', pada: '',
};

export function lengkapiStsb(x) {
  const b = STSB_BAWAAN, o = x && typeof x === 'object' ? x : {};
  const arr = (v, d) => (Array.isArray(v) && v.length ? v : d);
  return {
    ...b, ...o,
    kiri: { ...b.kiri, ...(o.kiri || {}) },
    kanan: { ...b.kanan, ...(o.kanan || {}) },
    aspek: arr(o.aspek, b.aspek).map(s).filter(Boolean),
    skala: arr(o.skala, b.skala).map(k => ({ kode: s(k.kode), nama: s(k.nama) })).filter(k => k.kode),
    halaman: lengkapiHalaman(o.halaman, HALAMAN_STSB_BAWAAN),
    digitNomor: Math.min(6, Math.max(1, Number(o.digitNomor) || b.digitNomor)),
  };
}
// Gambar tanda tangan disimpan di kunci tersendiri (1 sel per gambar).
export const KUNCI_TTD_STSB = { kiri: 'stsb-ttd-kiri', kanan: 'stsb-ttd-kanan' };
export function stsbDariRows(rows) {
  const st = lengkapiStsb(nilaiKunci(rows, 'stsb', STSB_BAWAAN));
  const ttd = (sisi) => String(nilaiKunci(rows, KUNCI_TTD_STSB[sisi], { gambar: '' }).gambar || '');
  return { ...st, kiri: { ...st.kiri, ttd: ttd('kiri') }, kanan: { ...st.kanan, ttd: ttd('kanan') } };
}
// Pengaturan tanpa gambar ttd (utk disimpan di kunci 'stsb').
export const tanpaGambarTtd = (st) => ({ ...st, kiri: { ...st.kiri, ttd: undefined }, kanan: { ...st.kanan, ttd: undefined } });

// Isian per tahun ajaran: { tanggal, siswa: { [kunciAnak]: { urut, usia, nilai: { [aspek]: 'A' } } } }
export const kunciDataStsb = (ta) => `stsb-${s(ta)}`;
export const DATA_STSB_KOSONG = { tanggal: '', siswa: {} };
export function dataStsbDariRows(rows, ta) {
  const d = nilaiKunci(rows, kunciDataStsb(ta), DATA_STSB_KOSONG);
  return { tanggal: s(d.tanggal), siswa: d.siswa && typeof d.siswa === 'object' ? d.siswa : {} };
}
export const kunciAnak = (sw) => s(sw.idSiswa) || s(sw.nisn) || s(sw.nama);

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export function nomorSurat(format, urut, digit, tanggal, ta) {
  if (!urut) return '';
  const d = new Date(s(tanggal) + 'T00:00:00');
  const ok = !Number.isNaN(d.getTime());
  return s(format)
    .replaceAll('{no}', String(urut).padStart(digit || 3, '0'))
    .replaceAll('{bulan}', ok ? ROMAWI[d.getMonth()] : '…')
    .replaceAll('{tahun}', ok ? String(d.getFullYear()) : '…')
    .replaceAll('{ta}', s(ta));
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function tanggalPanjang(iso) {
  const d = new Date(s(iso) + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
function tanggalAngka(v) {
  const t = s(v);
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : t;
}

// Aspek yg belum dinilai (utk tanda "lengkap").
export const aspekKurang = (st, isi) => st.aspek.filter(a => !s(isi?.nilai?.[a]));

// Rakit 1 dokumen STSB siap cetak.
export function susunStsb({ st, siswa, isi, ta, tanggal, kepala }) {
  const besar = (v) => (st.hurufBesar ? s(v).toUpperCase() : s(v));
  const ttl = [besar(siswa.tempatLahir), tanggalAngka(siswa.tanggalLahir)].filter(Boolean).join(', ');
  const usia = s(isi?.usia) || st.kelompokUsia;
  return {
    jenis: 'STSB',
    st,
    ta,
    nomor: nomorSurat(st.formatNomor, isi?.urut, st.digitNomor, tanggal, ta),
    tanggal: tanggalPanjang(tanggal),
    anak: {
      nama: s(siswa.nama).toUpperCase(),
      nis: s(siswa.idSiswa),
      nisn: s(siswa.nisn),
      ttl,
      ibu: besar(siswa.namaIbu),
      usia: besar(usia),
      alamat: besar(siswa.alamat),
      agama: besar(siswa.agama),
      foto: st.fotoSiswa ? s(siswa.foto) : '',
    },
    nilai: st.aspek.map(a => ({ aspek: a, kode: s(isi?.nilai?.[a]) })),
    kiri: st.kiri,
    kanan: {
      ...st.kanan,
      nama: s(st.kanan.nama) || s(kepala?.nama),
      nomor: s(st.kanan.nomor) || s(kepala?.niy),
    },
  };
}
