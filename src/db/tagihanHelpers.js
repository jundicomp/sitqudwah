// Dipakai GenericStoredTable di PenerbitanLainTab.jsx utk menampilkan & mengedit
// tagihan INDIVIDUAL yang sudah terbit per siswa (beda dgn TARIF_HEADERS yg cuma
// mengatur templatenya) -- lihat sheet 'Tagihan Lain' di Code-Keuangan.gs.
export const TAGIHAN_LAIN_HEADERS = ['No', 'NISN', 'Nama Siswa', 'Tahun Ajaran', 'Nama', 'Wajib', 'Nominal', 'Jatuh Tempo', 'Keterangan', 'Cicilan', 'Nominal Tetap'];

// Field yg BOLEH diedit -- SENGAJA tidak termasuk NISN/Nama Siswa/Tahun Ajaran/Nama
// (identitas siswa & jenis biaya yg ditagih). Kolom yg tidak disebut di sini tetap
// aman krn GenericEditModal.doUpdate() selalu menggabung dgn `row` asli dulu.
export const TAGIHAN_LAIN_EDIT_FIELDS = [
  { key: 'Nominal', label: 'Nominal (Rp)', type: 'number', required: true },
  { key: 'Wajib', label: 'Wajib?', type: 'select', options: ['Ya', 'Tidak'], required: true },
  { key: 'Jatuh Tempo', label: 'Jatuh Tempo', type: 'date' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
  // Kosongkan kalau tagihan ini dibayar sekaligus (bukan dicicil) -- lihat catatan
  // yg sama di tarifFields.js (Nilai Cicilan). Mengubahnya di sini HANYA berlaku
  // utk tagihan yg SUDAH terbit ini -- tidak mengubah Tarif templatenya.
  { key: 'Cicilan', label: 'Nilai Cicilan (Rp)', type: 'number', placeholder: 'Kosongkan jika dibayar sekaligus' },
  // Sejak v1.31.24 -- lihat catatan lengkap di tarifFields.js (field yg sama di Tarif).
  // Di sini HANYA berlaku utk tagihan yg SUDAH terbit ini, tidak mengubah templatenya.
  { key: 'Nominal Tetap', label: 'Nominal Tetap Saat Bayar?', type: 'select', options: ['Ya', 'Tidak'] },
];

export function normalizeSheetTagihanSpp(row, idx) {
  return {
    id: 'TSPP-' + (row['No'] ?? idx),
    no: row['No'],
    refType: 'SPP',
    nisn: String(row['NISN'] ?? '').trim(),
    namaSiswa: String(row['Nama Siswa'] ?? '').trim(),
    tahunAjaran: String(row['Tahun Ajaran'] ?? '').trim(),
    label: `SPP ${row['Bulan']} ${row['Tahun Kalender']}`,
    bulan: row['Bulan'],
    tahunKalender: row['Tahun Kalender'],
    nominal: Number(row['Nominal']) || 0,
    jatuhTempo: row['Jatuh Tempo'],
    keterangan: String(row['Keterangan'] ?? '').trim(),
    // Disalin dari Tarif SPP sekali saat tagihan ini diterbitkan (lihat PenerbitanSppTab.jsx).
    // Kosong (tagihan lama sblm kolom ini ada, sblm v1.31.24) DIANGGAP 'Ya' (terkunci) --
    // match perilaku SPP yg SUDAH terlanjur jalan sejak v1.31.23 (SPP SELALU dikunci
    // sblm field checkbox ini ada), supaya tagihan lama tidak tiba2 jadi bisa diedit.
    nominalTetap: String(row['Nominal Tetap'] ?? '').trim() !== 'Tidak',
  };
}

export function normalizeSheetTagihanLain(row, idx) {
  return {
    id: 'TLAIN-' + (row['No'] ?? idx),
    no: row['No'],
    refType: 'LAIN',
    nisn: String(row['NISN'] ?? '').trim(),
    namaSiswa: String(row['Nama Siswa'] ?? '').trim(),
    tahunAjaran: String(row['Tahun Ajaran'] ?? '').trim(),
    label: String(row['Nama'] ?? '').trim(),
    wajib: String(row['Wajib'] ?? '').trim(),
    nominal: Number(row['Nominal']) || 0,
    jatuhTempo: row['Jatuh Tempo'],
    keterangan: String(row['Keterangan'] ?? '').trim(),
    // Disalin dari Tarif sekali saat tagihan ini diterbitkan (lihat PenerbitanLainTab.jsx)
    // -- 0 = tidak ada nilai cicilan standar, form Catat Pembayaran default ke sisa penuh.
    cicilan: Number(row['Cicilan']) || 0,
    // Disalin dari Tarif sekali saat tagihan ini diterbitkan, spt Cicilan di atas.
    // Kosong (tagihan lama sblm kolom ini ada, sblm v1.31.24) -- INFER dari Cicilan,
    // supaya PERSIS sama dgn perilaku v1.31.22 (dikunci CUMA kalau py Nilai Cicilan).
    // Kalau sudah eksplisit 'Ya'/'Tidak' (tagihan baru, atau tagihan lama yg sudah
    // dibetulkan lewat tabel Daftar Tagihan Lain) -- pakai itu apa adanya, TIDAK
    // peduli lagi nilai Cicilan-nya (mis. bisa jadi 'Tidak' walau py Cicilan, kalau
    // Admin sengaja mau tetap bisa bayar sebagian).
    nominalTetap: (() => {
      const raw = String(row['Nominal Tetap'] ?? '').trim();
      if (raw === 'Ya') return true;
      if (raw === 'Tidak') return false;
      return (Number(row['Cicilan']) || 0) > 0;
    })(),
  };
}

// PENJAGA TAMBAHAN (nisn opsional): pencocokan pembayaran ke tagihan SEHARUSNYA
// cukup lewat RefType+RefNo (nomor baris tagihan) -- TAPI kalau nomor "No" di sheet
// Tagihan pernah dobel (mis. dari race-condition penerbitan sebelum LockService
// dipasang), pembayaran milik siswa LAIN yg RefNo-nya kebetulan sama bisa ketiban
// salah ke tagihan siswa ini, bikin kartunya kelihatan "Lunas" padahal tidak pernah
// dibayar. Kalau nisn diisi si pemanggil, baris pembayaran yg NISN-nya KETAHUAN beda
// (bukan kosong -- data lama sebagian belum punya NISN) TIDAK dihitung. Baris dgn
// NISN kosong tetap dihitung spt biasa supaya data lama tidak tiba2 balik jadi
// "Belum Lunas".
export function hitungTerbayar(pembayaran, refType, refNo, nisn) {
  return pembayaran
    .filter(p => p.refType === refType && String(p.refNo) === String(refNo))
    .filter(p => !nisn || !p.nisn || p.nisn === nisn)
    .reduce((s, p) => s + p.nominal, 0);
}

export function statusTagihan(nominal, terbayar) {
  // Tagihan Rp 0 (mis. dari potongan beasiswa 100%) SECARA LOGIS sudah "Lunas" --
  // tidak ada yang perlu dibayar sama sekali. Sebelumnya ini nyangkut selamanya di
  // "Belum Lunas" krn form Pembayaran menolak nominal Rp 0 (bug nyata yg ditemukan).
  if (nominal <= 0) return 'Lunas';
  if (terbayar <= 0) return 'Belum Lunas';
  if (terbayar >= nominal) return 'Lunas';
  return 'Sebagian';
}
