// v1.62.0: Presensi Barcode dipecah jadi 2 sub-modul yg berdiri sendiri: SISWA & GURU-STAFF.
// Tiap halaman punya pageId sendiri (hak akses bisa diatur terpisah), rutenya = '/' + pageId.
export const JENIS_PRESENSI = {
  siswa: { label: 'Siswa', judul: 'Presensi Siswa' },
  guru: { label: 'Guru & Staff', judul: 'Presensi Guru & Staff' },
};
export const HALAMAN_PRESENSI = [
  { id: 'scan-presensi', label: 'Scan Presensi' },
  { id: 'dashboard-presensi', label: 'Dashboard Rekapitulasi' },
  { id: 'laporan-presensi', label: 'Laporan Presensi' },
  { id: 'id-card', label: 'Barcode & ID Card' },
  { id: 'pengaturan-presensi', label: 'Pengaturan Jam' },
];
export const pageIdPresensi = (halaman, jenis) => `${halaman}-${jenis}`;
export const rutePresensi = (halaman, jenis) => `/${pageIdPresensi(halaman, jenis)}`;
export const pathPresensi = (jenis, label) => `Presensi Barcode / ${JENIS_PRESENSI[jenis].label} / ${label}`;
