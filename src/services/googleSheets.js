import { DEFAULT_SHEETS_CONFIG } from '../config/sheetsDefaults';

// ---- Cara 1: koneksi ditanam permanen di kode, TIDAK ADA lagi override manual ----
export function getSheetsConfig(target = 'master') {
  return DEFAULT_SHEETS_CONFIG[target] || { url: '', secret: '' };
}

export function saveSheetsConfig() {
  // Sengaja dikosongkan -- sesuai keputusan Cara 1, pengaturan manual dinonaktifkan.
  // Untuk ganti URL/sandi, edit src/config/sheetsDefaults.js lalu build ulang.
  console.warn('Koneksi ditanam di kode (Cara 1). Ganti lewat src/config/sheetsDefaults.js, bukan dari sini.');
}

export function isConfigured(target = 'master') {
  return !!getSheetsConfig(target).url;
}

const TARGET_LABEL = { master: 'Data Induk', keuangan: 'Keuangan', akademik: 'Akademik' };

// Google Apps Script (paket gratis) sering gagal SESAAT -- bukan berarti benar2
// putus, tapi kena batas eksekusi/kuota bersamaan sesaat, atau "cold start" kalau
// baru dipanggil lagi setelah lama idle. Kebanyakan kasus begini BERHASIL kalau
// dicoba ULANG sekali lagi setelah jeda singkat -- jadi SEMUA request (GET & POST)
// lewat sini, coba max 2x (1x asli + 1x ulang) sebelum benar2 dianggap gagal.
// Ini mengurangi kesan "sering kondek/diskonek" TANPA perlu ganti apa pun di
// sisi Google -- murni memperbaiki cara React menangani kegagalan sesaat.
async function fetchDenganRetry(url, options, percobaanMaks = 2) {
  let errorTerakhir;
  for (let percobaan = 1; percobaan <= percobaanMaks; percobaan++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    } catch (err) {
      errorTerakhir = err;
      if (percobaan < percobaanMaks) await new Promise(r => setTimeout(r, 900));
    }
  }
  throw errorTerakhir;
}

export async function fetchFromSheet(sheetName = 'siswa', target = 'master') {
  const { url, secret } = getSheetsConfig(target);
  if (!url) throw new Error(`URL Apps Script (${TARGET_LABEL[target]}) belum diatur. Buka Pengaturan Koneksi dulu.`);
  const sep = url.includes('?') ? '&' : '?';
  // "_ts" cache-buster + cache:'no-store' -- PENTING utk kasus refresh() yg dipanggil
  // LANGSUNG setelah POST simpan (mis. Terapkan Hak Akses, tambah/edit data). Tanpa ini,
  // request GET dgn query string PERSIS SAMA spt request sebelumnya bisa kena cache
  // (browser ATAU lapisan proxy/edge di depan Web App Apps Script), jadi refresh
  // menampilkan data LAMA sesaat setelah simpan sukses -- kelihatannya seperti
  // "perubahan hilang/balik lagi" padahal sebenarnya sudah tersimpan di Sheet.
  const res = await fetchDenganRetry(
    url + sep + 'sheet=' + encodeURIComponent(sheetName) + '&secret=' + encodeURIComponent(secret || '') + '&_ts=' + Date.now(),
    { method: 'GET', cache: 'no-store' }
  );
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Gagal mengambil data dari Sheet.');
  return json.data;
}

// Ambil SEMUA sheet dari 1 target (Master/Keuangan) dalam SATU request -- dipakai
// saat load pertama (login/buka app) supaya browser tidak perlu menembak banyak
// request terpisah sekaligus (tiap request ke Apps Script punya overhead & kena
// kuota bersama -- gabung jadi 1 mengurangi beban & kegagalan "tidak terhubung").
// Hasilnya objek {namaSheet: [...rows]}, sesuai kunci di SHEETS pada Code.gs.
export async function fetchAllFromSheet(target = 'master') {
  const { url, secret } = getSheetsConfig(target);
  if (!url) throw new Error(`URL Apps Script (${TARGET_LABEL[target]}) belum diatur. Buka Pengaturan Koneksi dulu.`);
  const sep = url.includes('?') ? '&' : '?';
  // Cache-buster sama spt fetchFromSheet() -- lihat catatan di sana.
  const res = await fetchDenganRetry(
    url + sep + 'sheet=ALL&secret=' + encodeURIComponent(secret || '') + '&_ts=' + Date.now(),
    { method: 'GET', cache: 'no-store' }
  );
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Gagal mengambil data dari Sheet.');
  return json.data; // { sheetName: [...rows], ... }
}

async function postToSheet(body, target = 'master') {
  const { url, secret } = getSheetsConfig(target);
  if (!url) throw new Error(`URL Apps Script (${TARGET_LABEL[target]}) belum diatur. Buka Pengaturan Koneksi dulu.`);
  // PENTING -- SENGAJA TIDAK pakai fetchDenganRetry() di sini (beda dgn fetchFromSheet
  // GET yg aman diulang). Request GET aman diulang krn cuma BACA (idempotent). Request
  // POST ini MENULIS (add/update/delete) -- kalau percobaan pertama SEBENARNYA sudah
  // berhasil di server tapi respons-nya yg gagal balik (network putus di tengah jalan),
  // mengulang otomatis bisa mengirim tulisan yg SAMA dua kali -- persis bug "tagihan
  // dobel" yg baru saja diperbaiki (lihat riwayat: refreshTagihanLain yg tdk di-await).
  // Kalau POST gagal, biarkan gagal & user yg putuskan mau coba lagi manual atau tidak.
  // Content-Type: text/plain sengaja dipakai (bukan application/json) supaya browser
  // tidak mengirim preflight OPTIONS -- Google Apps Script Web App tidak menanganinya dgn baik.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, secret }),
  });
  return res.json();
}

export async function addToSheet(sheetName, row, target = 'master') {
  const json = await postToSheet({ action: 'add', sheet: sheetName, row }, target);
  if (!json.ok) throw new Error(json.error || 'Gagal menyimpan data.');
  return json;
}

export async function bulkAddToSheet(sheetName, rows, target = 'master') {
  const json = await postToSheet({ action: 'bulkAdd', sheet: sheetName, rows }, target);
  if (!json.ok) throw new Error(json.error || 'Gagal mengunggah data.');
  return json;
}

export async function updateInSheet(sheetName, row, target = 'master') {
  const json = await postToSheet({ action: 'update', sheet: sheetName, row }, target);
  if (!json.ok) throw new Error(json.error || 'Gagal memperbarui data.');
  return json;
}

// Update BANYAK baris sekaligus dalam SATU request -- tiap item: { no, patch: {field:
// value, ...} }, cuma field di "patch" yg diubah (kolom lain di baris itu tidak
// disentuh). Dipakai fitur "Isi NISN Massal" -- jauh lebih cepat & tahan gagal drpd
// kirim 1 request terpisah per baris (lihat bulkDeleteFromSheet utk alasan yg sama).
export async function bulkUpdateInSheet(sheetName, updates, target = 'master') {
  if (!updates || updates.length === 0) return { jumlahDiupdate: 0, noTidakDitemukan: [] };
  const json = await postToSheet({ action: 'bulkUpdate', sheet: sheetName, updates }, target);
  if (!json.ok) throw new Error(json.error || 'Gagal memperbarui data (bulk).');
  return { jumlahDiupdate: json.jumlahDiupdate || 0, noTidakDitemukan: json.noTidakDitemukan || [] };
}

export async function deleteFromSheet(sheetName, no, target = 'master') {
  const json = await postToSheet({ action: 'delete', sheet: sheetName, no }, target);
  if (!json.ok) throw new Error(json.error || 'Gagal menghapus data.');
  return json;
}

// Hapus BANYAK baris (by "No") dalam SATU request -- dipakai utk "Bersihkan Duplikat"
// yg bisa perlu menghapus ratusan baris sekaligus. Server (bulkDeleteRows_ di Apps
// Script) membaca kolom "No" 1x lalu menghapus semua yg cocok dlm 1 eksekusi -- jauh
// lebih cepat & tahan gagal drpd kirim 1 request terpisah PER baris (cara lama: baris
// yg gagal krn timeout/dsb diam2 dilewati tanpa jejak). Return { jumlahDihapus,
// noTidakDitemukan } supaya pemanggil bisa tahu PERSIS kalau ada yg tidak ketemu.
export async function bulkDeleteFromSheet(sheetName, nos, target = 'master') {
  if (!nos || nos.length === 0) return { jumlahDihapus: 0, noTidakDitemukan: [] };
  const json = await postToSheet({ action: 'bulkDelete', sheet: sheetName, nos }, target);
  if (!json.ok) throw new Error(json.error || 'Gagal menghapus data (bulk).');
  return { jumlahDihapus: json.jumlahDihapus || 0, noTidakDitemukan: json.noTidakDitemukan || [] };
}

// =====================================================================
// ---- Alias khusus per modul (semua di file Sheets MASTER) ----
// =====================================================================
export const fetchSiswaFromSheet = () => fetchFromSheet('siswa');
export const addSiswaToSheet = (row) => addToSheet('siswa', row);
export const bulkAddSiswaToSheet = (rows) => bulkAddToSheet('siswa', rows);
export const updateSiswaInSheet = (row) => updateInSheet('siswa', row);
export const bulkUpdateSiswaInSheet = (updates) => bulkUpdateInSheet('siswa', updates);
export const deleteSiswaFromSheet = (no) => deleteFromSheet('siswa', no);

export const fetchUsersFromSheet = () => fetchFromSheet('users');
export const addUserToSheet = (row) => addToSheet('users', row);
export const updateUserInSheet = (row) => updateInSheet('users', row);
export const deleteUserFromSheet = (no) => deleteFromSheet('users', no);

export const fetchKelasFromSheet = () => fetchFromSheet('kelas');
export const addKelasToSheet = (row) => addToSheet('kelas', row);
export const updateKelasInSheet = (row) => updateInSheet('kelas', row);
export const deleteKelasFromSheet = (no) => deleteFromSheet('kelas', no);

export const fetchGuruFromSheet = () => fetchFromSheet('guru');
export const addGuruToSheet = (row) => addToSheet('guru', row);
export const updateGuruInSheet = (row) => updateInSheet('guru', row);
export const deleteGuruFromSheet = (no) => deleteFromSheet('guru', no);

export const fetchAsetFromSheet = () => fetchFromSheet('aset');
export const addAsetToSheet = (row) => addToSheet('aset', row);
export const updateAsetInSheet = (row) => updateInSheet('aset', row);
export const deleteAsetFromSheet = (no) => deleteFromSheet('aset', no);

export const fetchPeminjamanFromSheet = () => fetchFromSheet('peminjaman');
export const addPeminjamanToSheet = (row) => addToSheet('peminjaman', row);
export const updatePeminjamanInSheet = (row) => updateInSheet('peminjaman', row);
export const deletePeminjamanFromSheet = (no) => deleteFromSheet('peminjaman', no);

export const fetchPemeliharaanFromSheet = () => fetchFromSheet('pemeliharaan');
export const addPemeliharaanToSheet = (row) => addToSheet('pemeliharaan', row);
export const updatePemeliharaanInSheet = (row) => updateInSheet('pemeliharaan', row);
export const deletePemeliharaanFromSheet = (no) => deleteFromSheet('pemeliharaan', no);

// ---- Profil Sekolah (SELALU 1 baris, No=1) ----
export const fetchProfilFromSheet = () => fetchFromSheet('profil');
export async function saveProfilToSheet(row, exists) {
  const payload = { ...row, No: 1 };
  return exists ? updateInSheet('profil', payload) : addToSheet('profil', payload);
}

// ---- Tahun Ajaran ----
export const fetchTahunAjaranFromSheet = () => fetchFromSheet('tahunAjaran');
export const addTahunAjaranToSheet = (row) => addToSheet('tahunAjaran', row);
export const updateTahunAjaranInSheet = (row) => updateInSheet('tahunAjaran', row);
export const deleteTahunAjaranFromSheet = (no) => deleteFromSheet('tahunAjaran', no);
export async function setActiveTahunAjaranOnSheet(no) {
  const json = await postToSheet({ action: 'setActiveTahunAjaran', sheet: 'tahunAjaran', no }, 'master');
  if (!json.ok) throw new Error(json.error || 'Gagal mengaktifkan tahun ajaran.');
  return json;
}

// ---- Riwayat Akademik & Status (histori Kelas/Rombel/Status per Tahun Ajaran) ----
export const fetchRiwayatAkademikFromSheet = () => fetchFromSheet('riwayatAkademik');
export const addRiwayatAkademikToSheet = (row) => addToSheet('riwayatAkademik', row);
export const bulkAddRiwayatAkademikToSheet = (rows) => bulkAddToSheet('riwayatAkademik', rows);
export const updateRiwayatAkademikInSheet = (row) => updateInSheet('riwayatAkademik', row);
export const bulkUpdateRiwayatAkademikInSheet = (updates) => bulkUpdateInSheet('riwayatAkademik', updates);
export const deleteRiwayatAkademikFromSheet = (no) => deleteFromSheet('riwayatAkademik', no);

// ---- Log aktivitas ----
export const fetchLogFromSheet = () => fetchFromSheet('log');

// Perbaiki "No" yg kebetulan dobel akibat bug lama (race condition saat penerbitan
// cepat berturut-turut, sudah diperbaiki dgn LockService -- ini cuma utk data LAMA
// yg terlanjur rusak). sheetName: 'tagihanSpp' | 'tagihanLain'.
export async function perbaikiNomorGanda(sheetName) {
  const json = await postToSheet({ action: 'perbaikiNomorGanda', sheet: sheetName }, 'keuangan');
  if (!json.ok) throw new Error(json.error || 'Gagal memperbaiki nomor ganda.');
  return json.jumlahDiperbaiki;
}

// Cek ringan apakah target (master/keuangan) BENAR-BENAR bisa dihubungi SAAT INI --
// dipakai indikator status di header (pulse hijau/merah). SENGAJA pakai 1 percobaan
// LANGSUNG (bukan fetchDenganRetry) supaya statusnya jujur mencerminkan kondisi
// SAAT itu juga -- pemulihan otomatis (merah -> hijau) terjadi lewat pengecekan
// BERKALA berikutnya dari komponen pemanggilnya, bukan retry di sini.
export async function cekKoneksi(target = 'master') {
  const { url, secret } = getSheetsConfig(target);
  if (!url) return false;
  try {
    const sep = url.includes('?') ? '&' : '?';
    // sheet=profil (master) / sheet=tarif (keuangan) -- keduanya ringan, bukan seluruh data.
    const sheetRingan = target === 'keuangan' ? 'tarif' : target === 'akademik' ? 'jadwal' : 'profil';
    const res = await fetch(url + sep + 'sheet=' + sheetRingan + '&secret=' + encodeURIComponent(secret || ''), { method: 'GET' });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.ok;
  } catch {
    return false;
  }
}

export const fetchRolesFromSheet = () => fetchFromSheet('roles');
export const addRoleToSheet = (namaRole) => addToSheet('roles', { 'Nama Role': namaRole });
export const deleteRoleFromSheet = (no) => deleteFromSheet('roles', no);

export const fetchHakAksesFromSheet = () => fetchFromSheet('hakAkses');
// Kirim SATU perubahan saja (itemId + checked) -- server yg menggabungkan ke JSON
// izin role itu (baca-gabung-tulis di Code.gs), BUKAN client yg kirim JSON lengkap.
// Ini sengaja supaya aman dipanggil berkali-kali cepat berturut-turut (mis. centang
// beberapa kotak beruntun) tanpa risiko 1 perubahan menimpa/menghapus perubahan lain
// yg baru saja dikirim tapi belum selesai diproses server.
export async function saveHakAksesRole(role, itemId, checked) {
  const json = await postToSheet({ action: 'upsertHakAkses', sheet: 'hakAkses', role, itemId, checked });
  if (!json.ok) throw new Error(json.error || 'Gagal menyimpan hak akses.');
  return json;
}
export async function addLogEntry({ username, namaUser, aksi, modul, detail }) {
  const row = {
    Waktu: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    Username: username,
    'Nama User': namaUser,
    Aksi: aksi,
    Modul: modul,
    Detail: detail || '',
  };
  try {
    await addToSheet('log', row);
  } catch (err) {
    // Log gagal tersimpan JANGAN sampai membatalkan aksi utama (edit/hapus) yg sudah terjadi.
    console.warn('Gagal mencatat log aktivitas:', err.message);
  }
}

// =====================================================================
// ---- Alias khusus KEUANGAN (file Sheets TERPISAH, target='keuangan') ----
// =====================================================================
export const fetchTarifFromSheet = () => fetchFromSheet('tarif', 'keuangan');
export const addTarifToSheet = (row) => addToSheet('tarif', row, 'keuangan');
export const updateTarifInSheet = (row) => updateInSheet('tarif', row, 'keuangan');
export const deleteTarifFromSheet = (no) => deleteFromSheet('tarif', no, 'keuangan');

export const fetchTagihanSppFromSheet = () => fetchFromSheet('tagihanSpp', 'keuangan');
export const bulkAddTagihanSppToSheet = (rows) => bulkAddToSheet('tagihanSpp', rows, 'keuangan');
export const deleteTagihanSppFromSheet = (no) => deleteFromSheet('tagihanSpp', no, 'keuangan');
export const bulkDeleteTagihanSppFromSheet = (nos) => bulkDeleteFromSheet('tagihanSpp', nos, 'keuangan');
export const bulkUpdateTagihanSppInSheet = (updates) => bulkUpdateInSheet('tagihanSpp', updates, 'keuangan');

export const fetchTagihanLainFromSheet = () => fetchFromSheet('tagihanLain', 'keuangan');
export const addTagihanLainToSheet = (row) => addToSheet('tagihanLain', row, 'keuangan');
export const updateTagihanLainInSheet = (row) => updateInSheet('tagihanLain', row, 'keuangan');
export const updateTagihanSppInSheet = (row) => updateInSheet('tagihanSpp', row, 'keuangan');
export const updatePembayaranInSheet = (row) => updateInSheet('pembayaran', row, 'keuangan');
export const deleteTagihanLainFromSheet = (no) => deleteFromSheet('tagihanLain', no, 'keuangan');
export const bulkDeleteTagihanLainFromSheet = (nos) => bulkDeleteFromSheet('tagihanLain', nos, 'keuangan');
export const bulkUpdateTagihanLainInSheet = (updates) => bulkUpdateInSheet('tagihanLain', updates, 'keuangan');

export const fetchPembayaranFromSheet = () => fetchFromSheet('pembayaran', 'keuangan');
export const addPembayaranToSheet = (row) => addToSheet('pembayaran', row, 'keuangan');
export const bulkAddPembayaranToSheet = (rows) => bulkAddToSheet('pembayaran', rows, 'keuangan');
export const deletePembayaranFromSheet = (no) => deleteFromSheet('pembayaran', no, 'keuangan');
export const bulkDeletePembayaranFromSheet = (nos) => bulkDeleteFromSheet('pembayaran', nos, 'keuangan');
export const bulkUpdatePembayaranInSheet = (updates) => bulkUpdateInSheet('pembayaran', updates, 'keuangan');

export const fetchPengeluaranFromSheet = () => fetchFromSheet('pengeluaran', 'keuangan');
export const addPengeluaranToSheet = (row) => addToSheet('pengeluaran', row, 'keuangan');
export const updatePengeluaranInSheet = (row) => updateInSheet('pengeluaran', row, 'keuangan');
export const deletePengeluaranFromSheet = (no) => deleteFromSheet('pengeluaran', no, 'keuangan');
export const bulkDeletePengeluaranFromSheet = (nos) => bulkDeleteFromSheet('pengeluaran', nos, 'keuangan');

export const fetchPemasukanLainFromSheet = () => fetchFromSheet('pemasukanLain', 'keuangan');
export const addPemasukanLainToSheet = (row) => addToSheet('pemasukanLain', row, 'keuangan');
export const updatePemasukanLainInSheet = (row) => updateInSheet('pemasukanLain', row, 'keuangan');
export const deletePemasukanLainFromSheet = (no) => deleteFromSheet('pemasukanLain', no, 'keuangan');
export const bulkDeletePemasukanLainFromSheet = (nos) => bulkDeleteFromSheet('pemasukanLain', nos, 'keuangan');

export const fetchAkunFromSheet = () => fetchFromSheet('akunBukuBesar', 'keuangan');
export const addAkunToSheet = (row) => addToSheet('akunBukuBesar', row, 'keuangan');
export const updateAkunInSheet = (row) => updateInSheet('akunBukuBesar', row, 'keuangan');
export const deleteAkunFromSheet = (no) => deleteFromSheet('akunBukuBesar', no, 'keuangan');

export const fetchBeasiswaKategoriFromSheet = () => fetchFromSheet('beasiswaKategori', 'keuangan');
export const addBeasiswaKategoriToSheet = (row) => addToSheet('beasiswaKategori', row, 'keuangan');
export const updateBeasiswaKategoriInSheet = (row) => updateInSheet('beasiswaKategori', row, 'keuangan');
export const deleteBeasiswaKategoriFromSheet = (no) => deleteFromSheet('beasiswaKategori', no, 'keuangan');

export const fetchBeasiswaSiswaFromSheet = () => fetchFromSheet('beasiswaSiswa', 'keuangan');
export const addBeasiswaSiswaToSheet = (row) => addToSheet('beasiswaSiswa', row, 'keuangan');
export const updateBeasiswaSiswaInSheet = (row) => updateInSheet('beasiswaSiswa', row, 'keuangan');
export const deleteBeasiswaSiswaFromSheet = (no) => deleteFromSheet('beasiswaSiswa', no, 'keuangan');

// ---- Alias AKADEMIK & KESISWAAN (file Sheets ketiga, target='akademik') ----
// Lihat google-apps-script/Code-Akademik.gs.
export async function bulkUpsertInSheet(sheetName, keyFields, rows, target = 'akademik') {
  const json = await postToSheet({ action: 'bulkUpsert', sheet: sheetName, keyFields, rows }, target);
  if (!json.ok) throw new Error(json.error || 'Gagal menyimpan data.');
  return { ditambah: json.ditambah || 0, diupdate: json.diupdate || 0 };
}

export const fetchJadwalFromSheet = () => fetchFromSheet('jadwal', 'akademik');
export const addJadwalToSheet = (row) => addToSheet('jadwal', row, 'akademik');
export const updateJadwalInSheet = (row) => updateInSheet('jadwal', row, 'akademik');
export const deleteJadwalFromSheet = (no) => deleteFromSheet('jadwal', no, 'akademik');

export const fetchPresensiFromSheet = () => fetchFromSheet('presensi', 'akademik');
export const updatePresensiInSheet = (row) => updateInSheet('presensi', row, 'akademik');
export const deletePresensiFromSheet = (no) => deleteFromSheet('presensi', no, 'akademik');
// Kunci unik presensi: 1 siswa cuma punya 1 status per tanggal.
export const upsertPresensiToSheet = (rows) => bulkUpsertInSheet('presensi', ['Tanggal', 'NISN'], rows);

export const fetchNilaiFromSheet = () => fetchFromSheet('nilai', 'akademik');
export const updateNilaiInSheet = (row) => updateInSheet('nilai', row, 'akademik');
export const deleteNilaiFromSheet = (no) => deleteFromSheet('nilai', no, 'akademik');
// Kunci unik nilai: 1 penilaian (TA+semester+mapel+jenis+tanggal) per siswa.
export const upsertNilaiToSheet = (rows) => bulkUpsertInSheet('nilai', ['Tahun Ajaran', 'Semester', 'Mata Pelajaran', 'Jenis Nilai', 'Tanggal', 'NISN'], rows);

export const fetchPrestasiFromSheet = () => fetchFromSheet('prestasi', 'akademik');
export const addPrestasiToSheet = (row) => addToSheet('prestasi', row, 'akademik');
export const updatePrestasiInSheet = (row) => updateInSheet('prestasi', row, 'akademik');
export const deletePrestasiFromSheet = (no) => deleteFromSheet('prestasi', no, 'akademik');

export const fetchPelanggaranFromSheet = () => fetchFromSheet('pelanggaran', 'akademik');
export const addPelanggaranToSheet = (row) => addToSheet('pelanggaran', row, 'akademik');
export const updatePelanggaranInSheet = (row) => updateInSheet('pelanggaran', row, 'akademik');
export const deletePelanggaranFromSheet = (no) => deleteFromSheet('pelanggaran', no, 'akademik');

// ---- Akademik Lanjutan (v1.33.0) ----
export const fetchKkmFromSheet = () => fetchFromSheet('kkm', 'akademik');
export const updateKkmInSheet = (row) => updateInSheet('kkm', row, 'akademik');
export const deleteKkmFromSheet = (no) => deleteFromSheet('kkm', no, 'akademik');
export const upsertKkmToSheet = (rows) => bulkUpsertInSheet('kkm', ['Tahun Ajaran', 'Tingkat', 'Mata Pelajaran'], rows);

export const fetchAgendaFromSheet = () => fetchFromSheet('agenda', 'akademik');
export const addAgendaToSheet = (row) => addToSheet('agenda', row, 'akademik');
export const updateAgendaInSheet = (row) => updateInSheet('agenda', row, 'akademik');
export const deleteAgendaFromSheet = (no) => deleteFromSheet('agenda', no, 'akademik');

export const fetchBankSoalFromSheet = () => fetchFromSheet('bankSoal', 'akademik');
export const addBankSoalToSheet = (row) => addToSheet('bankSoal', row, 'akademik');
export const updateBankSoalInSheet = (row) => updateInSheet('bankSoal', row, 'akademik');
export const deleteBankSoalFromSheet = (no) => deleteFromSheet('bankSoal', no, 'akademik');

export const fetchUjianFromSheet = () => fetchFromSheet('ujian', 'akademik');
export const addUjianToSheet = (row) => addToSheet('ujian', row, 'akademik');
export const updateUjianInSheet = (row) => updateInSheet('ujian', row, 'akademik');
export const deleteUjianFromSheet = (no) => deleteFromSheet('ujian', no, 'akademik');

export const fetchRaporFromSheet = () => fetchFromSheet('rapor', 'akademik');
export const upsertRaporToSheet = (rows) => bulkUpsertInSheet('rapor', ['Tahun Ajaran', 'Semester', 'NISN'], rows);

// ---- Kepegawaian (v1.34.0) ----
export const fetchPresensiGuruFromSheet = () => fetchFromSheet('presensiGuru', 'akademik');
export const updatePresensiGuruInSheet = (row) => updateInSheet('presensiGuru', row, 'akademik');
export const deletePresensiGuruFromSheet = (no) => deleteFromSheet('presensiGuru', no, 'akademik');
export const upsertPresensiGuruToSheet = (rows) => bulkUpsertInSheet('presensiGuru', ['Tanggal', 'Nama'], rows);

export const fetchKinerjaFromSheet = () => fetchFromSheet('kinerja', 'akademik');
export const addKinerjaToSheet = (row) => addToSheet('kinerja', row, 'akademik');
export const updateKinerjaInSheet = (row) => updateInSheet('kinerja', row, 'akademik');
export const deleteKinerjaFromSheet = (no) => deleteFromSheet('kinerja', no, 'akademik');

export const fetchPelatihanFromSheet = () => fetchFromSheet('pelatihan', 'akademik');
export const addPelatihanToSheet = (row) => addToSheet('pelatihan', row, 'akademik');
export const updatePelatihanInSheet = (row) => updateInSheet('pelatihan', row, 'akademik');
export const deletePelatihanFromSheet = (no) => deleteFromSheet('pelatihan', no, 'akademik');

// ---- Presensi Barcode (v1.35.0) ----
export const fetchPengaturanPresensiFromSheet = () => fetchFromSheet('pengaturanPresensi', 'akademik');
export const upsertPengaturanPresensiToSheet = (rows) => bulkUpsertInSheet('pengaturanPresensi', ['Kunci'], rows);

// ---- Perpustakaan (v1.37.0) ----
export const fetchBukuFromSheet = () => fetchFromSheet('buku', 'akademik');
export const addBukuToSheet = (row) => addToSheet('buku', row, 'akademik');
export const updateBukuInSheet = (row) => updateInSheet('buku', row, 'akademik');
export const deleteBukuFromSheet = (no) => deleteFromSheet('buku', no, 'akademik');
export const fetchSirkulasiFromSheet = () => fetchFromSheet('sirkulasi', 'akademik');
export const addSirkulasiToSheet = (row) => addToSheet('sirkulasi', row, 'akademik');
export const updateSirkulasiInSheet = (row) => updateInSheet('sirkulasi', row, 'akademik');
export const deleteSirkulasiFromSheet = (no) => deleteFromSheet('sirkulasi', no, 'akademik');
export const fetchDendaPerpusFromSheet = () => fetchFromSheet('dendaPerpus', 'akademik');
export const addDendaPerpusToSheet = (row) => addToSheet('dendaPerpus', row, 'akademik');
export const updateDendaPerpusInSheet = (row) => updateInSheet('dendaPerpus', row, 'akademik');
export const deleteDendaPerpusFromSheet = (no) => deleteFromSheet('dendaPerpus', no, 'akademik');
export const fetchReservasiFromSheet = () => fetchFromSheet('reservasiBuku', 'akademik');
export const addReservasiToSheet = (row) => addToSheet('reservasiBuku', row, 'akademik');
export const updateReservasiInSheet = (row) => updateInSheet('reservasiBuku', row, 'akademik');
export const deleteReservasiFromSheet = (no) => deleteFromSheet('reservasiBuku', no, 'akademik');
export const fetchPengaturanPerpusFromSheet = () => fetchFromSheet('pengaturanPerpus', 'akademik');
export const upsertPengaturanPerpusToSheet = (rows) => bulkUpsertInSheet('pengaturanPerpus', ['Kunci'], rows);

// ---- v1.38.0: Akreditasi, Semester, Mutasi, Pengumuman, Surat, Backup/Restore ----
const crudAkademik = (sheet) => ({
  fetch: () => fetchFromSheet(sheet, 'akademik'),
  add: (row) => addToSheet(sheet, row, 'akademik'),
  update: (row) => updateInSheet(sheet, row, 'akademik'),
  remove: (no) => deleteFromSheet(sheet, no, 'akademik'),
});
export const akreditasiApi = crudAkademik('akreditasi');
export const semesterApi = crudAkademik('semester');
export const mutasiApi = crudAkademik('mutasi');
export const pengumumanApi = crudAkademik('pengumuman');
export const suratApi = crudAkademik('surat');

// Restore: timpa seluruh isi 1 tab (butuh aksi "replaceAll" -- script v1.38.0 ke atas).
export async function replaceAllInSheet(sheetName, rows, target) {
  const json = await postToSheet({ action: 'replaceAll', sheet: sheetName, rows }, target);
  if (!json.ok) throw new Error(json.error || `Gagal memulihkan tab ${sheetName}.`);
  return json.jumlah;
}
