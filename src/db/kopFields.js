// =====================================================================
// KOP SURAT (v1.67.1)
// - Data tambahan profil (Kunci = profil-tambahan): field yg tidak ada di sheet Profil.
// - Tampilan kop (Kunci = kop): field mana yg dicantumkan + jenis garis.
// Keduanya di sheet Pengaturan Sistem, jadi tanpa perubahan Apps Script.
// =====================================================================
import { nilaiKunci } from './sistemFields';
import { HALAMAN_KOP_BAWAAN, lengkapiHalaman } from './halamanFields';

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
export const SEBUTAN_TELEPON = ['HP', 'HP.', 'Telp.', 'WA', 'Telp/HP'];
export const GAYA_KOP = [
  { value: '1', label: 'Gaya 1 — alamat per baris (seperti kop SDIT)' },
  { value: '2', label: 'Gaya 2 — "Alamat: ..." bersambung (seperti kop KB/PAUD)' },
];
export const teleponDenganSebutan = (sebutan, tel) => (!tel ? '' : /\.$/.test(sebutan || '') ? `${sebutan}${tel}` : `${sebutan || 'HP'} ${tel}`);

export const KOP_BAWAAN = {
  tampil: {
    logoKiri: true, logoKanan: true, barisAtas: true, nama: true, npsn: true, akreditasi: true, alamat: true,
    desa: true, kecamatan: true, kabupaten: true, provinsi: true, kodePos: true, telepon: true, email: true, website: true,
  },
  garis: '1', sebutanTelepon: 'HP', gaya: '1', logoKiriMm: 25, logoKananMm: 25, halaman: HALAMAN_KOP_BAWAAN, oleh: '', pada: '',
};
// Ukuran logo (tinggi, mm) — dibatasi agar kop tetap wajar.
export const LOGO_MIN_MM = 10, LOGO_MAKS_MM = 45;
export const ukuranLogo = (v, d = 25) => Math.min(LOGO_MAKS_MM, Math.max(LOGO_MIN_MM, Number(v) || d));

// v1.71.1: tiap gambar (logo) disimpan di kuncinya SENDIRI — 1 sel Sheets maks 50 rb karakter.
export const KUNCI_GAMBAR = { logoPemda: 'logo-pemda', paudKiri: 'kop-PAUD-logo-kiri', paudKanan: 'kop-PAUD-logo-kanan' };
const gambarKunci = (rows, kunci) => String(nilaiKunci(rows, kunci, { gambar: '' }).gambar || '');
export function tambahanDariRows(rows) {
  const t = { ...TAMBAHAN_BAWAAN, ...nilaiKunci(rows, 'profil-tambahan', TAMBAHAN_BAWAAN) };
  return { ...t, logoPemda: gambarKunci(rows, KUNCI_GAMBAR.logoPemda) || t.logoPemda || '' };
}
// Pisahkan gambar dari data teks sebelum disimpan.
export const tambahanTanpaLogo = (t) => ({ ...t, logoPemda: '' });
export const kopPaudTanpaLogo = (k) => ({ ...k, data: { ...k.data, logoKiri: '', logoKanan: '' } });
export function kopDariRows(rows) {
  const k = nilaiKunci(rows, 'kop', KOP_BAWAAN);
  return { ...k, tampil: { ...KOP_BAWAAN.tampil, ...(k.tampil || {}) }, halaman: lengkapiHalaman(k.halaman, HALAMAN_KOP_BAWAAN) };
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
    gaya: String(k.gaya) === '2' ? '2' : '1',
    logoKiriMm: ukuranLogo(k.logoKiriMm),
    logoKananMm: ukuranLogo(k.logoKananMm),
  };
}

// Peringkat dari tab Akreditasi (tahun terbaru) -- dipakai bila field Akreditasi kosong.
export const peringkatTerbaru = (list) => ([...(list || [])].sort((a, b) => String(b.tahun).localeCompare(String(a.tahun)))[0]?.peringkat || '');

// ---------------------------------------------------------------------
// v1.68.0: KOP PAUD terpisah (Kunci = kop-PAUD). Isian kosong = ikut kop umum/SD.
// ---------------------------------------------------------------------
export const KOP_PAUD_FIELDS = [
  { key: 'barisAtas', label: 'Baris atas kop', ph: 'mis. PENDIDIKAN ANAK USIA DINI' },
  { key: 'namaKop', label: 'Nama satuan di kop', ph: 'mis. KB ISLAM TERPADU QUDWAH' },
  { key: 'npsn', label: 'NPSN', ph: 'mis. 60080719' },
  { key: 'akreditasi', label: 'Akreditasi', ph: 'mis. B' },
  { key: 'alamat', label: 'Alamat', ph: 'mis. Jalan Qudwah Raya RT 4 RW 2' },
  { key: 'desa', label: 'Desa / Kelurahan', ph: 'mis. Desa Sungai Rengit' },
  { key: 'kecamatan', label: 'Kecamatan', ph: 'mis. Kecamatan Talang Kelapa' },
  { key: 'kabupaten', label: 'Kabupaten / Kota', ph: 'mis. Kabupaten Banyuasin' },
  { key: 'provinsi', label: 'Provinsi', ph: '' },
  { key: 'kodePos', label: 'Kode Pos', ph: '' },
  { key: 'telepon', label: 'Telepon / HP', ph: 'mis. 0811714717' },
  { key: 'email', label: 'Email', ph: '' },
  { key: 'website', label: 'Website', ph: '' },
];
const DATA_PAUD_KOSONG = Object.fromEntries([...KOP_PAUD_FIELDS.map(f => [f.key, '']), ['logoKiri', ''], ['logoKanan', '']]);
export const KOP_PAUD_BAWAAN = {
  data: DATA_PAUD_KOSONG,
  tampil: { ...KOP_BAWAAN.tampil, provinsi: false, kodePos: false, email: false, website: false },
  garis: '2', sebutanTelepon: 'HP.', gaya: '2', logoKiriMm: 25, logoKananMm: 25, oleh: '', pada: '',
};
export function kopPaudDariRows(rows) {
  const k = nilaiKunci(rows, 'kop-PAUD', KOP_PAUD_BAWAAN);
  const data = { ...DATA_PAUD_KOSONG, ...(k.data || {}) };
  data.logoKiri = gambarKunci(rows, KUNCI_GAMBAR.paudKiri) || data.logoKiri || '';
  data.logoKanan = gambarKunci(rows, KUNCI_GAMBAR.paudKanan) || data.logoKanan || '';
  return { ...KOP_PAUD_BAWAAN, ...k, data, tampil: { ...KOP_PAUD_BAWAAN.tampil, ...(k.tampil || {}) } };
}
// Nilai PAUD bila diisi, selain itu nilai kop umum.
export function gabungKopPaud(profil, tambahan, kopPaud) {
  const p = profil || {}, t = tambahan || TAMBAHAN_BAWAAN, d = kopPaud?.data || {};
  const pilih = (x, y) => (String(x ?? '').trim() ? x : y);
  return {
    profil: { ...p, npsn: pilih(d.npsn, p.npsn), alamat: pilih(d.alamat, p.alamat), telepon: pilih(d.telepon, p.telepon), email: pilih(d.email, p.email), logo: pilih(d.logoKanan, p.logo) },
    tambahan: {
      ...t, logoPemda: pilih(d.logoKiri, t.logoPemda),
      ...Object.fromEntries(['barisAtas', 'namaKop', 'akreditasi', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'kodePos', 'website'].map(key => [key, pilih(d[key], t[key])])),
      namaKop: pilih(d.namaKop, t.namaKop || p.nama),
    },
    kop: kopPaud || KOP_PAUD_BAWAAN,
  };
}
