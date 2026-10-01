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
    ],
  },
  {
    id: 'akademik', type: 'group', label: 'Akademik', groupLabel: '📘 AKADEMIK', icon: '📘',
    items: [
      { to: '/jadwal', pageId: 'jadwal', label: 'Jadwal Pelajaran' },
      { to: '/kalender', pageId: 'kalender', label: 'Kalender Akademik' },
      { to: '/kkm', pageId: 'kkm', label: 'Kurikulum & KKM' },
      { to: '/presensi', pageId: 'presensi', label: 'Presensi Siswa' },
      { to: '/nilai', pageId: 'nilai', label: 'Nilai Akademik' },
      { to: '/rapor', pageId: 'rapor', label: 'Rapor Digital' },
      { to: '/bank-soal', pageId: 'bank-soal', label: 'Bank Soal & Ujian' },
    ],
  },
  {
    id: 'kepegawaian', type: 'group', label: 'Kepegawaian', mobileLabel: 'Guru', groupLabel: '👩‍🏫 KEPEGAWAIAN', icon: '👩‍🏫',
    items: [
      { to: '/jadwal-mengajar', pageId: 'jadwal-mengajar', label: 'Jadwal Mengajar' },
      { to: '/presensi-guru', pageId: 'presensi-guru', label: 'Presensi Guru & Staff' },
      { to: '/kinerja', pageId: 'kinerja', label: 'Penilaian Kinerja' },
      { to: '/pelatihan', pageId: 'pelatihan', label: 'Pelatihan & Sertifikasi' },
    ],
  },
  {
    id: 'presensi-barcode', type: 'group', label: 'Presensi Barcode', mobileLabel: 'Scan', groupLabel: '📷 PRESENSI BARCODE', icon: '📷',
    items: [
      { to: '/scan-presensi', pageId: 'scan-presensi', label: 'Scan Presensi' },
      { to: '/dashboard-presensi', pageId: 'dashboard-presensi', label: 'Dashboard Rekapitulasi' },
      { to: '/laporan-presensi', pageId: 'laporan-presensi', label: 'Laporan Presensi' },
      { to: '/id-card', pageId: 'id-card', label: 'Barcode & ID Card' },
      { to: '/pengaturan-presensi', pageId: 'pengaturan-presensi', label: 'Pengaturan Presensi' },
    ],
  },
  {
    id: 'kesiswaan', type: 'group', label: 'Kesiswaan', mobileLabel: 'Siswa', groupLabel: '🎒 KESISWAAN', icon: '🎒',
    items: [
      { to: '/perkembangan', pageId: 'perkembangan', label: 'Catatan Perkembangan' },
      { to: '/prestasi', pageId: 'prestasi', label: 'Prestasi & Penghargaan' },
      { to: '/pelanggaran', pageId: 'pelanggaran', label: 'Pelanggaran & Konseling' },
      { to: '/mutasi', pageId: 'mutasi', label: 'Mutasi Siswa' },
      { to: '/laporan-siswa', pageId: 'laporan-siswa', label: 'Laporan Siswa' },
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
        id: 'pgt-modul', label: 'Modul', groupLabel: '🧩 MODUL',
        items: [
          { to: '/profil', pageId: 'profil', label: 'Profil Sekolah & Tahun Ajaran' },
          { to: '/kelas', pageId: 'kelas', label: 'Data Kelas & Rombel' },
          { to: '/guru', pageId: 'guru', label: 'Data Guru & Staff' },
          { to: '/siswa', pageId: 'siswa', label: 'Data Siswa' },
        ],
      },
      {
        id: 'pgt-system', label: 'System', groupLabel: '🖥️ SYSTEM',
        items: [
          { to: '/koneksi-sheets', pageId: 'koneksi-sheets', label: 'Pengaturan Koneksi' },
          { to: '/pengaturan-sistem', pageId: 'pengaturan-sistem', label: 'Pengaturan Sistem' },
          { to: '/log-histori', pageId: 'log-histori', label: 'Log Histori' },
          { to: '/backup', pageId: 'backup', label: 'Backup & Restore' },
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
