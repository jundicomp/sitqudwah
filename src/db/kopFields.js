// =====================================================================
// KOP SURAT (v1.67.1)
// - Data tambahan profil (Kunci = profil-tambahan): field yg tidak ada di sheet Profil.
// - Tampilan kop (Kunci = kop): field mana yg dicantumkan + jenis garis.
// Keduanya di sheet Pengaturan Sistem, jadi tanpa perubahan Apps Script.
// =====================================================================
import { nilaiKunci } from './sistemFields';

export const TAMBAHAN_BAWAAN = {
  barisAtas: '', namaKop: '', akreditasi: '', desa: '', kecamatan: '', kabupaten: '',
  provinsi: '', kodePos: '', website: '', logoPemda: '',
};
export const TAMBAHAN_FIELDS = [
  { key: 'barisAtas', label: 'Baris atas kop (yayasan)', ph: 'mis. YAYASAN SIT QUDWAH SUNGAI RENGIT' },
  { key: 'namaKop', label: 'Nama sekolah di kop', ph: 'Kosongkan = pakai Nama Sekolah' },
  { key: 'akreditasi', label: 'Akreditasi', ph: 'Kosongkan = ambil dari tab Akreditasi; isi - bila belum' },
  { key: 'desa', label: 'Desa / Kelurahan', ph: 'mis. Talang Mainan Sungai Rengit' },
  { key: 'kecamatan', label: 'Kecamatan', ph: 'mis. Kec. Talang Kelapa' },
  { key: 'kabupaten', label: 'Kabupaten / Kota', ph: 'mis. Kab. Banyuasin' },
  { key: 'provinsi', label: 'Provinsi', ph: 'mis. Prov. Sumatera Selatan' },
  { key: 'kodePos', label: 'Kode Pos', ph: 'mis. 30961' },
  { key: 'website', label: 'Website', ph: 'mis. https://sitqudwahsungairengit.sch.id/' },
];

export const KOP_PILIHAN = [
  { key: 'logoKiri', label: 'Logo Yayasan / Pemda (kiri)' },
  { key: 'logoKanan', label: 'Logo Sekolah (kanan)' },
  { key: 'barisAtas', label: 'Baris atas' },
  { key: 'nama', label: 'Nama sekolah' },
  { key: 'npsn', label: 'NPSN' },
  { key: 'akreditasi', label: 'Akreditasi' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'desa', label: 'Desa / Kelurahan' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'kabupaten', label: 'Kabupaten / Kota' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'kodePos', label: 'Kode Pos' },
  { key: 'telepon', label: 'Telepon / HP' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
];
export const GARIS_OPSI = [
  { value: '1', label: 'Garis 1' },
  { value: '2', label: 'Garis 2 (tebal + tipis)' },
  { value: '0', label: 'Tanpa garis' },
];
export const SEBUTAN_TELEPON = ['HP', 'Telp.', 'WA', 'Telp/HP'];

export const KOP_BAWAAN = {
  tampil: {
    logoKiri: true, logoKanan: true, barisAtas: true, nama: true, npsn: true, akreditasi: true, alamat: true,
    desa: true, kecamatan: true, kabupaten: true, provinsi: true, kodePos: true, telepon: true, email: true, website: true,
  },
  garis: '1', sebutanTelepon: 'HP', oleh: '', pada: '',
};

export const tambahanDariRows = (rows) => nilaiKunci(rows, 'profil-tambahan', TAMBAHAN_BAWAAN);
export function kopDariRows(rows) {
  const k = nilaiKunci(rows, 'kop', KOP_BAWAAN);
  return { ...k, tampil: { ...KOP_BAWAAN.tampil, ...(k.tampil || {}) } };
}

// Susun isi kop dari profil + data tambahan + pengaturan tampil.
// Baris: [atas] [nama] [NPSN | Akreditasi] [alamat + desa] [kec, kab, prov]
//        [Kode Pos · e-mail · HP] [Website Sekolah]
export function susunKop(profil, tambahan, kop, akreditasiTerbaru = '') {
  const p = profil || {}, t = tambahan || TAMBAHAN_BAWAAN, k = kop || KOP_BAWAAN, on = k.tampil || {};
  const ya = (key, v) => (on[key] && String(v ?? '').trim() ? String(v).trim() : '');
  return {
    logoKiri: on.logoKiri ? (t.logoPemda || '') : '',
    logoKanan: on.logoKanan ? (p.logo || '') : '',
    barisAtas: ya('barisAtas', t.barisAtas),
    nama: on.nama ? (String(t.namaKop || '').trim() || p.nama || '') : '',
    npsn: ya('npsn', p.npsn),
    akreditasi: ya('akreditasi', String(t.akreditasi || '').trim() || akreditasiTerbaru),
    alamat: [ya('alamat', p.alamat), ya('desa', t.desa)].filter(Boolean).join(' '),
    wilayah: [ya('kecamatan', t.kecamatan), ya('kabupaten', t.kabupaten), ya('provinsi', t.provinsi)].filter(Boolean).join(', '),
    kodePos: ya('kodePos', t.kodePos),
    email: ya('email', p.email),
    telepon: ya('telepon', p.telepon),
    sebutanTelepon: k.sebutanTelepon || 'HP',
    website: ya('website', t.website),
    garis: ['0', '1', '2'].includes(String(k.garis)) ? String(k.garis) : '1',
  };
}

// Peringkat dari tab Akreditasi (tahun terbaru) -- dipakai bila field Akreditasi kosong.
export const peringkatTerbaru = (list) => ([...(list || [])].sort((a, b) => String(b.tahun).localeCompare(String(a.tahun)))[0]?.peringkat || '');
