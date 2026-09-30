export const BEASISWA_KATEGORI_HEADERS = ['No', 'Nama Kategori', 'Keterangan', 'Potongan SPP (Rp)', 'Potongan Biaya Lain (Rp)'];

export const BEASISWA_KATEGORI_FIELDS = [
  { key: 'Nama Kategori', label: 'Nama Kategori', type: 'text', required: true, placeholder: 'mis. Anak Yatim, Dhuafa, Anak Guru, Kebutuhan Khusus' },
  { key: 'Keterangan', label: 'Keterangan Manfaat', type: 'text', required: true, placeholder: 'mis. Gratis SPP penuh, atau potongan Rp 50.000 biaya lainnya' },
  { key: 'Potongan SPP (Rp)', label: 'Potongan SPP (Rp)', type: 'number', placeholder: 'Nominal potongan per bulan, mis. 100000. Isi nominal SPP penuh utk gratis total' },
  { key: 'Potongan Biaya Lain (Rp)', label: 'Potongan Biaya Lain (Rp)', type: 'number', placeholder: 'Nominal potongan, mis. 50000' },
];

export function emptyBeasiswaKategoriRow() {
  return { 'Nama Kategori': '', Keterangan: '', 'Potongan SPP (Rp)': '', 'Potongan Biaya Lain (Rp)': '' };
}

export function normalizeSheetBeasiswaKategori(row, idx) {
  return {
    id: 'BSK-' + (row['No'] ?? idx),
    no: row['No'],
    nama: String(row['Nama Kategori'] ?? '').trim(),
    keterangan: String(row['Keterangan'] ?? '').trim(),
    potonganSpp: Number(row['Potongan SPP (Rp)']) || 0,
    potonganBiayaLain: Number(row['Potongan Biaya Lain (Rp)']) || 0,
  };
}

export const BEASISWA_SISWA_HEADERS = ['No', 'NISN', 'Nama Siswa', 'Kategori Beasiswa', 'Tanggal Mulai', 'Keterangan'];

export function emptyBeasiswaSiswaRow() {
  return { NISN: '', 'Nama Siswa': '', 'Kategori Beasiswa': '', 'Tanggal Mulai': '', Keterangan: '' };
}

export function normalizeSheetBeasiswaSiswa(row, idx) {
  return {
    id: 'BSS-' + (row['No'] ?? idx),
    no: row['No'],
    nisn: String(row['NISN'] ?? '').trim(),
    namaSiswa: String(row['Nama Siswa'] ?? '').trim(),
    kategoriBeasiswa: String(row['Kategori Beasiswa'] ?? '').trim(),
    tanggalMulai: String(row['Tanggal Mulai'] ?? '').trim(),
    keterangan: String(row['Keterangan'] ?? '').trim(),
  };
}

// Cek apakah 1 siswa (by NISN) punya beasiswa yg AKTIF pada suatu titik waktu (cutoffMs) --
// dipakai BERSAMA oleh form Pembayaran, Kartu SPP, dan semua perhitungan piutang/status,
// supaya definisi "aktif" SELALU konsisten di semua tempat. "Aktif" berarti: siswa
// terdaftar di beasiswaSiswa DAN kategorinya masih ada DAN (Tanggal Mulai kosong ATAU
// Tanggal Mulai <= cutoffMs).
export function cekBeasiswaAktif(nisn, beasiswaSiswa, beasiswaKategori, cutoffMs) {
  const b = beasiswaSiswa.find(x => x.nisn === nisn);
  if (!b) return null;
  const kategori = beasiswaKategori.find(k => k.nama === b.kategoriBeasiswa);
  if (!kategori) return null;
  const mulai = b.tanggalMulai ? new Date(b.tanggalMulai) : null;
  if (mulai && !isNaN(mulai.getTime()) && cutoffMs < mulai.getTime()) return null;
  return kategori;
}

// Nominal SEHARUSNYA (efektif) utk 1 tagihan, MEMPERHITUNGKAN beasiswa yg SEKARANG aktif --
// dipakai utk kasus "SPP diterbitkan dulu, beasiswa dipasang belakangan": nominal yg
// TERSIMPAN di Sheet tetap harga penuh (tidak diubah), tapi utk tampilan/status/piutang,
// yg dipakai adalah nominal EFEKTIF ini (sudah dipotong kalau beasiswanya berlaku).
// refType: 'SPP' pakai potonganSpp, 'LAIN' pakai potonganBiayaLain.
// Nominal SPP FINAL saat sebuah tagihan bulan tertentu DITERBITKAN (bukan nominal
// tampilan/efektif spt nominalEfektifTagihan di atas -- ini dipakai SEBELUM baris
// tagihan itu ada, utk menentukan nominal yg akan DITULIS ke Sheet) -- dipakai
// BERSAMA oleh KEDUA jalur yg bisa menerbitkan tagihan SPP baru: Penerbitan SPP
// bulanan (PenerbitanSppTab) dan Bayar SPP Sekaligus (BayarSekaligusModal, saat harus
// menerbitkan dulu bulan yg blm py tagihan sebelum bisa dibayar) -- supaya potongan
// beasiswa yg tersimpan APA ADANYA di kolom Nominal selalu dihitung dgn cara yg
// SAMA PERSIS, di mana pun tagihan itu "lahir".
export function nominalSppSaatTerbit(nisn, nominalPenuh, tanggalAwalBulanTagihanMs, beasiswaSiswa, beasiswaKategori, parseTanggal) {
  const b = beasiswaSiswa.find(x => x.nisn === nisn);
  if (!b) return { nominal: nominalPenuh, potongan: null };
  const mulai = parseTanggal(b.tanggalMulai);
  if (mulai && tanggalAwalBulanTagihanMs < mulai.getTime()) return { nominal: nominalPenuh, potongan: null };
  const kategori = beasiswaKategori.find(k => k.nama === b.kategoriBeasiswa);
  if (!kategori || !kategori.potonganSpp) return { nominal: nominalPenuh, potongan: null };
  const nominal = Math.max(0, nominalPenuh - kategori.potonganSpp);
  return { nominal, potongan: kategori };
}

export function nominalEfektifTagihan(tagihan, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayar = 0) {
  // PENTING: beasiswa berlaku MAJU saja -- kalau tagihan ini SUDAH PERNAH dibayar
  // (sebagian ATAU lunas) SEBELUM beasiswanya dipasang, jangan disunat jadi nol.
  // Uang yg sudah benar-benar masuk kas tidak boleh "menghilang" gara-gara beasiswa
  // dipasang belakangan -- diskon cuma utk sisa yg BELUM dibayar sama sekali.
  if (terbayar > 0) return { nominalEfektif: tagihan.nominal, potongan: null };
  // Cegah POTONGAN GANDA: kalau tagihan ini SUDAH didiskon saat diterbitkan (beasiswa
  // sudah ada duluan sebelum tagihan dibuat -- keterangannya sudah tercatat di Sheet
  // saat itu), nominal yg TERSIMPAN sudah nominal FINAL. Jangan dipotong LAGI di sini,
  // atau siswa itu kena potongan dua kali (sekali saat terbit, sekali lagi saat tampil).
  if (tagihan.keterangan && tagihan.keterangan.includes('Potongan Beasiswa')) {
    return { nominalEfektif: tagihan.nominal, potongan: null };
  }
  const kategori = cekBeasiswaAktif(tagihan.nisn, beasiswaSiswa, beasiswaKategori, cutoffMs);
  if (!kategori) return { nominalEfektif: tagihan.nominal, potongan: null };
  // Potongan sekarang nilai Rupiah LANGSUNG (bukan persentase) -- dikurangkan apa
  // adanya dari nominal, tidak boleh sampai minus (di-clamp ke 0 kalau potongannya
  // lebih besar dari tagihannya sendiri).
  const nominalPotongan = tagihan.refType === 'SPP' ? kategori.potonganSpp : kategori.potonganBiayaLain;
  if (!nominalPotongan) return { nominalEfektif: tagihan.nominal, potongan: null };
  const nominalEfektif = Math.max(0, tagihan.nominal - nominalPotongan);
  if (nominalEfektif >= tagihan.nominal) return { nominalEfektif: tagihan.nominal, potongan: null };
  return { nominalEfektif, potongan: { kategori, nominalPotongan: tagihan.nominal - nominalEfektif } };
}
