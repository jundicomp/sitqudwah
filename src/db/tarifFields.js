// "Kelas/Tingkat", "Cicilan" & "Nominal Tetap" SENGAJA ditaruh di AKHIR (bukan disisip
// di tengah) supaya kalau Anda sudah punya data Tarif lama di Sheets, cukup tambah
// kolom baru di paling kanan -- tidak perlu menggeser kolom yang sudah ada.
export const TARIF_HEADERS = ['No', 'Tahun Ajaran', 'Jenis', 'Tipe', 'Nominal', 'Wajib', 'Kelas/Tingkat', 'Cicilan', 'Nominal Tetap'];

export const TIPE_TARIF_OPTIONS = ['Bulanan (SPP)', 'Sekali Masuk', 'Per Tahun', 'Opsional'];

// 'Semua Kelas' = berlaku sama utk semua tingkat (perilaku lama/default).
// Pilih tingkat spesifik (1-6) kalau nominalnya beda per angkatan/kelas.
export const KELAS_TINGKAT_TARIF_OPTIONS = ['Semua Kelas', '1', '2', '3', '4', '5', '6'];

export function buildTarifFields(tahunAjaranOptions) {
  return [
    { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'select', options: tahunAjaranOptions, required: true },
    { key: 'Jenis', label: 'Jenis Biaya', type: 'text', required: true, placeholder: 'mis. SPP Bulanan, Uang Pangkal, Seragam' },
    { key: 'Tipe', label: 'Tipe', type: 'select', options: TIPE_TARIF_OPTIONS, required: true },
    { key: 'Kelas/Tingkat', label: 'Berlaku untuk Kelas/Tingkat', type: 'select', options: KELAS_TINGKAT_TARIF_OPTIONS, required: true },
    { key: 'Nominal', label: 'Nominal (Rp)', type: 'number', required: true },
    { key: 'Wajib', label: 'Wajib?', type: 'select', options: ['Ya', 'Tidak'], required: true },
    // Opsional -- kosongkan kalau biaya ini memang dibayar sekaligus (bukan dicicil).
    // Kalau diisi, form Catat Pembayaran akan otomatis mengisi nominal bayar sebesar
    // nilai ini (bukan langsung sisa tagihan penuh) saat tagihan dari tarif ini dipilih.
    { key: 'Cicilan', label: 'Nilai Cicilan (Rp)', type: 'number', placeholder: 'Kosongkan jika dibayar sekaligus' },
    // Sejak v1.31.24 -- dulu SPP dikunci PERMANEN (v1.31.23) & Tagihan Lain dikunci
    // OTOMATIS kalau py Nilai Cicilan (v1.31.22), TANPA cara mengatur sendiri. Field
    // ini kasih kontrol eksplisit ke Admin: "Ya" = nominal saat Catat Pembayaran
    // dikunci (tidak bisa diedit manual, tidak bisa dibayar sebagian lewat sana) --
    // dipakai utk biaya yg HARUS dibayar utuh sesuai tarif (mis. kebijakan sekolah:
    // SPP wajib utuh). "Tidak" = nominal tetap bisa diketik manual saat pembayaran
    // (perilaku lama sblm fitur kunci ada). Nilainya disalin ke tiap tagihan SAAT
    // diterbitkan (spt Cicilan) -- ubah di sini HANYA berlaku utk tagihan BARU yg
    // diterbitkan setelahnya, tagihan yg sudah terlanjur terbit tidak ikut berubah.
    { key: 'Nominal Tetap', label: 'Nominal Tetap Saat Bayar?', type: 'select', options: ['Ya', 'Tidak'], required: true },
  ];
}

export function emptyTarifRow() {
  // Default 'Ya' (terkunci) -- lebih aman sbg default drpd 'Tidak', supaya tidak ada
  // tagihan baru yg diam2 jadi bisa dibayar sebagian tanpa Admin sadar. Admin tinggal
  // ganti ke 'Tidak' per Tarif kalau memang mau biaya itu bisa dibayar sebagian.
  return { 'Tahun Ajaran': '', 'Jenis': '', 'Tipe': '', 'Kelas/Tingkat': 'Semua Kelas', 'Nominal': '', 'Wajib': 'Ya', 'Cicilan': '', 'Nominal Tetap': 'Ya' };
}

export function normalizeSheetTarif(row, idx) {
  return {
    id: 'TRF-' + (row['No'] ?? idx),
    no: row['No'],
    tahunAjaran: String(row['Tahun Ajaran'] ?? '').trim(),
    jenis: String(row['Jenis'] ?? '').trim(),
    tipe: String(row['Tipe'] ?? '').trim(),
    nominal: Number(row['Nominal']) || 0,
    wajib: String(row['Wajib'] ?? '').trim(),
    // Baris lama (sebelum kolom ini ada) otomatis dianggap 'Semua Kelas' -- perilaku lama tetap jalan persis sama.
    kelasTingkat: String(row['Kelas/Tingkat'] ?? '').trim() || 'Semua Kelas',
    // 0 = tidak ada nilai cicilan standar (dibayar sekaligus) -- perilaku lama tetap sama.
    cicilan: Number(row['Cicilan']) || 0,
    // Kosong (Tarif lama sblm kolom ini ada, sblm v1.31.24) DIANGGAP 'Ya' (terkunci) --
    // default paling aman, konsisten dgn emptyTarifRow() utk Tarif baru.
    nominalTetap: String(row['Nominal Tetap'] ?? '').trim() !== 'Tidak',
  };
}

// Cari tarif SPP yang berlaku utk siswa kelas tertentu -- prioritas tarif SPESIFIK
// kelas itu, baru fallback ke tarif 'Semua Kelas' kalau tidak ada yg spesifik.
export function cariTarifSppUntukKelas(tarifList, tahunAjaran, kelasTingkat) {
  return cariTarifUntukKelas(tarifList, tahunAjaran, 'Bulanan (SPP)', kelasTingkat);
}

// Versi generik -- dipakai jg utk Tagihan Lain (Uang Pangkal, Seragam, dst),
// bukan cuma SPP. Prioritas: tarif spesifik kelas > tarif 'Semua Kelas'.
export function cariTarifUntukKelas(tarifList, tahunAjaran, tipe, kelasTingkat) {
  const spesifik = tarifList.find(t =>
    t.tahunAjaran === tahunAjaran && t.tipe === tipe && t.kelasTingkat === String(kelasTingkat)
  );
  if (spesifik) return spesifik;
  return tarifList.find(t =>
    t.tahunAjaran === tahunAjaran && t.tipe === tipe && t.kelasTingkat === 'Semua Kelas'
  ) || null;
}
