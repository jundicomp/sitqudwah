/**
 * ===================================================================
 * KODE INI DITEMPEL DI GOOGLE APPS SCRIPT PADA SPREADSHEET KEUANGAN
 * (FILE SHEETS TERPISAH dari Data Induk/Data Siswa) — BUKAN di project React.
 * ===================================================================
 * Kenapa dipisah dari file Data Induk?
 * Data keuangan (tagihan, pembayaran) terus bertambah tiap bulan -- beda
 * karakter dari data induk (siswa/kelas/guru) yang relatif tetap jumlahnya.
 * Memisah file supaya file Data Induk tetap ringan & cepat dalam jangka
 * panjang.
 *
 * Cara pasang:
 * 1. Buat Google Sheet BARU (terpisah dari Sheet Data Induk Anda).
 * 2. Menu Extensions -> Apps Script.
 * 3. Hapus isi default Code.gs, tempel SELURUH isi file ini.
 * 4. Ganti nilai SECRET di bawah dengan kata sandi rahasia (BOLEH beda dari
 *    SECRET file Data Induk -- lebih aman kalau beda).
 * 5. Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone).
 * 6. Salin URL -> tempel di aplikasi React, Pengaturan Koneksi (khusus Admin),
 *    bagian "Koneksi Data Keuangan" (BUKAN bagian "Koneksi Data Induk").
 *
 * Script ini melayani:
 *   - sheet=tarif       -> tab "Tarif"        (SPP bulanan & biaya lain per tahun ajaran)
 *   - sheet=tagihanSpp  -> tab "Tagihan SPP"   (tagihan SPP bulanan per siswa)
 *   - sheet=tagihanLain -> tab "Tagihan Lain"  (uang pangkal, seragam, dst)
 *   - sheet=pembayaran  -> tab "Pembayaran"    (riwayat pembayaran, 1 baris = 1 kwitansi)
 * ===================================================================
 */

// GANTI dengan kata sandi rahasia Anda sendiri.
const SECRET = 'GANTI_DENGAN_KATA_SANDI_RAHASIA_KEUANGAN';

const SHEETS = {
  tarif: {
    name: 'Tarif',
    // "Kelas/Tingkat", "Cicilan" & "Nominal Tetap" ditaruh di AKHIR supaya kompatibel
    // mundur dgn sheet lama -- baris lama tanpa nilai di kolom2 ini otomatis dianggap
    // "Semua Kelas", cicilan kosong (React menganggapnya "dibayar sekaligus, tanpa
    // nilai cicilan standar"), & Nominal Tetap kosong (React infer dari Cicilan/refType
    // -- lihat normalizeSheetTarif/TagihanSpp/TagihanLain di tagihanHelpers.js &
    // tarifFields.js), perilaku lama tetap jalan sama persis.
    headers: ['No', 'Tahun Ajaran', 'Jenis', 'Tipe', 'Nominal', 'Wajib', 'Kelas/Tingkat', 'Cicilan', 'Nominal Tetap'],
  },
  tagihanSpp: {
    name: 'Tagihan SPP',
    // "Keterangan" ditaruh di AKHIR (kompatibel mundur) -- diisi otomatis SEKALI saat
    // penerbitan kalau ada potongan beasiswa yg berlaku (mis. "Potongan Beasiswa: Anak
    // Yatim (100%)"), supaya tercatat permanen -- tidak berubah lagi walau beasiswanya
    // belakangan dicabut (konsisten dgn prinsip "fakta historis pada momen transaksi").
    // "Nominal Tetap" ditaruh PALING AKHIR (v1.31.24) -- disalin dari Tarif SPP saat
    // penerbitan, dipakai Catat Pembayaran utk kunci/buka field Nominal Dibayar.
    headers: ['No', 'NISN', 'Nama Siswa', 'Tahun Ajaran', 'Bulan', 'Tahun Kalender', 'Nominal', 'Jatuh Tempo', 'Keterangan', 'Nominal Tetap'],
  },
  tagihanLain: {
    name: 'Tagihan Lain',
    // "Cicilan" ditaruh di AKHIR (kompatibel mundur) -- diisi otomatis SEKALI saat
    // penerbitan dari nilai Cicilan di Tarif-nya (kalau ada), dipakai form Catat
    // Pembayaran sbg nilai nominal DEFAULT (bukan langsung sisa tagihan penuh).
    // "Nominal Tetap" ditaruh PALING AKHIR (v1.31.24) -- disalin dari Tarif-nya saat
    // penerbitan, dipakai Catat Pembayaran utk kunci/buka field Nominal Dibayar.
    headers: ['No', 'NISN', 'Nama Siswa', 'Tahun Ajaran', 'Nama', 'Wajib', 'Nominal', 'Jatuh Tempo', 'Keterangan', 'Cicilan', 'Nominal Tetap'],
  },
  pembayaran: {
    name: 'Pembayaran',
    // "Keterangan" ditaruh di AKHIR (kompatibel mundur) -- dipakai khusus utk alasan Pemutihan Piutang.
    // "Akun" ditaruh di AKHIR juga (kompatibel mundur) -- akun kas/bank penerima uang, dipakai Buku Besar
    // supaya tidak asal asumsi semua pembayaran masuk ke "Kas" fisik.
    headers: ['No', 'RefType', 'RefNo', 'NISN', 'Nama Siswa', 'Jenis', 'Nominal', 'Tanggal Bayar', 'Metode', 'Keterangan', 'Akun'],
  },
  pengeluaran: {
    name: 'Pengeluaran',
    headers: ['No', 'Tanggal', 'Kategori', 'Keterangan', 'Nominal', 'Akun'],
  },
  pemasukanLain: {
    name: 'Pemasukan Lain',
    headers: ['No', 'Tanggal', 'Kategori', 'Keterangan', 'Nominal', 'Akun'],
  },
  akunBukuBesar: {
    name: 'Akun Buku Besar',
    headers: ['No', 'Kode Akun', 'Nama Akun', 'Jenis', 'Saldo Normal'],
    // "Kode Akun" WAJIB dipaksa format teks -- Google Sheets otomatis menafsirkan pola
    // berhubung tanda hubung (mis. "5-1010") sbg TANGGAL, bikin kode akun berubah jadi
    // datetime aneh (ditemukan lewat laporan bug nyata). Kolom di list ini akan di-set
    // number format "@" (plain text) SEBELUM nilai ditulis, supaya Sheets tidak
    // menafsirkan ulang isinya sama sekali.
    textColumns: ['Kode Akun'],
  },
  beasiswaKategori: {
    name: 'Beasiswa Kategori',
    headers: ['No', 'Nama Kategori', 'Keterangan', 'Potongan SPP (Rp)', 'Potongan Biaya Lain (Rp)'],
  },
  beasiswaSiswa: {
    name: 'Beasiswa Siswa',
    headers: ['No', 'NISN', 'Nama Siswa', 'Kategori Beasiswa', 'Tanggal Mulai', 'Keterangan'],
  },
};

function doGet(e) {
  // Perbaikan keamanan: doGet sekarang wajib cek SECRET juga (sebelumnya cuma doPost).
  if (!e.parameter || e.parameter.secret !== SECRET) {
    return jsonResponse_({ ok: false, error: 'Akses ditolak: kata sandi tidak cocok atau tidak disertakan.' });
  }
  // Mode BATCH: sheet=ALL mengembalikan SEMUA sheet sekaligus dalam 1 respons --
  // dipakai saat load pertama kali (login/buka app), supaya browser TIDAK perlu
  // menembak banyak request terpisah (masing2 request ke Apps Script punya overhead
  // sendiri & kena kuota bersama -- gabung jadi 1 mengurangi beban & kegagalan
  // "tidak terhubung" akibat kuota kepenuhan). Request tunggal (utk refresh setelah
  // tambah/edit/hapus) TETAP jalan spt biasa lewat sheet=<nama>, TIDAK berubah.
  if (e.parameter.sheet === 'ALL') {
    const semua = {};
    Object.keys(SHEETS).forEach(key => { semua[key] = readSheetData_(SHEETS[key]); });
    return jsonResponse_({ ok: true, data: semua });
  }
  const which = SHEETS[e.parameter.sheet] ? e.parameter.sheet : 'tarif';
  const cfg = SHEETS[which];
  return jsonResponse_({ ok: true, data: readSheetData_(cfg) });
}

function readSheetData_(cfg) {
  const sheet = getSheet_(cfg);
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r.some(cell => cell !== '')).map(row => {
    const obj = {};
    cfg.headers.forEach((h, i) => { obj[h] = formatCellValue_(row[i]); });
    return obj;
  });
}

// Kalau sel diketik manual di Sheets dgn format yg dikenali sbg tanggal, Google Sheets
// otomatis menyimpannya sbg tipe TANGGAL ASLI. Saat dibaca lewat Apps Script jadi objek
// Date -- begitu di-JSON-kan, otomatis dikonversi ke UTC, BISA BERGESER 1 HARI dibanding
// aslinya (krn WIB = UTC+7). Fungsi ini memformat tanggal manual sbg teks "yyyy-MM-dd"
// sesuai zona waktu WIB SEBELUM dikirim, supaya selalu benar & konsisten.
function formatCellValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  return value;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return jsonResponse_({ ok: false, error: 'Kata sandi tidak cocok. Cek pengaturan koneksi.' });
    }
    const which = SHEETS[body.sheet] ? body.sheet : 'tarif';
    const cfg = SHEETS[which];
    const sheet = getSheet_(cfg);

    if (body.action === 'add') {
      appendRow_(sheet, cfg.headers, body.row, cfg.textColumns);
      return jsonResponse_({ ok: true });
    }
    if (body.action === 'bulkAdd') {
      body.rows.forEach(row => appendRow_(sheet, cfg.headers, row, cfg.textColumns));
      return jsonResponse_({ ok: true, count: body.rows.length });
    }
    if (body.action === 'update') {
      const found = updateRow_(sheet, cfg.headers, body.row, cfg.textColumns);
      if (!found) return jsonResponse_({ ok: false, error: 'Baris dengan No=' + body.row['No'] + ' tidak ditemukan.' });
      return jsonResponse_({ ok: true });
    }
    if (body.action === 'delete') {
      const found = deleteRow_(sheet, cfg.headers, body.no);
      if (!found) return jsonResponse_({ ok: false, error: 'Baris dengan No=' + body.no + ' tidak ditemukan.' });
      return jsonResponse_({ ok: true });
    }
    if (body.action === 'bulkDelete') {
      // Hapus BANYAK baris (by "No") dalam SATU eksekusi -- dipakai "Bersihkan Duplikat"
      // yg sebelumnya mengirim SATU request terpisah PER baris (bisa 100+ request
      // berurutan utk 1x bersihkan), dan tiap request lama itu men-scan ulang SELURUH
      // kolom "No" SEL PER SEL (deleteRow_ lama) -- utk sheet yg sudah ribuan baris,
      // kombinasi keduanya bikin proses total bisa makan waktu SANGAT lama / gagal
      // kena timeout Apps Script di tengah jalan, PADAHAL user cuma lihat "berhasil
      // X dari Y" yg salah/kekecilan tanpa pesan error yg jelas (baris lain diam2 gagal,
      // ketangkep try/catch per-baris di React lalu dilewati). Fungsi ini membaca kolom
      // "No" SEKALI SAJA (bulk getValues), cari SEMUA baris yg cocok, baru hapus semua
      // sekaligus dari BAWAH ke ATAS (index besar dulu) supaya hapus baris atas tidak
      // menggeser index baris bawah yg belum sempat dihapus.
      const hasil = bulkDeleteRows_(sheet, cfg.headers, body.nos || []);
      return jsonResponse_({ ok: true, jumlahDihapus: hasil.jumlahDihapus, noTidakDitemukan: hasil.noTidakDitemukan });
    }
    if (body.action === 'bulkUpdate') {
      // Update BANYAK baris sekaligus (by "No"), tiap baris cuma field yg disebut di
      // "patch" yg diubah -- field lain di baris itu TIDAK disentuh/ditimpa. Dipakai
      // fitur "Perbaiki Otomatis NISN" di Cek Data dan Sistem > Cek Data NISN, utk
      // mengisi NISN yg kosong di Tagihan SPP/Tagihan Lain/Pembayaran berdasarkan
      // kecocokan nama dgn Data Siswa. Sama persis polanya dgn bulkUpdateRows_ di
      // Code.gs (baca kolom "No" 1x, bukan scan sel-per-sel per baris).
      const hasil = bulkUpdateRows_(sheet, cfg.headers, body.updates || []);
      return jsonResponse_({ ok: true, jumlahDiupdate: hasil.jumlahDiupdate, noTidakDitemukan: hasil.noTidakDitemukan });
    }
    if (body.action === 'perbaikiNomorGanda') {
      // Baris FISIK PALING ATAS yg pegang suatu "No" dibiarkan (menjaga link pembayaran
      // yg mungkin sudah menunjuk ke situ), baris FISIK BERIKUTNYA yg kebetulan pegang
      // "No" yg SAMA (akibat bug race condition lama, sekarang sudah diperbaiki dgn
      // LockService) diberi nomor BARU yg belum terpakai. Lihat catatan lengkap di
      // appendRow_ soal akar masalahnya.
      const jumlahDiperbaiki = perbaikiNomorGanda_(sheet, cfg.headers);
      return jsonResponse_({ ok: true, jumlahDiperbaiki });
    }
    if (body.action === 'replaceAll') {
      const jumlah = replaceAll_(sheet, body.rows || []);
      return jsonResponse_({ ok: true, jumlah });
    }
    return jsonResponse_({ ok: false, error: 'Aksi "' + body.action + '" tidak dikenal.' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function getSheet_(cfg) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(cfg.name);
  if (!sheet) sheet = ss.insertSheet(cfg.name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cfg.headers);
  } else {
    // Sinkronkan header row -- tambahkan kolom baru yg didefinisikan di kode tapi
    // belum ada di Sheet (mis. setelah update fitur), di ujung kanan baris 1.
    const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    const missing = cfg.headers.filter(h => existingHeaders.indexOf(h) === -1);
    if (missing.length > 0) {
      sheet.getRange(1, existingHeaders.length + 1, 1, missing.length).setValues([missing]);
    }
  }
  return sheet;
}

function appendRow_(sheet, headers, rowObj, textColumns) {
  // PENTING -- LockService WAJIB di sini: sebelumnya "nextNo = sheet.getLastRow()"
  // dibaca TANPA kunci, jadi kalau 2 permintaan (mis. dari klik ganda/rapid-click)
  // berjalan BERSAMAAN, keduanya bisa membaca getLastRow() yg SAMA SEBELUM salah satu
  // sempat menulis barisnya -- hasilnya 2 baris BERBEDA dgn "No" yg SAMA (baris dobel
  // dgn ID kembar). Ini AKAR MASALAH ditemukan sambil investigasi laporan user: alat
  // "Bersihkan Duplikat" salah kira banyak baris "sudah dibayar" krn No-nya kembar,
  // padahal cuma 1 pembayaran asli yg kebetulan cocok ke SEMUA baris berNo sama itu.
  // getScriptLock() memaksa proses LAIN nunggu gantian -- baca+tulis jadi ATOMIK.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const nextNo = sheet.getLastRow();
    const row = headers.map(h => (h === 'No' ? nextNo : (rowObj[h] !== undefined ? rowObj[h] : '')));
    forceTextColumns_(sheet, headers, sheet.getLastRow() + 1, textColumns);
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

function bulkUpdateRows_(sheet, headers, updates) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const noCol = headers.indexOf('No') + 1;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2 || !updates || updates.length === 0) {
      return { jumlahDiupdate: 0, noTidakDitemukan: (updates || []).map(u => String(u.no)) };
    }
    const nilaiNo = sheet.getRange(2, noCol, lastRow - 1, 1).getValues();
    const barisByNo = {};
    for (let i = 0; i < nilaiNo.length; i++) barisByNo[String(nilaiNo[i][0])] = i + 2; // +2: index 0 = baris sheet ke-2
    let jumlahDiupdate = 0;
    const noTidakDitemukan = [];
    updates.forEach(u => {
      const r = barisByNo[String(u.no)];
      if (r === undefined) { noTidakDitemukan.push(String(u.no)); return; }
      Object.keys(u.patch || {}).forEach(field => {
        const col = headers.indexOf(field) + 1;
        if (col > 0) sheet.getRange(r, col).setValue(u.patch[field]);
      });
      jumlahDiupdate++;
    });
    return { jumlahDiupdate, noTidakDitemukan };
  } finally {
    lock.releaseLock();
  }
}

function perbaikiNomorGanda_(sheet, headers) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const noCol = headers.indexOf('No') + 1;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    const nilaiNo = sheet.getRange(2, noCol, lastRow - 1, 1).getValues().map(r => Number(r[0]));
    const sudahTerlihat = new Set();
    let noTertinggi = Math.max(0, ...nilaiNo);
    let nomorBaruBerikutnya = noTertinggi + 1;
    let jumlahDiperbaiki = 0;
    for (let i = 0; i < nilaiNo.length; i++) {
      const n = nilaiNo[i];
      if (sudahTerlihat.has(n)) {
        const baris = i + 2; // +2: index 0 = baris sheet ke-2 (baris 1 = header)
        sheet.getRange(baris, noCol).setValue(nomorBaruBerikutnya);
        nomorBaruBerikutnya++;
        jumlahDiperbaiki++;
      } else {
        sudahTerlihat.add(n);
      }
    }
    return jumlahDiperbaiki;
  } finally {
    lock.releaseLock();
  }
}

// Cari nomor baris FISIK (index sheet, 1-based) yg kolom "No"-nya cocok dgn targetNo --
// baca kolom "No" SEKALI (1 panggilan getValues), bukan sel-per-sel dlm loop (SANGAT
// lambat utk sheet berbaris banyak -- tiap getRange().getValue() adalah 1 panggilan API
// tersendiri; makin banyak baris di atas, makin lama utk sampai ke baris yg dicari).
function cariBarisByNo_(sheet, headers, targetNoRaw) {
  const noCol = headers.indexOf('No') + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const targetNo = String(targetNoRaw);
  const nilaiNo = sheet.getRange(2, noCol, lastRow - 1, 1).getValues();
  for (let i = 0; i < nilaiNo.length; i++) {
    if (String(nilaiNo[i][0]) === targetNo) return i + 2; // +2: index 0 = baris sheet ke-2
  }
  return -1;
}

function updateRow_(sheet, headers, rowObj, textColumns) {
  const r = cariBarisByNo_(sheet, headers, rowObj['No']);
  if (r === -1) return false;
  forceTextColumns_(sheet, headers, r, textColumns);
  const newRow = headers.map(h => (h === 'No' ? rowObj['No'] : (rowObj[h] !== undefined ? rowObj[h] : '')));
  sheet.getRange(r, 1, 1, headers.length).setValues([newRow]);
  return true;
}

function forceTextColumns_(sheet, headers, rowIndex, textColumns) {
  if (!textColumns || textColumns.length === 0) return;
  textColumns.forEach(colName => {
    const colIdx = headers.indexOf(colName) + 1;
    if (colIdx > 0) sheet.getRange(rowIndex, colIdx).setNumberFormat('@');
  });
}

function deleteRow_(sheet, headers, targetNoRaw) {
  const r = cariBarisByNo_(sheet, headers, targetNoRaw);
  if (r === -1) return false;
  sheet.deleteRow(r);
  return true;
}

// Hapus BANYAK baris (by "No") sekaligus dlm 1 eksekusi -- lihat catatan panjang di
// pemanggilnya (doPost, action 'bulkDelete') soal kenapa ini dibuat. LockService WAJIB
// (spt appendRow_) krn ini menghapus banyak baris scr fisik -- kalau proses PENERBITAN
// tagihan baru (appendRow_) kebetulan jalan BERSAMAAN, "No" baris baru itu dihitung dari
// getLastRow() -- kalau baris di TENGAH terhapus SAAT itu juga tanpa lock, race condition
// serupa bisa muncul lagi. Mengunci keduanya (append & bulk delete) di lock yg SAMA
// (getScriptLock scoped per-script) memastikan tidak tumpang tindih.
function bulkDeleteRows_(sheet, headers, nosRaw) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const noCol = headers.indexOf('No') + 1;
    const lastRow = sheet.getLastRow();
    const jumlahDihapus = { n: 0 };
    if (lastRow < 2 || !nosRaw || nosRaw.length === 0) {
      return { jumlahDihapus: 0, noTidakDitemukan: (nosRaw || []).map(String) };
    }
    const targetSet = new Set(nosRaw.map(String));
    const nilaiNo = sheet.getRange(2, noCol, lastRow - 1, 1).getValues();
    const ditemukanSet = new Set();
    const barisUntukDihapus = []; // index sheet fisik, ASCENDING dulu
    for (let i = 0; i < nilaiNo.length; i++) {
      const key = String(nilaiNo[i][0]);
      if (targetSet.has(key)) {
        barisUntukDihapus.push(i + 2); // +2: index 0 = baris sheet ke-2
        ditemukanSet.add(key);
      }
    }
    // Hapus dari BAWAH ke ATAS (index besar dulu) -- kalau dihapus dari ATAS ke BAWAH,
    // tiap penghapusan menggeser SEMUA baris di bawahnya naik 1, bikin index yg sudah
    // dikumpulkan di atas jadi salah sasaran (bug klasik "menghapus sambil mengiterasi").
    barisUntukDihapus.sort((a, b) => b - a);
    barisUntukDihapus.forEach(r => { sheet.deleteRow(r); jumlahDihapus.n++; });
    const noTidakDitemukan = [];
    targetSet.forEach(no => { if (!ditemukanSet.has(no)) noTidakDitemukan.push(no); });
    return { jumlahDihapus: jumlahDihapus.n, noTidakDitemukan };
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


// ---------------------------------------------------------------------------
// RESTORE (v1.38.0): ganti SELURUH baris data satu tab dgn isi backup.
// Header baris 1 dipertahankan (kolom yg tidak ada di backup dibiarkan kosong).
// Kolom berisi kode berawalan 0 (NISN, NIP, dll) atau angka panjang dipaksa TEKS
// supaya nol di depan tidak hilang.
function replaceAll_(sheet, rows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    if (!rows.length) return 0;
    const values = rows.map(r => header.map(h => (r[h] === undefined || r[h] === null ? '' : r[h])));
    header.forEach((h, c) => {
      const perluTeks = rows.some(r => typeof r[h] === 'string' && (/^0\d+$/.test(r[h]) || /^\d{12,}$/.test(r[h])));
      if (perluTeks) sheet.getRange(2, c + 1, values.length, 1).setNumberFormat('@');
    });
    sheet.getRange(2, 1, values.length, header.length).setValues(values);
    return values.length;
  } finally {
    lock.releaseLock();
  }
}
