// ===================================================================
// JENJANG & TINGKAT KELAS -- DIKELOLA DARI APLIKASI (bukan di file ini)
// ===================================================================
// Daftar jenjang diatur di Pengaturan › Data Kelas & Rombel › tab "Jenjang & Tingkat"
// dan disimpan di Google Sheets Data Induk (tab "Jenjang & Tingkat").
// JENJANG_BAWAAN di bawah HANYA dipakai selama sekolah belum menyimpan daftarnya sendiri.
//
// Teknis: JENJANG, TINGKAT_OPTIONS, dst adalah array "hidup" -- isinya diganti di
// tempat (bukan dibuat ulang) oleh setJenjang(), supaya definisi form/pilihan yg
// sudah memegang referensi array ini otomatis ikut berubah tanpa reload.
// ===================================================================
export const JENJANG_BAWAAN = [
  { kode: 'TK', nama: 'TK', tingkat: ['TK A', 'TK B'], aktif: true },
  { kode: 'SD', nama: 'SD', tingkat: ['1', '2', '3', '4', '5', '6'], aktif: true },
  { kode: 'SMP', nama: 'SMP', tingkat: ['7', '8', '9'], aktif: true },
  { kode: 'SMA', nama: 'SMA', tingkat: ['10', '11', '12'], aktif: true },
];

// Template cepat utk tombol "+ Tambah" di layar pengaturan.
export const TEMPLATE_JENJANG = [
  { kode: 'PAUD', nama: 'PAUD / Kelompok Bermain', tingkat: ['KB'] },
  { kode: 'TK', nama: 'TK', tingkat: ['TK A', 'TK B'] },
  { kode: 'RA', nama: 'RA', tingkat: ['RA A', 'RA B'] },
  { kode: 'SD', nama: 'SD', tingkat: ['1', '2', '3', '4', '5', '6'] },
  { kode: 'MI', nama: 'MI', tingkat: ['1', '2', '3', '4', '5', '6'] },
  { kode: 'SMP', nama: 'SMP', tingkat: ['7', '8', '9'] },
  { kode: 'MTs', nama: 'MTs', tingkat: ['7', '8', '9'] },
  { kode: 'SMA', nama: 'SMA', tingkat: ['10', '11', '12'] },
  { kode: 'MA', nama: 'MA', tingkat: ['10', '11', '12'] },
  { kode: 'SMK', nama: 'SMK', tingkat: ['10', '11', '12'] },
];

export const SEMUA_JENJANG = [];        // termasuk yg nonaktif (utk mengenali data lama)
export const JENJANG = [];              // hanya yg aktif -- dipakai semua pilihan
export const TINGKAT_OPTIONS = [];      // TK A, TK B, 1, 2, ... sesuai urutan jenjang
export const JENJANG_KODE_OPTIONS = []; // ['TK', 'SD', ...] utk kolom Jenjang di Data Siswa
let dariSheets = false;

const pendengar = [];
// Modul lain mendaftarkan fungsi utk menghitung ulang pilihan turunannya
// (mis. pilihan tarif "Semua SD"). Langsung dipanggil sekali saat didaftarkan.
export function onJenjangBerubah(fn) { pendengar.push(fn); fn(); }

const ganti = (arr, isi) => arr.splice(0, arr.length, ...isi);
export function setJenjang(list) {
  dariSheets = Array.isArray(list) && list.length > 0;
  const semua = dariSheets ? list : JENJANG_BAWAAN;
  ganti(SEMUA_JENJANG, semua);
  ganti(JENJANG, semua.filter(j => j.aktif !== false));
  ganti(TINGKAT_OPTIONS, JENJANG.flatMap(j => j.tingkat));
  ganti(JENJANG_KODE_OPTIONS, JENJANG.map(j => j.kode));
  pendengar.forEach(fn => fn());
}
export const jenjangDariSheets = () => dariSheets;
setJenjang(null);

export function jenjangDariTingkat(tingkat) {
  const t = String(tingkat ?? '').trim();
  return SEMUA_JENJANG.find(j => j.tingkat.includes(t))?.kode || '';
}
export const tingkatTerakhirJenjang = (tingkat) => {
  const j = SEMUA_JENJANG.find(x => x.tingkat.includes(String(tingkat)));
  return !!j && j.tingkat[j.tingkat.length - 1] === String(tingkat);
};
// Urutan tampil mengikuti urutan jenjang & tingkat yg diatur sekolah.
export const urutanTingkat = (t) => { const i = TINGKAT_OPTIONS.indexOf(String(t)); return i === -1 ? 999 : i; };
export const bandingTingkat = (a, b) => urutanTingkat(a) - urutanTingkat(b) || String(a).localeCompare(String(b), 'id', { numeric: true });
// Angka polos -> "Kelas 7"; tingkat bernama (TK A, KB, RA B) tampil apa adanya.
export const namaTingkat = (t) => (/^\d+$/.test(String(t).trim()) ? `Kelas ${t}` : String(t));
export const LABEL_SEMUA_JENJANG = (kode) => `Semua ${kode}`;
export const LABEL_JENJANG = (kode) => `Jenjang ${kode}`;

// Baris Sheet -> objek jenjang. Baris yg bukan data jenjang (tanpa Kode/Tingkat) dibuang.
export function normalizeSheetJenjang(r) {
  const kode = String(r['Kode'] ?? '').trim();
  const tingkat = String(r['Tingkat'] ?? '').split(',').map(x => x.trim()).filter(Boolean);
  if (!kode || !tingkat.length) return null;
  return { kode, nama: String(r['Nama'] ?? '').trim() || kode, tingkat, aktif: !/^(tidak|false|0|nonaktif)$/i.test(String(r['Aktif'] ?? '').trim()) };
}
