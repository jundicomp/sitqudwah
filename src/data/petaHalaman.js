// =====================================================================
// PETA HALAMAN (v1.50.0) -- status tiap halaman & tab utk halaman Pengaturan › Peta Halaman.
// Struktur menu diambil otomatis dari navConfig + HAK_AKSES_TABS, jadi halaman baru
// langsung ikut muncul. File ini cuma menyimpan STATUS yg bukan "siap", plus item
// yg belum ada di aplikasi (rencana / sedang dikerjakan).
//
//   siap    = sudah ada, sudah dites (halaman & semua tab terbuka tanpa error)
//   progres = sedang dikerjakan
//   rencana = harus ada, belum dikerjakan
// =====================================================================

export const STATUS_INFO = {
  siap: { label: 'Siap', ikon: '✓', kelas: 'ph-siap', ket: 'Sudah ada, sudah dites tanpa error' },
  progres: { label: 'Sedang dikerjakan', ikon: '', kelas: 'ph-progres', ket: 'Sedang dibangun' },
  rencana: { label: 'Harus ada', ikon: '', kelas: 'ph-rencana', ket: 'Direncanakan, belum dikerjakan' },
};

// Status halaman/tab yg sudah ada tapi BELUM "siap". Key: pageId atau "pageId.tabId".
// Kosongkan saja kalau semua sudah siap.
export const STATUS_KHUSUS = {
};

// Entri Hak Akses yg sebenarnya izin tombol, bukan tab -- tidak ditampilkan di peta.
export const BUKAN_TAB = ['siswa.manual', 'siswa.excel'];

// Halaman BARU yg belum ada di aplikasi. `setelah` = disisipkan sesudah pageId itu.
export const HALAMAN_RENCANA = [];

// Tab BARU di halaman yg sudah ada. Key: pageId.
export const TAB_RENCANA = {
  nilai: [{ id: 'tp', label: 'Nilai per Tujuan Pembelajaran', status: 'rencana' }],
  'rapor-sd': [{ id: 'tp', label: 'Ketercapaian TP per Anak', status: 'rencana' }],
};

// Catatan perbaikan/fitur yg menempel ke halaman tertentu (bukan halaman/tab baru).
export const CATATAN = {
  presensi: [{ status: 'rencana', teks: 'Guru hanya bisa memilih kelas yang dia pegang / ajar' }],
  nilai: [{ status: 'rencana', teks: 'Guru mapel hanya bisa input nilai mapel & kelas yang dia ajar (dari Jadwal)' }],
  'penilaian-paud': [{ status: 'rencana', teks: 'Guru hanya bisa menilai anak di kelasnya sendiri' }],
};
