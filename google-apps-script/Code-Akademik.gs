/**
 * ===================================================================
 * KODE INI DITEMPEL DI GOOGLE APPS SCRIPT PADA SPREADSHEET AKADEMIK
 * (FILE SHEETS KETIGA, terpisah dari Data Induk & Keuangan)
 * ===================================================================
 * Kenapa file sendiri?
 * Presensi harian (1 baris per siswa per hari) & nilai (1 baris per siswa per
 * penilaian) tumbuh JAUH lebih cepat dari data induk -- 200 siswa x 200 hari
 * efektif = 40.000 baris presensi per tahun. Kalau digabung ke Data Induk,
 * setiap load awal & polling 30 detik ikut menarik puluhan ribu baris itu.
 *
 * Cara pasang:
 * 1. Buat Google Sheet BARU (terpisah dari Data Induk & Keuangan).
 * 2. Extensions -> Apps Script -> hapus isi default, tempel SELURUH file ini.
 * 3. Ganti SECRET di bawah.
 * 4. Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone).
 * 5. Salin URL /exec -> src/config/sheetsDefaults.js bagian `akademik`, build ulang.
 *
 * Tab yang dilayani (dibuat otomatis saat data pertama masuk):
 *   jadwal      -> "Jadwal Pelajaran"
 *   presensi    -> "Presensi Siswa"
 *   nilai       -> "Nilai Akademik"
 *   prestasi    -> "Prestasi"
 *   pelanggaran -> "Pelanggaran & Konseling"
 *   kkm         -> "KKM"                (v1.33.0)
 *   agenda      -> "Kalender Akademik"  (v1.33.0)
 *   bankSoal    -> "Bank Soal"          (v1.33.0)
 *   ujian       -> "Ujian"              (v1.33.0)
 *   rapor       -> "Rapor"              (v1.33.0)
 *   presensiGuru -> "Presensi Guru"     (v1.34.0)
 *   kinerja     -> "Penilaian Kinerja"  (v1.34.0)
 *   pelatihan   -> "Pelatihan Guru"     (v1.34.0)
 *   pengaturanPresensi -> "Pengaturan Presensi" (v1.35.0)
 *   buku, sirkulasi, dendaPerpus, reservasiBuku, pengaturanPerpus -> Perpustakaan (v1.37.0)
 *   akreditasi, semester, mutasi, pengumuman, surat -> (v1.38.0)
 *
 * Beda dgn Code.gs / Code-Keuangan.gs:
 * - Nomor "No" baru = No TERBESAR + 1 (bukan getLastRow()). Versi lama bisa
 *   menghasilkan No kembar setelah ada baris yg dihapus di tengah.
 * - Aksi "bulkUpsert": tulis banyak baris sekaligus, baris dgn kunci yg sama
 *   (mis. Tanggal+NISN utk presensi) DITIMPA, bukan ditambah dobel.
 * ===================================================================
 */

const SECRET = 'Qdw-Akd-9tW3z6';

const SHEETS = {
  jadwal: {
    name: 'Jadwal Pelajaran',
    headers: ['No', 'Tahun Ajaran', 'Semester', 'Hari', 'Jam Mulai', 'Jam Selesai', 'Tingkat', 'Rombel', 'Mata Pelajaran', 'Guru', 'Ruang'],
    // "07:30" otomatis dianggap JAM oleh Sheets & kembali sbg Date 1899 -- paksa teks.
    textColumns: ['Jam Mulai', 'Jam Selesai', 'Tingkat', 'Tahun Ajaran'],
  },
  presensi: {
    name: 'Presensi Siswa',
    // Kolom setelah "Dicatat Oleh" ditambahkan v1.35.0 (Presensi Barcode) -- di AKHIR supaya
    // sheet lama tetap kompatibel; getSheet_ otomatis menambah header yg belum ada.
    headers: ['No', 'Tanggal', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Status', 'Jam Masuk', 'Keterangan', 'Dicatat Oleh', 'Jam Pulang', 'Metode', 'Menit Terlambat', 'Denda'],
    textColumns: ['NISN', 'Jam Masuk', 'Jam Pulang', 'Tingkat'],
  },
  nilai: {
    name: 'Nilai Akademik',
    headers: ['No', 'Tahun Ajaran', 'Semester', 'Tanggal', 'Mata Pelajaran', 'Jenis Nilai', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Nilai', 'Guru', 'Keterangan'],
    textColumns: ['NISN', 'Tingkat', 'Tahun Ajaran'],
  },
  prestasi: {
    name: 'Prestasi',
    headers: ['No', 'Tanggal', 'Tahun Ajaran', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Jenis Prestasi', 'Nama Kegiatan', 'Tingkat Lomba', 'Hasil', 'Penyelenggara', 'No Sertifikat', 'Keterangan'],
    textColumns: ['NISN', 'Tingkat', 'Tahun Ajaran', 'No Sertifikat'],
  },
  pelanggaran: {
    name: 'Pelanggaran & Konseling',
    headers: ['No', 'Tanggal', 'Tahun Ajaran', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Kategori', 'Jenis Pelanggaran', 'Poin', 'Penanganan', 'Status Tindak Lanjut', 'Guru BK', 'Catatan Konseling'],
    textColumns: ['NISN', 'Tingkat', 'Tahun Ajaran'],
  },
  kkm: {
    name: 'KKM',
    headers: ['No', 'Tahun Ajaran', 'Tingkat', 'Mata Pelajaran', 'KKM', 'Keterangan'],
    textColumns: ['Tingkat', 'Tahun Ajaran'],
  },
  agenda: {
    name: 'Kalender Akademik',
    headers: ['No', 'Judul', 'Kategori', 'Tanggal Mulai', 'Tanggal Selesai', 'Cakupan', 'Tahun Ajaran', 'Keterangan'],
    textColumns: ['Tahun Ajaran'],
  },
  bankSoal: {
    name: 'Bank Soal',
    headers: ['No', 'Mata Pelajaran', 'Tingkat', 'Jenis Soal', 'Kesulitan', 'Pertanyaan', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Kunci Jawaban', 'Poin', 'Tahun Ajaran', 'Guru'],
    // Pilihan & kunci wajib teks: "1/2" atau "3-4" bisa dibaca Sheets sbg TANGGAL.
    textColumns: ['Tingkat', 'Tahun Ajaran', 'Pertanyaan', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Kunci Jawaban'],
  },
  ujian: {
    name: 'Ujian',
    // "Soal No" = daftar No baris Bank Soal, dipisah koma, urut sesuai nomor soal di naskah.
    headers: ['No', 'Judul', 'Mata Pelajaran', 'Tingkat', 'Rombel', 'Tahun Ajaran', 'Semester', 'Tanggal', 'Durasi (Menit)', 'Status', 'Soal No', 'Guru Pengawas', 'Catatan'],
    textColumns: ['Tingkat', 'Tahun Ajaran', 'Soal No'],
  },
  rapor: {
    name: 'Rapor',
    // Nilai akademik TIDAK disalin ke sini -- dihitung langsung dari tab Nilai Akademik
    // saat rapor dibuka/dicetak. Tab ini cuma menyimpan bagian yg diisi wali kelas.
    headers: ['No', 'Tahun Ajaran', 'Semester', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Sikap Spiritual', 'Sikap Sosial', 'Ekstrakurikuler', 'Sakit', 'Izin', 'Alpha', 'Catatan Wali Kelas', 'Status', 'Tanggal Terbit'],
    textColumns: ['NISN', 'Tingkat', 'Tahun Ajaran'],
  },
  presensiGuru: {
    name: 'Presensi Guru',
    headers: ['No', 'Tanggal', 'Nama', 'NIP', 'Kategori', 'Status', 'Jam Masuk', 'Jam Pulang', 'Keterangan', 'Dicatat Oleh', 'Metode', 'Menit Terlambat', 'Denda'],
    textColumns: ['NIP', 'Jam Masuk', 'Jam Pulang'],
  },
  pengaturanPresensi: {
    name: 'Pengaturan Presensi',
    // Key-value: 1 baris = 1 pengaturan (mis. "batasMasukSiswa" = "07:15").
    headers: ['No', 'Kunci', 'Nilai'],
    textColumns: ['Nilai'],
  },
  buku: {
    name: 'Katalog Buku',
    headers: ['No', 'Kode Buku', 'Judul', 'Penulis', 'Penerbit', 'Tahun Terbit', 'ISBN', 'Kategori', 'Jenis Koleksi', 'Format Digital', 'Tautan Digital', 'Lokasi Rak', 'Jumlah Eksemplar', 'Keterangan'],
    textColumns: ['Kode Buku', 'ISBN', 'Tahun Terbit', 'Lokasi Rak'],
  },
  sirkulasi: {
    name: 'Sirkulasi Buku',
    // "Kode Anggota" = kode kartu presensi (S:NISN / G:NIP / G#No) -- kartu pelajar/pegawai dipakai sbg kartu perpustakaan.
    headers: ['No', 'Kode Buku', 'Judul Buku', 'Kode Anggota', 'Jenis Peminjam', 'Nama Peminjam', 'Kelas / Kategori', 'Tanggal Pinjam', 'Jatuh Tempo', 'Tanggal Kembali', 'Status', 'Petugas', 'Catatan'],
    textColumns: ['Kode Buku', 'Kode Anggota'],
  },
  dendaPerpus: {
    name: 'Denda Perpustakaan',
    headers: ['No', 'No Sirkulasi', 'Kode Buku', 'Judul Buku', 'Kode Anggota', 'Nama Peminjam', 'Jenis Denda', 'Hari Terlambat', 'Nominal', 'Status', 'Tanggal Denda', 'Tanggal Bayar', 'Keterangan'],
    textColumns: ['Kode Buku', 'Kode Anggota'],
  },
  reservasiBuku: {
    name: 'Reservasi Buku',
    headers: ['No', 'Kode Buku', 'Judul Buku', 'Kode Anggota', 'Nama Peminjam', 'Tanggal Reservasi', 'Status', 'Catatan'],
    textColumns: ['Kode Buku', 'Kode Anggota'],
  },
  pengaturanPerpus: {
    name: 'Pengaturan Perpustakaan',
    headers: ['No', 'Kunci', 'Nilai'],
    textColumns: ['Nilai'],
  },
  akreditasi: {
    name: 'Riwayat Akreditasi',
    headers: ['No', 'Tahun', 'Peringkat', 'Nilai', 'Nomor SK', 'Tanggal SK', 'Berlaku Sampai', 'Lembaga', 'Keterangan'],
    textColumns: ['Tahun', 'Nomor SK'],
  },
  semester: {
    name: 'Periode Semester',
    headers: ['No', 'Tahun Ajaran', 'Semester', 'Mulai', 'Selesai', 'Keterangan'],
    textColumns: ['Tahun Ajaran'],
  },
  mutasi: {
    name: 'Mutasi Siswa',
    headers: ['No', 'Tanggal', 'Jenis Mutasi', 'NISN', 'Nama Siswa', 'Tingkat', 'Rombel', 'Sekolah Asal / Tujuan', 'Alasan', 'Nomor Surat', 'Keterangan', 'Dicatat Oleh'],
    textColumns: ['NISN', 'Tingkat', 'Nomor Surat'],
  },
  pengumuman: {
    name: 'Pengumuman',
    headers: ['No', 'Judul', 'Isi', 'Kategori', 'Ditujukan', 'Tanggal Terbit', 'Berlaku Sampai', 'Penting', 'Dibuat Oleh'],
    textColumns: ['Isi'],
  },
  surat: {
    name: 'Surat Menyurat',
    headers: ['No', 'Jenis', 'Nomor Surat', 'Tanggal Surat', 'Tanggal Diterima / Dikirim', 'Pengirim / Tujuan', 'Perihal', 'Kode Klasifikasi', 'Sifat', 'Disposisi', 'Status', 'Tautan Berkas', 'Keterangan', 'Dicatat Oleh'],
    textColumns: ['Nomor Surat', 'Kode Klasifikasi'],
  },
  kinerja: {
    name: 'Penilaian Kinerja',
    headers: ['No', 'Tahun Ajaran', 'Semester', 'Tanggal Penilaian', 'Nama Guru', 'Penilai', 'Perencanaan', 'Pelaksanaan', 'Penilaian', 'Kedisiplinan', 'Komunikasi', 'Skor Total', 'Predikat', 'Catatan Supervisor', 'Rekomendasi'],
    textColumns: ['Tahun Ajaran'],
  },
  pelatihan: {
    name: 'Pelatihan Guru',
    headers: ['No', 'Nama Guru', 'Jenis Kegiatan', 'Nama Kegiatan', 'Tingkat', 'Penyelenggara', 'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah JP', 'No Sertifikat', 'Keterangan'],
    textColumns: ['No Sertifikat'],
  },
};

function doGet(e) {
  if (!e.parameter || e.parameter.secret !== SECRET) {
    return jsonResponse_({ ok: false, error: 'Akses ditolak: kata sandi tidak cocok atau tidak disertakan.' });
  }
  if (e.parameter.sheet === 'ALL') {
    const semua = {};
    Object.keys(SHEETS).forEach(key => { semua[key] = readSheetData_(SHEETS[key]); });
    return jsonResponse_({ ok: true, data: semua });
  }
  const which = SHEETS[e.parameter.sheet] ? e.parameter.sheet : 'jadwal';
  return jsonResponse_({ ok: true, data: readSheetData_(SHEETS[which]) });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return jsonResponse_({ ok: false, error: 'Kata sandi tidak cocok. Cek pengaturan koneksi.' });
    }
    const cfg = SHEETS[body.sheet];
    if (!cfg) return jsonResponse_({ ok: false, error: 'Sheet "' + body.sheet + '" tidak dikenal.' });
    const sheet = getSheet_(cfg);

    if (body.action === 'add') {
      appendRows_(sheet, cfg, [body.row]);
      return jsonResponse_({ ok: true });
    }
    if (body.action === 'bulkAdd') {
      appendRows_(sheet, cfg, body.rows || []);
      return jsonResponse_({ ok: true, count: (body.rows || []).length });
    }
    if (body.action === 'update') {
      const found = updateRow_(sheet, cfg, body.row);
      if (!found) return jsonResponse_({ ok: false, error: 'Baris dengan No=' + body.row['No'] + ' tidak ditemukan.' });
      return jsonResponse_({ ok: true });
    }
    if (body.action === 'delete') {
      const hasil = bulkDeleteRows_(sheet, cfg.headers, [body.no]);
      if (hasil.jumlahDihapus === 0) return jsonResponse_({ ok: false, error: 'Baris dengan No=' + body.no + ' tidak ditemukan.' });
      return jsonResponse_({ ok: true });
    }
    if (body.action === 'bulkDelete') {
      const hasil = bulkDeleteRows_(sheet, cfg.headers, body.nos || []);
      return jsonResponse_({ ok: true, jumlahDihapus: hasil.jumlahDihapus, noTidakDitemukan: hasil.noTidakDitemukan });
    }
    if (body.action === 'bulkUpsert') {
      const hasil = bulkUpsert_(sheet, cfg, body.keyFields || [], body.rows || []);
      return jsonResponse_({ ok: true, ditambah: hasil.ditambah, diupdate: hasil.diupdate });
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

// ---------------------------------------------------------------------------

function readSheetData_(cfg) {
  const sheet = getSheet_(cfg);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const header = data[0];
  const idx = cfg.headers.map(h => header.indexOf(h));
  return data.slice(1).filter(r => r.some(c => c !== '')).map(row => {
    const obj = {};
    cfg.headers.forEach((h, i) => { obj[h] = idx[i] === -1 ? '' : formatCellValue_(row[idx[i]]); });
    return obj;
  });
}

// Date tahun < 1900 = nilai JAM murni (Sheets menyimpan jam sbg 30 Des 1899 + waktu).
function formatCellValue_(value) {
  if (value instanceof Date) {
    if (value.getFullYear() < 1900) return Utilities.formatDate(value, 'Asia/Jakarta', 'HH:mm');
    return Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  return value;
}

function getSheet_(cfg) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(cfg.name);
  if (!sheet) sheet = ss.insertSheet(cfg.name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cfg.headers);
    sheet.setFrozenRows(1);
    (cfg.textColumns || []).forEach(col => {
      const c = cfg.headers.indexOf(col) + 1;
      if (c > 0) sheet.getRange(2, c, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  } else {
    const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    const missing = cfg.headers.filter(h => existing.indexOf(h) === -1);
    if (missing.length > 0) sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

// Posisi kolom dibaca dari header SHEET (bukan urutan cfg.headers) -- aman kalau
// admin menggeser kolom manual di Sheets.
function headerIndex_(sheet) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  header.forEach((h, i) => { map[h] = i; });
  return { header, map };
}

function maxNo_(sheet, noColIdx) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const vals = sheet.getRange(2, noColIdx + 1, lastRow - 1, 1).getValues();
  let max = 0;
  vals.forEach(v => { const n = Number(v[0]); if (n > max) max = n; });
  return max;
}

function toRowArray_(header, rowObj, no) {
  return header.map(h => (h === 'No' ? no : (rowObj[h] !== undefined && rowObj[h] !== null ? rowObj[h] : '')));
}

function forceText_(sheet, cfg, map, startRow, numRows) {
  if (numRows <= 0) return;
  (cfg.textColumns || []).forEach(col => {
    if (map[col] !== undefined) sheet.getRange(startRow, map[col] + 1, numRows, 1).setNumberFormat('@');
  });
}

function appendRows_(sheet, cfg, rows) {
  if (!rows.length) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const { header, map } = headerIndex_(sheet);
    let next = maxNo_(sheet, map['No']) + 1;
    const values = rows.map(r => toRowArray_(header, r, next++));
    const start = sheet.getLastRow() + 1;
    forceText_(sheet, cfg, map, start, values.length);
    sheet.getRange(start, 1, values.length, header.length).setValues(values);
  } finally {
    lock.releaseLock();
  }
}

function cariBarisByNo_(sheet, noColIdx, targetNo) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const vals = sheet.getRange(2, noColIdx + 1, lastRow - 1, 1).getValues();
  const t = String(targetNo);
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === t) return i + 2;
  return -1;
}

function updateRow_(sheet, cfg, rowObj) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const { header, map } = headerIndex_(sheet);
    const r = cariBarisByNo_(sheet, map['No'], rowObj['No']);
    if (r === -1) return false;
    forceText_(sheet, cfg, map, r, 1);
    sheet.getRange(r, 1, 1, header.length).setValues([toRowArray_(header, rowObj, rowObj['No'])]);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function bulkDeleteRows_(sheet, headers, nosRaw) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const { map } = headerIndex_(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2 || !nosRaw.length) return { jumlahDihapus: 0, noTidakDitemukan: nosRaw.map(String) };
    const target = new Set(nosRaw.map(String));
    const vals = sheet.getRange(2, map['No'] + 1, lastRow - 1, 1).getValues();
    const ketemu = new Set();
    const baris = [];
    vals.forEach((v, i) => { const k = String(v[0]); if (target.has(k)) { baris.push(i + 2); ketemu.add(k); } });
    baris.sort((a, b) => b - a).forEach(r => sheet.deleteRow(r));
    const noTidakDitemukan = [];
    target.forEach(n => { if (!ketemu.has(n)) noTidakDitemukan.push(n); });
    return { jumlahDihapus: baris.length, noTidakDitemukan };
  } finally {
    lock.releaseLock();
  }
}

// Tulis banyak baris; baris yg kombinasi keyFields-nya sudah ada -> ditimpa
// (No lama dipertahankan), sisanya ditambahkan di bawah dalam 1 setValues.
function bulkUpsert_(sheet, cfg, keyFields, rows) {
  if (!rows.length) return { ditambah: 0, diupdate: 0 };
  if (!keyFields.length) throw new Error('keyFields wajib diisi untuk bulkUpsert.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const { header, map } = headerIndex_(sheet);
    const lastRow = sheet.getLastRow();
    const data = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, header.length).getValues() : [];
    const kunci = (getter) => keyFields.map(k => String(formatCellValue_(getter(k)) ?? '').trim()).join('||');
    const barisByKey = {};
    data.forEach((row, i) => { barisByKey[kunci(k => row[map[k]])] = { rowIndex: i + 2, no: row[map['No']] }; });

    let next = maxNo_(sheet, map['No']) + 1;
    const tambah = [];
    let diupdate = 0;
    rows.forEach(r => {
      const hit = barisByKey[kunci(k => r[k])];
      if (hit) {
        forceText_(sheet, cfg, map, hit.rowIndex, 1);
        sheet.getRange(hit.rowIndex, 1, 1, header.length).setValues([toRowArray_(header, r, hit.no)]);
        diupdate++;
      } else {
        tambah.push(toRowArray_(header, r, next++));
      }
    });
    if (tambah.length) {
      const start = sheet.getLastRow() + 1;
      forceText_(sheet, cfg, map, start, tambah.length);
      sheet.getRange(start, 1, tambah.length, header.length).setValues(tambah);
    }
    return { ditambah: tambah.length, diupdate };
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
