import BrandingHead from './components/common/BrandingHead';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import DashboardSpp from './pages/spp/DashboardSpp';
import Pembayaran from './pages/spp/Pembayaran';
import DataSiswaSheets from './pages/pengaturan/DataSiswaSheets';
import DataKelas from './pages/pengaturan/DataKelas';
import DataGuru from './pages/pengaturan/DataGuru';
import ProfilSekolahDanTahunAjaran from './pages/pengaturan/ProfilSekolahDanTahunAjaran';
import ManajemenUser from './pages/pengaturan/ManajemenUser';
import ManajemenHakAkses from './pages/pengaturan/ManajemenHakAkses';
import KoneksiSheets from './pages/pengaturan/KoneksiSheets';
import PengaturanSistem from './pages/pengaturan/PengaturanSistem';
import LogHistori from './pages/pengaturan/LogHistori';
import ProfilSaya from './pages/pengaturan/ProfilSaya';
import ChangelogPage from './pages/pengaturan/ChangelogPage';
import TagihanBiaya from './pages/keuangan/TagihanBiaya';
import CekDataSistem from './pages/keuangan/CekDataSistem';
import PemasukanPengeluaran from './pages/keuangan/PemasukanPengeluaran';
import BeasiswaPage from './pages/keuangan/BeasiswaPage';
import RekapTunggakan from './pages/keuangan/RekapTunggakan';
import LaporanKeuangan from './pages/keuangan/LaporanKeuangan';
import DataAset from './pages/sarpras/DataAset';
import PeminjamanAset from './pages/sarpras/PeminjamanAset';
import PemeliharaanAset from './pages/sarpras/PemeliharaanAset';
import LaporanRekapAset from './pages/sarpras/LaporanRekapAset';
import JadwalPelajaran from './pages/akademik/JadwalPelajaran';
import PresensiSiswa from './pages/akademik/PresensiSiswa';
import NilaiAkademik from './pages/akademik/NilaiAkademik';
import Prestasi from './pages/kesiswaan/Prestasi';
import Pelanggaran from './pages/kesiswaan/Pelanggaran';
import LaporanSiswa from './pages/kesiswaan/LaporanSiswa';
import Pengumuman from './pages/komunikasi/Pengumuman';
import SuratMenyurat from './pages/komunikasi/SuratMenyurat';
import MutasiSiswa from './pages/kesiswaan/MutasiSiswa';
import BackupRestore from './pages/pengaturan/BackupRestore';
import KatalogBuku from './pages/perpustakaan/KatalogBuku';
import Sirkulasi from './pages/perpustakaan/Sirkulasi';
import DendaPerpus from './pages/perpustakaan/DendaPerpus';
import ReservasiBuku from './pages/perpustakaan/ReservasiBuku';
import LaporanPerpus from './pages/perpustakaan/LaporanPerpus';
import GrafikNilai from './pages/laporan/GrafikNilai';
import GrafikAbsensi from './pages/laporan/GrafikAbsensi';
import GrafikKeuangan from './pages/laporan/GrafikKeuangan';
import ExportLaporan from './pages/laporan/ExportLaporan';
import ScanPresensi from './pages/presensiBarcode/ScanPresensi';
import DashboardPresensi from './pages/presensiBarcode/DashboardPresensi';
import LaporanPresensi from './pages/presensiBarcode/LaporanPresensi';
import IdCard from './pages/presensiBarcode/IdCard';
import PengaturanPresensi from './pages/presensiBarcode/PengaturanPresensi';
import JadwalMengajar from './pages/kepegawaian/JadwalMengajar';
import PresensiGuru from './pages/kepegawaian/PresensiGuru';
import PenilaianKinerja from './pages/kepegawaian/PenilaianKinerja';
import PelatihanSertifikasi from './pages/kepegawaian/PelatihanSertifikasi';
import KalenderAkademik from './pages/akademik/KalenderAkademik';
import KurikulumKkm from './pages/akademik/KurikulumKkm';
import RaporDigital from './pages/akademik/RaporDigital';
import BankSoalUjian from './pages/akademik/BankSoalUjian';
import ComingSoon from './pages/ComingSoon';

const PLACEHOLDER_PAGES = [];

function Gate() {
  const { currentUser } = useAuth();
  if (!currentUser) return <LoginScreen />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-spp" element={<DashboardSpp />} />
        <Route path="/spp" element={<Navigate to="/pembayaran" replace />} />
        <Route path="/siswa" element={<DataSiswaSheets />} />
        <Route path="/kelas" element={<DataKelas />} />
        <Route path="/guru" element={<DataGuru />} />
        <Route path="/profil" element={<ProfilSekolahDanTahunAjaran />} />
        <Route path="/manajemen-user" element={<ManajemenUser />} />
        <Route path="/hakakses" element={<ManajemenHakAkses />} />
        <Route path="/koneksi-sheets" element={<KoneksiSheets />} />
        <Route path="/pengaturan-sistem" element={<PengaturanSistem />} />
        <Route path="/log-histori" element={<LogHistori />} />
        <Route path="/profil-saya" element={<ProfilSaya />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/tagihan" element={<TagihanBiaya />} />
        <Route path="/bersihkan-duplikat" element={<CekDataSistem />} />
        <Route path="/pembayaran" element={<Pembayaran />} />
        <Route path="/pemasukan-pengeluaran" element={<PemasukanPengeluaran />} />
        <Route path="/beasiswa" element={<BeasiswaPage />} />
        <Route path="/tunggakan" element={<RekapTunggakan />} />
        <Route path="/laporan-keuangan" element={<LaporanKeuangan />} />
        <Route path="/jadwal" element={<JadwalPelajaran />} />
        <Route path="/presensi" element={<PresensiSiswa />} />
        <Route path="/nilai" element={<NilaiAkademik />} />
        <Route path="/kalender" element={<KalenderAkademik />} />
        <Route path="/kkm" element={<KurikulumKkm />} />
        <Route path="/rapor" element={<RaporDigital />} />
        <Route path="/bank-soal" element={<BankSoalUjian />} />
        <Route path="/pengumuman" element={<Pengumuman />} />
        <Route path="/surat" element={<SuratMenyurat />} />
        <Route path="/mutasi" element={<MutasiSiswa />} />
        <Route path="/backup" element={<BackupRestore />} />
        <Route path="/katalog-buku" element={<KatalogBuku />} />
        <Route path="/sirkulasi" element={<Sirkulasi />} />
        <Route path="/denda-perpus" element={<DendaPerpus />} />
        <Route path="/reservasi-buku" element={<ReservasiBuku />} />
        <Route path="/laporan-perpus" element={<LaporanPerpus />} />
        <Route path="/grafik-nilai" element={<GrafikNilai />} />
        <Route path="/grafik-absensi" element={<GrafikAbsensi />} />
        <Route path="/grafik-keuangan" element={<GrafikKeuangan />} />
        <Route path="/export-laporan" element={<ExportLaporan />} />
        <Route path="/scan-presensi" element={<ScanPresensi />} />
        <Route path="/dashboard-presensi" element={<DashboardPresensi />} />
        <Route path="/laporan-presensi" element={<LaporanPresensi />} />
        <Route path="/id-card" element={<IdCard />} />
        <Route path="/pengaturan-presensi" element={<PengaturanPresensi />} />
        <Route path="/jadwal-mengajar" element={<JadwalMengajar />} />
        <Route path="/presensi-guru" element={<PresensiGuru />} />
        <Route path="/kinerja" element={<PenilaianKinerja />} />
        <Route path="/pelatihan" element={<PelatihanSertifikasi />} />
        <Route path="/prestasi" element={<Prestasi />} />
        <Route path="/pelanggaran" element={<Pelanggaran />} />
        <Route path="/laporan-siswa" element={<LaporanSiswa />} />
        <Route path="/aset" element={<DataAset />} />
        <Route path="/peminjaman-aset" element={<PeminjamanAset />} />
        <Route path="/pemeliharaan-aset" element={<PemeliharaanAset />} />
        <Route path="/aset-laporan" element={<LaporanRekapAset />} />
        {PLACEHOLDER_PAGES.map(p => (
          <Route key={p.path} path={p.path} element={<ComingSoon pageId={p.pageId} title={p.title} path={p.menu} />} />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <BrandingHead />
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </AppProvider>
    </HashRouter>
  );
}
