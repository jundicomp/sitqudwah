import { KATEGORI_PENGELUARAN_OPTIONS } from './pengeluaranFields';

export const AKUN_HEADERS = ['No', 'Kode Akun', 'Nama Akun', 'Jenis', 'Saldo Normal'];

export const JENIS_AKUN_OPTIONS = ['Aktiva', 'Kewajiban', 'Modal', 'Pendapatan', 'Beban'];
export const SALDO_NORMAL_OPTIONS = ['Debit', 'Kredit'];

export const AKUN_FIELDS = [
  { key: 'Kode Akun', label: 'Kode Akun', type: 'text', required: true, placeholder: 'mis. 5-1010' },
  { key: 'Nama Akun', label: 'Nama Akun', type: 'text', required: true, placeholder: 'mis. Beban Transportasi' },
  { key: 'Jenis', label: 'Jenis Akun', type: 'select', options: JENIS_AKUN_OPTIONS, required: true },
  { key: 'Saldo Normal', label: 'Saldo Normal', type: 'select', options: SALDO_NORMAL_OPTIONS, required: true },
];

export function emptyAkunRow() {
  return { 'Kode Akun': '', 'Nama Akun': '', Jenis: '', 'Saldo Normal': '' };
}

// Daftar akun bertipe Kas/Bank (Kas bawaan + akun custom bertipe Aktiva yg ditandai
// sbg kas/bank, mis. "Bank BCA") -- BUKAN semua akun Aktiva (Piutang Siswa misalnya
// Aktiva tapi BUKAN tempat uang tunai/bank sungguhan, jadi sengaja dikecualikan).
// Dipakai utk mengisi pilihan "Akun" di form Catat Pembayaran/Pengeluaran/Pemasukan
// Lain, supaya user pilih manual akun mana yg menerima/mengeluarkan uang.
export function akunAktivaOptions(akunCustom) {
  const bawaanKasBank = AKUN_BAWAAN.filter(a => a.isKasBank).map(a => a.nama);
  const customKasBank = akunCustom.filter(a => a.jenis === 'Aktiva').map(a => a.nama);
  return [...bawaanKasBank, ...customKasBank];
}

export function normalizeSheetAkun(row, idx) {
  return {
    id: 'AKN-' + (row['No'] ?? idx),
    no: row['No'],
    kode: String(row['Kode Akun'] ?? '').trim(),
    nama: String(row['Nama Akun'] ?? '').trim(),
    jenis: String(row['Jenis'] ?? '').trim(),
    saldoNormal: String(row['Saldo Normal'] ?? '').trim(),
  };
}

// Akun standar yg otomatis "ada" secara konsep (Kas, Piutang, Pendapatan) --
// TIDAK disimpan di Sheet, TAPI selalu ditawarkan sbg pilihan di Buku Besar karena
// setiap transaksi SPP/Biaya Lain/Pemasukan Lain/Pengeluaran otomatis bisa dipetakan
// ke salah satu akun ini tanpa perlu setup manual dulu. User tetap bisa menambah akun
// BARU sendiri (tersimpan di Sheet) utk kebutuhan yg lebih detail dari ini.
export const AKUN_BAWAAN = [
  { id: 'BAWAAN-kas', kode: '1-1000', nama: 'Kas', jenis: 'Aktiva', saldoNormal: 'Debit', bawaan: true, isKasBank: true },
  { id: 'BAWAAN-piutang', kode: '1-1100', nama: 'Piutang Siswa', jenis: 'Aktiva', saldoNormal: 'Debit', bawaan: true },
  { id: 'BAWAAN-pend-spp', kode: '4-1000', nama: 'Pendapatan SPP', jenis: 'Pendapatan', saldoNormal: 'Kredit', bawaan: true },
  { id: 'BAWAAN-pend-lain-siswa', kode: '4-1100', nama: 'Pendapatan Biaya Lain Siswa', jenis: 'Pendapatan', saldoNormal: 'Kredit', bawaan: true },
  { id: 'BAWAAN-pend-nonsiswa', kode: '4-2000', nama: 'Pendapatan Lain-lain (Non-Siswa)', jenis: 'Pendapatan', saldoNormal: 'Kredit', bawaan: true },
  ...KATEGORI_PENGELUARAN_OPTIONS.map((k, i) => ({
    id: 'BAWAAN-beban-' + i,
    kode: `5-${1000 + i * 10}`,
    nama: `Beban ${k}`,
    jenis: 'Beban',
    saldoNormal: 'Debit',
    bawaan: true,
    kategoriPengeluaran: k, // dipakai utk pencocokan mutasi
  })),
];
