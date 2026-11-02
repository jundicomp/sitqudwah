// =====================================================================
// PENANDATANGAN RAPOR (v1.60.0) -- 2 pengaturan terpisah: PAUD & SD.
// Disimpan di Sheets Data Induk tab "Pengaturan Sistem" (Kunci = ttd-PAUD / ttd-SD),
// jadi tidak perlu mengubah Apps Script. Kepala disimpan sbg RIWAYAT jabatan: dokumen
// memakai kepala yg menjabat pada tanggal dokumen, sehingga rapor lama tetap benar.
// =====================================================================
import { nilaiKunci } from './sistemFields';

export const PILIHAN_ORTU = [
  { value: 'ayah', label: 'Nama Ayah (bila kosong → Ibu)' },
  { value: 'ibu', label: 'Nama Ibu (bila kosong → Ayah)' },
  { value: 'wali', label: 'Nama Wali (bila kosong → Ayah/Ibu)' },
  { value: 'kosong', label: 'Kosong (titik-titik, tulis tangan)' },
];
export const TTD_BAWAAN = { kepala: [], ortu: 'ayah', tempat: '', niyKepala: true, niyWali: true, oleh: '', pada: '' };
export const kunciTtd = (jenis) => `ttd-${jenis === 'PAUD' ? 'PAUD' : 'SD'}`;
export const jabatanBawaan = (jenis) => (jenis === 'PAUD' ? 'Kepala Satuan PAUD KB Islam Terpadu Qudwah' : 'Kepala Sekolah');

const s = (v) => String(v ?? '').trim();
export function ttdDariRows(rows, jenis) {
  const t = nilaiKunci(rows, kunciTtd(jenis), TTD_BAWAAN);
  return {
    ...t,
    kepala: (Array.isArray(t.kepala) ? t.kepala : []).map(k => ({ id: s(k.id) || buatIdKepala(), nama: s(k.nama), niy: s(k.niy), jabatan: s(k.jabatan), mulai: s(k.mulai).slice(0, 10), selesai: s(k.selesai).slice(0, 10) }))
      .filter(k => k.nama).sort((a, b) => (b.mulai || '').localeCompare(a.mulai || '')),
    ortu: PILIHAN_ORTU.some(o => o.value === t.ortu) ? t.ortu : 'ayah',
    niyKepala: t.niyKepala !== false, niyWali: t.niyWali !== false, tempat: s(t.tempat),
  };
}
export const buatIdKepala = () => 'KPL-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// "2026-11-02" hari ini (WIB) bila tanggal dokumen kosong.
const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
export function kepalaPada(ttd, tanggal) {
  const tgl = s(tanggal).slice(0, 10) || hariIni();
  const list = ttd?.kepala || [];
  return list.find(k => (!k.mulai || k.mulai <= tgl) && (!k.selesai || tgl <= k.selesai)) || null;
}
export const statusKepala = (k, tgl = hariIni()) => ((!k.mulai || k.mulai <= tgl) && (!k.selesai || tgl <= k.selesai) ? 'Aktif' : (k.mulai && k.mulai > tgl ? 'Akan datang' : 'Selesai'));

export function namaOrtu(pilihan, { ayah, ibu, wali }) {
  const a = s(ayah), i = s(ibu), w = s(wali);
  if (pilihan === 'kosong') return '';
  if (pilihan === 'ibu') return i || a || w;
  if (pilihan === 'wali') return w || a || i;
  return a || i || w;
}

// Sehari sebelum tanggal ISO.
export function kemarinDari(iso) {
  const d = new Date(iso + 'T00:00:00Z'); if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10);
}
// Tambah/ubah kepala. Kepala baru -> kepala sebelumnya yg masih terbuka ditutup sehari sebelumnya.
export function simpanKepalaKeDaftar(list, k, baru) {
  let hasil = list.filter(x => x.id !== k.id);
  if (baru && k.mulai) {
    hasil = hasil.map(x => (!x.selesai && x.mulai && x.mulai < k.mulai ? { ...x, selesai: kemarinDari(k.mulai) } : x));
  }
  return [...hasil, k].sort((a, b) => (b.mulai || '').localeCompare(a.mulai || ''));
}
export function cekKepala(k, list, baru) {
  if (!s(k.nama)) return 'Nama kepala wajib diisi.';
  if (!k.mulai) return 'Tanggal mulai menjabat wajib diisi.';
  if (k.selesai && k.selesai < k.mulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  const sim = simpanKepalaKeDaftar(list, k, baru);
  const bentrok = sim.find(x => x.id !== k.id && x.mulai && (x.selesai || '9999') >= k.mulai && (k.selesai || '9999') >= x.mulai);
  if (bentrok) return `Masa jabatan bentrok dengan ${bentrok.nama}${bentrok.selesai ? '' : ' (masih menjabat)'}. Atur tanggal selesainya dulu.`;
  return '';
}

// Terapkan penandatangan ke dokumen (rapor PAUD / SD, modul, rencana). Bila pengaturan
// belum diisi, nilai lama di dokumen (dari Pengaturan Rapor) dipertahankan.
// `guru` = daftar Data Guru (utk NIY wali kelas). `ortu` = { ayah, ibu, wali }.
export function terapkanTtd(d, ttd, { guru = [], ortu = null } = {}) {
  if (!d || !ttd) return d;
  const k = kepalaPada(ttd, d.tanggal);
  const hasil = { ...d };
  if (k) {
    hasil.kepala = k.nama;
    hasil.kepalaNiy = k.niy;
    if (k.jabatan) hasil.jabatanKepala = k.jabatan;
  }
  if (!ttd.niyKepala) hasil.kepalaNiy = '';
  if (ttd.tempat) hasil.tempat = ttd.tempat;
  if ('wali' in d || 'waliNiy' in d) {
    const g = guru.find(x => x.nama === d.wali);
    hasil.waliNiy = ttd.niyWali ? (g?.nip || d.waliNiy || '') : '';
  }
  if (ortu) hasil.ortuTtd = namaOrtu(ttd.ortu, ortu);
  return hasil;
}
// Nama ortu dari dokumen rapor yg sudah ada (PAUD: keluarga, SD: ortu + walimurid).
export const ortuDariDokumen = (d) => (d?.jenis === 'SD'
  ? { ayah: d.ortu?.ayah, ibu: d.ortu?.ibu, wali: d.walimurid?.nama }
  : { ayah: d?.keluarga?.ayah, ibu: d?.keluarga?.ibu, wali: d?.keluarga?.wali });
export const ortuDariSiswa = (x) => ({ ayah: x?.namaAyah, ibu: x?.namaIbu, wali: x?.namaWali });
