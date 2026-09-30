// Perpustakaan: katalog, sirkulasi, denda, reservasi. Istilah & daftar pilihan dari versi HTML.
import { labelRombel } from './akademikFields';
import { pegawaiAktif } from './kepegawaianFields';
import { kodeSiswa, kodeGuru } from './presensiBarcodeFields';

export const KATEGORI_BUKU = ['Fiksi', 'Non-Fiksi', 'Pelajaran', 'Referensi', 'Keagamaan', 'Biografi', 'Sains', 'Sejarah', 'Anak-anak', 'Lainnya'];
export const JENIS_KOLEKSI = ['Fisik', 'Digital', 'Fisik & Digital'];
export const FORMAT_DIGITAL = ['PDF', 'EPUB', 'Audio', 'Video', 'Tautan Web'];
export const JENIS_DENDA = ['Keterlambatan', 'Kerusakan atau Kehilangan', 'Lainnya'];
export const STATUS_DENDA = ['Belum Dibayar', 'Lunas'];
export const STATUS_RESERVASI = ['Menunggu', 'Siap Diambil', 'Selesai', 'Dibatalkan'];

export const PERPUS_DEFAULT = { tarifDendaPerHari: '500', maxHariPinjam: '7', maxBukuPerAnggota: '3', hariSiapDiambil: '3' };
export const LABEL_PERPUS = {
  tarifDendaPerHari: 'Denda keterlambatan per hari (Rp)', maxHariPinjam: 'Lama pinjam (hari)',
  maxBukuPerAnggota: 'Maksimal buku dipinjam bersamaan per anggota', hariSiapDiambil: 'Batas ambil reservasi (hari)',
};
export function bacaPengaturanPerpus(rows) {
  const out = { ...PERPUS_DEFAULT };
  (rows || []).forEach(r => { const k = String(r['Kunci'] ?? '').trim(); if (k in out && String(r['Nilai'] ?? '').trim() !== '') out[k] = String(r['Nilai']).trim(); });
  return out;
}

export const BUKU_HEADERS = ['No', 'Kode Buku', 'Judul', 'Penulis', 'Penerbit', 'Tahun Terbit', 'ISBN', 'Kategori', 'Jenis Koleksi', 'Lokasi Rak', 'Jumlah Eksemplar'];
export const SIRKULASI_HEADERS = ['No', 'Tanggal Pinjam', 'Jatuh Tempo', 'Tanggal Kembali', 'Kode Buku', 'Judul Buku', 'Nama Peminjam', 'Kelas / Kategori', 'Status', 'Petugas'];
export const DENDA_HEADERS = ['No', 'Tanggal Denda', 'Nama Peminjam', 'Judul Buku', 'Jenis Denda', 'Hari Terlambat', 'Nominal', 'Status', 'Tanggal Bayar', 'Keterangan'];
export const RESERVASI_HEADERS = ['No', 'Tanggal Reservasi', 'Nama Peminjam', 'Kode Buku', 'Judul Buku', 'Status', 'Catatan'];

const s = (v) => String(v ?? '').trim();
const tgl = (v) => s(v).slice(0, 10);

export function normalizeSheetBuku(r, i) {
  return {
    id: 'BK-' + (r['No'] ?? i), no: r['No'], raw: r, kode: s(r['Kode Buku']), judul: s(r['Judul']), penulis: s(r['Penulis']), penerbit: s(r['Penerbit']),
    tahun: s(r['Tahun Terbit']), isbn: s(r['ISBN']), kategori: s(r['Kategori']), jenis: s(r['Jenis Koleksi']) || 'Fisik',
    format: s(r['Format Digital']), tautan: s(r['Tautan Digital']), rak: s(r['Lokasi Rak']), eksemplar: Number(r['Jumlah Eksemplar']) || 0,
  };
}
export function normalizeSheetSirkulasi(r, i) {
  return {
    id: 'SRK-' + (r['No'] ?? i), no: r['No'], raw: r, kodeBuku: s(r['Kode Buku']), judul: s(r['Judul Buku']), kodeAnggota: s(r['Kode Anggota']),
    jenisPeminjam: s(r['Jenis Peminjam']), nama: s(r['Nama Peminjam']), kelas: s(r['Kelas / Kategori']),
    pinjam: tgl(r['Tanggal Pinjam']), jatuhTempo: tgl(r['Jatuh Tempo']), kembali: tgl(r['Tanggal Kembali']), status: s(r['Status']) || 'Dipinjam', petugas: s(r['Petugas']),
  };
}
export function normalizeSheetDendaPerpus(r, i) {
  return {
    id: 'DND-' + (r['No'] ?? i), no: r['No'], raw: r, noSirkulasi: s(r['No Sirkulasi']), kodeBuku: s(r['Kode Buku']), judul: s(r['Judul Buku']),
    kodeAnggota: s(r['Kode Anggota']), nama: s(r['Nama Peminjam']), jenis: s(r['Jenis Denda']), hari: Number(r['Hari Terlambat']) || 0,
    nominal: Number(r['Nominal']) || 0, status: s(r['Status']) || 'Belum Dibayar', tanggal: tgl(r['Tanggal Denda']), tanggalBayar: tgl(r['Tanggal Bayar']),
  };
}
export function normalizeSheetReservasi(r, i) {
  return {
    id: 'RSV-' + (r['No'] ?? i), no: r['No'], raw: r, kodeBuku: s(r['Kode Buku']), judul: s(r['Judul Buku']), kodeAnggota: s(r['Kode Anggota']),
    nama: s(r['Nama Peminjam']), tanggal: tgl(r['Tanggal Reservasi']), status: s(r['Status']) || 'Menunggu', catatan: s(r['Catatan']),
  };
}

// ---- Helper ----
export const tambahHari = (iso, n) => new Date(new Date(iso + 'T00:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);
export const selisihHari = (dari, sampai) => Math.round((new Date(sampai + 'T00:00:00Z') - new Date(dari + 'T00:00:00Z')) / 864e5);
export const sedangDipinjam = (x) => x.status === 'Dipinjam';

// Semua anggota = siswa aktif ber-NISN + guru/staff aktif. Kode = kode kartu presensi.
export function daftarAnggota(siswa, guru) {
  return [
    ...siswa.filter(x => x.status === 'Aktif' && x.nisn).map(x => ({ kode: kodeSiswa(x), nama: x.nama, jenis: 'Siswa', info: labelRombel(x.kelasTingkat, x.rombel) })),
    ...pegawaiAktif(guru).map(g => ({ kode: kodeGuru(g), nama: g.nama, jenis: g.kategori || 'Guru', info: g.kategori || 'Guru' })),
  ].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

// Kode buku berikutnya: BK-0001, BK-0002, ... (lanjut dari angka terbesar yg ada).
export function kodeBukuBerikutnya(buku) {
  const max = buku.reduce((m, b) => { const n = Number((b.kode.match(/(\d+)$/) || [])[1]); return n > m ? n : m; }, 0);
  return `BK-${String(max + 1).padStart(4, '0')}`;
}

export function stokBuku(b, sirkulasi) {
  const dipinjam = sirkulasi.filter(x => x.kodeBuku === b.kode && sedangDipinjam(x)).length;
  return { dipinjam, tersedia: Math.max(0, b.eksemplar - dipinjam) };
}

export function buildBukuFields() {
  return [
    { key: 'Kode Buku', label: 'Kode Buku', type: 'text', placeholder: 'kosongkan = otomatis (BK-0001, dst)' },
    { key: 'Judul', label: 'Judul Buku', type: 'text', required: true },
    { key: 'Penulis', label: 'Penulis', type: 'text' },
    { key: 'Penerbit', label: 'Penerbit', type: 'text' },
    { key: 'Tahun Terbit', label: 'Tahun Terbit', type: 'number' },
    { key: 'ISBN', label: 'ISBN', type: 'text' },
    { key: 'Kategori', label: 'Kategori', type: 'select', options: KATEGORI_BUKU, required: true },
    { key: 'Jenis Koleksi', label: 'Jenis Koleksi', type: 'select', options: JENIS_KOLEKSI, required: true },
    { key: 'Format Digital', label: 'Format Digital', type: 'select', options: FORMAT_DIGITAL },
    { key: 'Tautan Digital', label: 'Tautan / Link Digital', type: 'text', placeholder: 'https://…' },
    { key: 'Lokasi Rak', label: 'Lokasi Rak', type: 'text', placeholder: 'mis. A-2' },
    { key: 'Jumlah Eksemplar', label: 'Jumlah Eksemplar', type: 'number', required: true },
    { key: 'Keterangan', label: 'Keterangan', type: 'text' },
  ];
}
