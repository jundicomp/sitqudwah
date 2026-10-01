import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import pkg from '../../../package.json';
import { APP_NAME } from '../../config/appInfo';

const Arrow = () => (
  <svg className="nav-group-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></svg>
);

// __BUILD_TIME__ ditanam Vite saat "npm run build" dijalankan (lihat vite.config.js) --
// bukan variabel biasa, jadi TIDAK BOLEH dihapus meski terlihat "undefined" di editor.
function formatWaktuBuild(isoString) {
  try {
    const d = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return formatter.format(d) + ' WIB';
  } catch {
    return '-';
  }
}

function NavGroup({ id, label, children, sub, open, onToggle }) {
  return (
    <div className={`nav-group ${sub ? 'nav-subgroup' : ''} ${open ? 'open' : ''}`}>
      <div className="nav-group-header" onClick={() => onToggle(id)}>
        <span>{label}</span>
        <Arrow />
      </div>
      <div className="nav-group-items">{children}</div>
    </div>
  );
}

function Item({ to, children, canAccess }) {
  if (canAccess === false) return null;
  return (
    <NavLink to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
      {children}
    </NavLink>
  );
}

export default function Sidebar() {
  const { canAccess } = useAuth();
  const { profilSekolah } = useAppData();
  const [openGroups, setOpenGroups] = useState({ spp: true, keuangan: true });
  const toggle = (id) => setOpenGroups(g => ({ ...g, [id]: !g[id] }));

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        {profilSekolah?.logo ? (
          <img src={profilSekolah.logo} alt="Logo Sekolah" width="38" height="38" style={{ objectFit: 'contain', borderRadius: 8 }} />
        ) : (
          <svg width="38" height="38" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="21" fill="#1C7A3C" />
            <text x="24" y="25" textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="800" fill="#F0B429">SQ</text>
          </svg>
        )}
        <div>
          <div className="brand-name">{profilSekolah?.nama || APP_NAME}</div>
          <div className="brand-sub">{APP_NAME}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Item to="/dashboard" canAccess={canAccess('dashboard')}>Dashboard</Item>

        <NavGroup id="spp" label="🎓 SPP" open={openGroups.spp} onToggle={toggle}>
          <Item to="/dashboard-spp" canAccess={canAccess('dashboard-spp')}>Dashboard SPP</Item>
          <Item to="/pembayaran" canAccess={canAccess('pembayaran')}>Pembayaran</Item>
        </NavGroup>

        <NavGroup id="keuangan" label="💰 KEUANGAN" open={openGroups.keuangan} onToggle={toggle}>
          <Item to="/tagihan" canAccess={canAccess('tagihan')}>Tagihan &amp; Biaya</Item>
          <Item to="/bersihkan-duplikat" canAccess={canAccess('bersihkan-duplikat')}>Cek Data dan Sistem</Item>
          <Item to="/pemasukan-pengeluaran" canAccess={canAccess('pemasukan-pengeluaran')}>Pemasukan &amp; Pengeluaran Lain</Item>
          <Item to="/tunggakan" canAccess={canAccess('tunggakan')}>Rekap Tunggakan</Item>
          <Item to="/beasiswa" canAccess={canAccess('beasiswa')}>Beasiswa</Item>
          <Item to="/laporan-keuangan" canAccess={canAccess('laporan-keuangan')}>Laporan Keuangan</Item>
        </NavGroup>

        <NavGroup id="akademik" label="📘 AKADEMIK" open={openGroups.akademik} onToggle={toggle}>
          <Item to="/jadwal" canAccess={canAccess('jadwal')}>Jadwal Pelajaran</Item>
          <Item to="/kalender" canAccess={canAccess('kalender')}>Kalender Akademik</Item>
          <Item to="/kkm" canAccess={canAccess('kkm')}>Kurikulum &amp; KKM</Item>
          <Item to="/presensi" canAccess={canAccess('presensi')}>Presensi Siswa</Item>
          <Item to="/nilai" canAccess={canAccess('nilai')}>Nilai Akademik</Item>
          <Item to="/rapor" canAccess={canAccess('rapor')}>Rapor Digital</Item>
          <Item to="/bank-soal" canAccess={canAccess('bank-soal')}>Bank Soal &amp; Ujian</Item>
        </NavGroup>

        <NavGroup id="kepegawaian" label="👩‍🏫 KEPEGAWAIAN" open={openGroups.kepegawaian} onToggle={toggle}>
          <Item to="/jadwal-mengajar" canAccess={canAccess('jadwal-mengajar')}>Jadwal Mengajar</Item>
          <Item to="/presensi-guru" canAccess={canAccess('presensi-guru')}>Presensi Guru &amp; Staff</Item>
          <Item to="/kinerja" canAccess={canAccess('kinerja')}>Penilaian Kinerja</Item>
          <Item to="/pelatihan" canAccess={canAccess('pelatihan')}>Pelatihan &amp; Sertifikasi</Item>
        </NavGroup>

        <NavGroup id="presensi-barcode" label="📷 PRESENSI BARCODE" open={openGroups['presensi-barcode']} onToggle={toggle}>
          <Item to="/scan-presensi" canAccess={canAccess('scan-presensi')}>Scan Presensi</Item>
          <Item to="/dashboard-presensi" canAccess={canAccess('dashboard-presensi')}>Dashboard Rekapitulasi</Item>
          <Item to="/laporan-presensi" canAccess={canAccess('laporan-presensi')}>Laporan Presensi</Item>
          <Item to="/id-card" canAccess={canAccess('id-card')}>Barcode &amp; ID Card</Item>
          <Item to="/pengaturan-presensi" canAccess={canAccess('pengaturan-presensi')}>Pengaturan Presensi</Item>
        </NavGroup>

        <NavGroup id="kesiswaan" label="🎒 KESISWAAN" open={openGroups.kesiswaan} onToggle={toggle}>
          <Item to="/perkembangan" canAccess={canAccess('perkembangan')}>Catatan Perkembangan</Item>
          <Item to="/prestasi" canAccess={canAccess('prestasi')}>Prestasi &amp; Penghargaan</Item>
          <Item to="/pelanggaran" canAccess={canAccess('pelanggaran')}>Pelanggaran &amp; Konseling</Item>
          <Item to="/mutasi" canAccess={canAccess('mutasi')}>Mutasi Siswa</Item>
          <Item to="/laporan-siswa" canAccess={canAccess('laporan-siswa')}>Laporan Siswa</Item>
        </NavGroup>

        <NavGroup id="komunikasi" label="💬 KOMUNIKASI" open={openGroups.komunikasi} onToggle={toggle}>
          <Item to="/pengumuman" canAccess={canAccess('pengumuman')}>Pengumuman</Item>
          <Item to="/surat" canAccess={canAccess('surat')}>Surat Menyurat</Item>
        </NavGroup>

        <NavGroup id="perpustakaan" label="📚 PERPUSTAKAAN" open={openGroups.perpustakaan} onToggle={toggle}>
          <Item to="/sirkulasi" canAccess={canAccess('sirkulasi')}>Sirkulasi</Item>
          <Item to="/katalog-buku" canAccess={canAccess('katalog-buku')}>Katalog Buku</Item>
          <Item to="/reservasi-buku" canAccess={canAccess('reservasi-buku')}>Reservasi Buku</Item>
          <Item to="/denda-perpus" canAccess={canAccess('denda-perpus')}>Denda &amp; Keterlambatan</Item>
          <Item to="/laporan-perpus" canAccess={canAccess('laporan-perpus')}>Laporan Sirkulasi</Item>
        </NavGroup>

        <NavGroup id="laporan-grafik" label="📊 LAPORAN &amp; GRAFIK" open={openGroups['laporan-grafik']} onToggle={toggle}>
          <Item to="/grafik-nilai" canAccess={canAccess('grafik-nilai')}>Grafik Nilai &amp; Tren</Item>
          <Item to="/grafik-absensi" canAccess={canAccess('grafik-absensi')}>Grafik Absensi</Item>
          <Item to="/grafik-keuangan" canAccess={canAccess('grafik-keuangan')}>Grafik Keuangan</Item>
          <Item to="/export-laporan" canAccess={canAccess('export-laporan')}>Pusat Export Laporan</Item>
        </NavGroup>

        <NavGroup id="sarpras" label="🏫 SARPRAS" open={openGroups.sarpras} onToggle={toggle}>
          <Item to="/aset" canAccess={canAccess('aset')}>Data Aset &amp; Inventaris</Item>
          <Item to="/peminjaman-aset" canAccess={canAccess('peminjaman-aset')}>Peminjaman Aset</Item>
          <Item to="/pemeliharaan-aset" canAccess={canAccess('pemeliharaan-aset')}>Pemeliharaan Aset</Item>
          <Item to="/aset-laporan" canAccess={canAccess('laporan-rekap-aset')}>Laporan Rekap Aset</Item>
        </NavGroup>

        <NavGroup id="pengaturan" label="⚙️ PENGATURAN" open={openGroups.pengaturan} onToggle={toggle}>
          <NavGroup id="pgt-user" label="👤 USER" sub open={openGroups['pgt-user']} onToggle={toggle}>
            <Item to="/manajemen-user" canAccess={canAccess('manajemen-user')}>Manajemen User</Item>
            <Item to="/hakakses" canAccess={canAccess('hakakses')}>Manajemen Hak Akses</Item>
          </NavGroup>
          <NavGroup id="pgt-modul" label="🧩 MODUL" sub open={openGroups['pgt-modul']} onToggle={toggle}>
            <Item to="/profil" canAccess={canAccess('profil')}>Profil Sekolah &amp; Tahun Ajaran</Item>
            <Item to="/kelas" canAccess={canAccess('kelas')}>Data Kelas &amp; Rombel</Item>
            <Item to="/guru" canAccess={canAccess('guru')}>Data Guru &amp; Staff</Item>
            <Item to="/siswa" canAccess={canAccess('siswa')}>Data Siswa</Item>
          </NavGroup>
          <NavGroup id="pgt-system" label="🖥️ SYSTEM" sub open={openGroups['pgt-system']} onToggle={toggle}>
            <Item to="/koneksi-sheets" canAccess={canAccess('koneksi-sheets')}>Pengaturan Koneksi</Item>
            <Item to="/pengaturan-sistem" canAccess={canAccess('pengaturan-sistem')}>Pengaturan Sistem</Item>
            <Item to="/log-histori" canAccess={canAccess('log-histori')}>Log Histori</Item>
            <Item to="/backup" canAccess={canAccess('backup')}>Backup &amp; Restore</Item>
          </NavGroup>
        </NavGroup>
      </nav>

      <div className="sidebar-foot">
        Jundicomp © 2026
        <div style={{ fontSize: 10.5, opacity: .7, marginTop: 3 }}>
          {canAccess('changelog') ? (
            <NavLink to="/changelog" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }} title="Lihat riwayat pembaruan aplikasi">
              v{pkg.version}
            </NavLink>
          ) : (
            <span>v{pkg.version}</span>
          )} · {formatWaktuBuild(typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null)}
        </div>
      </div>
    </aside>
  );
}
