// Sumber tunggal struktur menu untuk navigasi Tablet (icon-rail) dan Mobile
// (bottom-nav). Sidebar desktop TIDAK memakai file ini (sengaja dibiarkan
// seperti semula supaya tidak ada risiko regresi pada menu yang sudah
// berjalan baik) -- tapi struktur & pageId di bawah harus tetap disamakan
// persis dengan src/components/layout/Sidebar.jsx setiap kali menu berubah.

export const NAV_STRUCTURE = [
  { id: 'dashboard', type: 'link', to: '/dashboard', pageId: 'dashboard', label: 'Dashboard', icon: '🏠' },
  {
    id: 'spp', type: 'group', label: 'SPP', groupLabel: '🎓 SPP', icon: '🎓',
    items: [
      { to: '/dashboard-spp', pageId: 'dashboard-spp', label: 'Dashboard SPP' },
      { to: '/pembayaran', pageId: 'pembayaran', label: 'Pembayaran' },
    ],
  },
  {
    id: 'keuangan', type: 'group', label: 'Keuangan', groupLabel: '💰 KEUANGAN', icon: '💰',
    items: [
      { to: '/tagihan', pageId: 'tagihan', label: 'Tagihan & Biaya' },
      { to: '/bersihkan-duplikat', pageId: 'bersihkan-duplikat', label: 'Cek Data dan Sistem' },
      { to: '/pemasukan-pengeluaran', pageId: 'pemasukan-pengeluaran', label: 'Pemasukan & Pengeluaran Lain' },
      { to: '/tunggakan', pageId: 'tunggakan', label: 'Rekap Tunggakan' },
      { to: '/beasiswa', pageId: 'beasiswa', label: 'Beasiswa' },
      { to: '/laporan-keuangan', pageId: 'laporan-keuangan', label: 'Laporan Keuangan' },
      { to: '/pengaturan-keuangan', pageId: 'pengaturan-keuangan', label: 'Pengaturan Keuangan' },
    ],
  },
  {
    id: 'akademik', type: 'group', label: 'Akademik', groupLabel: '📘 AKADEMIK', icon: '📘',
    items: [
      { to: '/kelas', pageId: 'kelas', label: 'Data Kelas & Rombel' },
      { to: '/jadwal', pageId: 'jadwal', label: 'Jadwal Pelajaran' },
      { to: '/kalender', pageId: 'kalender', label: 'Kalender Akademik' },
      { to: '/kkm', pageId: 'kkm', label: 'Kurikulum & KKM' },
      { to: '/modul-ajar', pageId: 'modul-ajar', label: 'Modul Ajar' },
      { to: '/nilai', pageId: 'nilai', label: 'Nilai Akademik' },
      { to: '/penilaian-paud', pageId: 'penilaian-paud', label: 'Penilaian PAUD' },
      { to: '/rapor-paud', pageId: 'rapor-paud', label: 'Rapor Digital PAUD' },
      { to: '/rapor-sd', pageId: 'rapor-sd', label: 'Rapor Digital SD' },
      { to: '/bank-soal', pageId: 'bank-soal', label: 'Bank Soal & Ujian' },
    ],
  },
  // v1.64.0: 2 modul besar. Semua yg menyangkut SISWA di satu grup, begitu juga GURU & STAFF
  // (dulu tersebar di Kesiswaan, Kepegawaian, Presensi Barcode & Pengaturan › Modul).
  {
    id: 'siswa', type: 'group', label: 'Siswa', mobileLabel: 'Siswa', groupLabel: '🎒 SISWA', icon: '🎒',
    subgroups: [
      {
        id: 'sw-data', label: 'Data', groupLabel: '📋 DATA',
        items: [
          { to: '/siswa', pageId: 'siswa', label: 'Data Siswa' },
          { to: '/mutasi', pageId: 'mutasi', label: 'Mutasi Siswa' },
        ],
      },
      {
        id: 'sw-presensi', label: 'Presensi', groupLabel: '📷 PRESENSI',
        items: [
          { to: '/presensi', pageId: 'presensi', label: 'Presensi Harian' },
          { to: '/scan-presensi-siswa', pageId: 'scan-presensi-siswa', label: 'Scan Presensi' },
          { to: '/dashboard-presensi-siswa', pageId: 'dashboard-presensi-siswa', label: 'Dashboard Presensi' },
          { to: '/laporan-presensi-siswa', pageId: 'laporan-presensi-siswa', label: 'Laporan Presensi' },
          { to: '/id-card-siswa', pageId: 'id-card-siswa', label: 'Kartu Pelajar & Barcode' },
          { to: '/pengaturan-presensi-siswa', pageId: 'pengaturan-presensi-siswa', label: 'Pengaturan Jam' },
        ],
      },
      {
        id: 'sw-pembinaan', label: 'Pembinaan', groupLabel: '🌱 PEMBINAAN',
        items: [
          { to: '/perkembangan', pageId: 'perkembangan', label: 'Catatan Perkembangan' },
          { to: '/prestasi', pageId: 'prestasi', label: 'Prestasi & Penghargaan' },
          { to: '/pelanggaran', pageId: 'pelanggaran', label: 'Pelanggaran & Konseling' },
          { to: '/laporan-siswa', pageId: 'laporan-siswa', label: 'Laporan Siswa' },
        ],
      },
    ],
  },
  {
    id: 'guru-staff', type: 'group', label: 'Guru & Staff', mobileLabel: 'Guru', groupLabel: '👩‍🏫 GURU & STAFF', icon: '👩‍🏫',
    subgroups: [
      {
        id: 'gs-data', label: 'Data', groupLabel: '📋 DATA',
        items: [
          { to: '/guru', pageId: 'guru', label: 'Data Guru & Staff' },
          { to: '/jadwal-mengajar', pageId: 'jadwal-mengajar', label: 'Jadwal Mengajar' },
        ],
      },
      {
        id: 'gs-presensi', label: 'Presensi', groupLabel: '📷 PRESENSI',
        items: [
          { to: '/presensi-guru', pageId: 'presensi-guru', label: 'Presensi Harian' },
          { to: '/scan-presensi-guru', pageId: 'scan-presensi-guru', label: 'Scan Presensi' },
          { to: '/dashboard-presensi-guru', pageId: 'dashboard-presensi-guru', label: 'Dashboard Presensi' },
          { to: '/laporan-presensi-guru', pageId: 'laporan-presensi-guru', label: 'Laporan Presensi' },
          { to: '/id-card-guru', pageId: 'id-card-guru', label: 'ID Card & Barcode' },
          { to: '/pengaturan-presensi-guru', pageId: 'pengaturan-presensi-guru', label: 'Pengaturan Jam & Denda' },
        ],
      },
      {
        id: 'gs-pengembangan', label: 'Pengembangan', groupLabel: '📈 PENGEMBANGAN',
        items: [
          { to: '/kinerja', pageId: 'kinerja', label: 'Penilaian Kinerja' },
          { to: '/pelatihan', pageId: 'pelatihan', label: 'Pelatihan & Sertifikasi' },
        ],
      },
    ],
  },
  {
    id: 'komunikasi', type: 'group', label: 'Komunikasi', mobileLabel: 'Info', groupLabel: '💬 KOMUNIKASI', icon: '💬',
    items: [
      { to: '/pengumuman', pageId: 'pengumuman', label: 'Pengumuman' },
      { to: '/surat', pageId: 'surat', label: 'Surat Menyurat' },
    ],
  },
  {
    id: 'perpustakaan', type: 'group', label: 'Perpustakaan', mobileLabel: 'Perpus', groupLabel: '📚 PERPUSTAKAAN', icon: '📚',
    items: [
      { to: '/sirkulasi', pageId: 'sirkulasi', label: 'Sirkulasi' },
      { to: '/katalog-buku', pageId: 'katalog-buku', label: 'Katalog Buku' },
      { to: '/reservasi-buku', pageId: 'reservasi-buku', label: 'Reservasi Buku' },
      { to: '/denda-perpus', pageId: 'denda-perpus', label: 'Denda & Keterlambatan' },
      { to: '/laporan-perpus', pageId: 'laporan-perpus', label: 'Laporan Sirkulasi' },
    ],
  },
  {
    id: 'laporan-grafik', type: 'group', label: 'Laporan & Grafik', mobileLabel: 'Grafik', groupLabel: '📊 LAPORAN & GRAFIK', icon: '📊',
    items: [
      { to: '/grafik-nilai', pageId: 'grafik-nilai', label: 'Grafik Nilai & Tren' },
      { to: '/grafik-absensi', pageId: 'grafik-absensi', label: 'Grafik Absensi' },
      { to: '/grafik-keuangan', pageId: 'grafik-keuangan', label: 'Grafik Keuangan' },
      { to: '/export-laporan', pageId: 'export-laporan', label: 'Pusat Export Laporan' },
    ],
  },
  {
    id: 'sarpras', type: 'group', label: 'Sarpras', groupLabel: '🏫 SARPRAS', icon: '🏫',
    items: [
      { to: '/aset', pageId: 'aset', label: 'Data Aset & Inventaris' },
      { to: '/peminjaman-aset', pageId: 'peminjaman-aset', label: 'Peminjaman Aset' },
      { to: '/pemeliharaan-aset', pageId: 'pemeliharaan-aset', label: 'Pemeliharaan Aset' },
      { to: '/aset-laporan', pageId: 'laporan-rekap-aset', label: 'Laporan Rekap Aset' },
    ],
  },
  {
    id: 'pengaturan', type: 'group', label: 'Pengaturan', mobileLabel: 'Atur', groupLabel: '⚙️ PENGATURAN', icon: '⚙️',
    subgroups: [
      {
        id: 'pgt-user', label: 'User', groupLabel: '👤 USER',
        items: [
          { to: '/manajemen-user', pageId: 'manajemen-user', label: 'Manajemen User' },
          { to: '/hakakses', pageId: 'hakakses', label: 'Manajemen Hak Akses' },
        ],
      },
      {
        id: 'pgt-sekolah', label: 'Sekolah', groupLabel: '🏫 SEKOLAH',
        items: [
          { to: '/profil', pageId: 'profil', label: 'Profil Sekolah & Tahun Ajaran' },
        ],
      },
      {
        id: 'pgt-system', label: 'System', groupLabel: '🖥️ SYSTEM',
        items: [
          { to: '/koneksi-sheets', pageId: 'koneksi-sheets', label: 'Pengaturan Koneksi' },
          { to: '/pengaturan-sistem', pageId: 'pengaturan-sistem', label: 'Pengaturan Sistem' },
          { to: '/log-histori', pageId: 'log-histori', label: 'Log Histori' },
          { to: '/backup', pageId: 'backup', label: 'Backup & Restore' },
          { to: '/peta-halaman', pageId: 'peta-halaman', label: 'Peta Halaman' },
        ],
      },
    ],
  },
];

// Apakah user punya akses ke setidaknya 1 halaman di dalam node ini (dipakai
// untuk sembunyikan icon/tombol grup yang seluruh isinya tidak bisa diakses).
export function groupHasAccess(node, canAccess) {
  if (node.type === 'link') return canAccess(node.pageId);
  if (node.items) return node.items.some((it) => canAccess(it.pageId));
  if (node.subgroups) return node.subgroups.some((sg) => sg.items.some((it) => canAccess(it.pageId)));
  return false;
}
