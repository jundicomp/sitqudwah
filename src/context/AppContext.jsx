import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { permissionRoles, halamanSensitif } from '../db/seed';
import { normalizeSheetSiswa } from '../db/siswaFields';
import { normalizeSheetKelas } from '../db/kelasFields';
import { normalizeSheetGuru } from '../db/guruFields';
import { normalizeSheetAset } from '../db/asetFields';
import { normalizeSheetTahunAjaran } from '../db/tahunAjaranFields';
import { normalizeSheetProfil } from '../db/profilFields';
import { normalizeSheetTarif } from '../db/tarifFields';
import { normalizeSheetTagihanSpp, normalizeSheetTagihanLain, hitungTerbayar } from '../db/tagihanHelpers';
import { normalizeSheetPembayaran } from '../db/pembayaranFields';
import { normalizeSheetPengeluaran } from '../db/pengeluaranFields';
import { normalizeSheetPemasukanLain } from '../db/pemasukanLainFields';
import { normalizeSheetAkun } from '../db/akunBukuBesarFields';
import { normalizeSheetBeasiswaKategori, normalizeSheetBeasiswaSiswa } from '../db/beasiswaFields';
import { normalizeSheetRiwayatAkademik } from '../db/riwayatAkademikFields';
import { normalizeSheetJadwal, normalizeSheetPresensi, normalizeSheetNilai, normalizeSheetPrestasi, normalizeSheetPelanggaran } from '../db/akademikFields';
import { normalizeSheetPresensiGuru, normalizeSheetKinerja, normalizeSheetPelatihan } from '../db/kepegawaianFields';
import { normalizeSheetAkreditasi, normalizeSheetSemester, normalizeSheetMutasi, normalizeSheetPengumuman, normalizeSheetSurat, setPeriodeSemester } from '../db/komunikasiFields';
import { normalizeSheetBuku, normalizeSheetSirkulasi, normalizeSheetDendaPerpus, normalizeSheetReservasi } from '../db/perpusFields';
import { normalizeSheetKkm, normalizeSheetAgenda, normalizeSheetBankSoal, normalizeSheetUjian, normalizeSheetRapor } from '../db/akademikLanjutanFields';
import {
  fetchSiswaFromSheet, fetchKelasFromSheet, fetchGuruFromSheet,
  fetchTahunAjaranFromSheet, fetchProfilFromSheet, fetchTarifFromSheet, fetchAsetFromSheet,
  fetchTagihanSppFromSheet, fetchTagihanLainFromSheet, fetchPembayaranFromSheet, fetchPengeluaranFromSheet, fetchPemasukanLainFromSheet, fetchAkunFromSheet,
  fetchBeasiswaKategoriFromSheet, fetchBeasiswaSiswaFromSheet, fetchRiwayatAkademikFromSheet,
  setActiveTahunAjaranOnSheet, isConfigured, fetchAllFromSheet,
  fetchRolesFromSheet, addRoleToSheet, deleteRoleFromSheet,
  fetchHakAksesFromSheet, saveHakAksesRole,
  fetchJadwalFromSheet, fetchPresensiFromSheet, fetchNilaiFromSheet, fetchPrestasiFromSheet, fetchPelanggaranFromSheet,
  fetchPresensiGuruFromSheet, fetchKinerjaFromSheet, fetchPelatihanFromSheet, fetchPengaturanPresensiFromSheet,
  akreditasiApi, semesterApi, mutasiApi, pengumumanApi, suratApi,
  fetchBukuFromSheet, fetchSirkulasiFromSheet, fetchDendaPerpusFromSheet, fetchReservasiFromSheet, fetchPengaturanPerpusFromSheet,
  fetchKkmFromSheet, fetchAgendaFromSheet, fetchBankSoalFromSheet, fetchUjianFromSheet, fetchRaporFromSheet,
} from '../services/googleSheets';
import useSheetResource from '../hooks/useSheetResource';

const AppDataContext = createContext(null);

const HAK_AKSES_PAGES = [
  { id: 'dashboard', label: 'Dashboard', grup: 'Umum' },
  { id: 'profil-saya', label: 'Profil Saya', grup: 'Umum' },
  { id: 'changelog', label: 'Riwayat Pembaruan (Changelog)', grup: 'Umum' },
  { id: 'dashboard-spp', label: 'Dashboard SPP', grup: 'SPP' },
  { id: 'pembayaran', label: 'Pembayaran', grup: 'SPP' },
  { id: 'tagihan', label: 'Tagihan & Biaya', grup: 'Keuangan' },
  { id: 'bersihkan-duplikat', label: 'Cek Data dan Sistem', grup: 'Keuangan' },
  { id: 'pemasukan-pengeluaran', label: 'Pemasukan & Pengeluaran Lain', grup: 'Keuangan' },
  { id: 'tunggakan', label: 'Rekap Tunggakan', grup: 'Keuangan' },
  { id: 'beasiswa', label: 'Beasiswa', grup: 'Keuangan' },
  { id: 'laporan-keuangan', label: 'Laporan Keuangan', grup: 'Keuangan' },
  { id: 'jadwal', label: 'Jadwal Pelajaran', grup: 'Akademik' },
  { id: 'presensi', label: 'Presensi Siswa', grup: 'Akademik' },
  { id: 'nilai', label: 'Nilai Akademik', grup: 'Akademik' },
  { id: 'kalender', label: 'Kalender Akademik', grup: 'Akademik' },
  { id: 'kkm', label: 'Kurikulum & KKM/KKTP', grup: 'Akademik' },
  { id: 'rapor', label: 'Rapor Digital', grup: 'Akademik' },
  { id: 'bank-soal', label: 'Bank Soal & Ujian', grup: 'Akademik' },
  { id: 'jadwal-mengajar', label: 'Jadwal Mengajar', grup: 'Kepegawaian' },
  { id: 'presensi-guru', label: 'Presensi Guru & Staff', grup: 'Kepegawaian' },
  { id: 'kinerja', label: 'Penilaian Kinerja', grup: 'Kepegawaian' },
  { id: 'pelatihan', label: 'Pelatihan & Sertifikasi', grup: 'Kepegawaian' },
  { id: 'scan-presensi', label: 'Scan Presensi', grup: 'Presensi Barcode' },
  { id: 'dashboard-presensi', label: 'Dashboard Rekapitulasi Presensi', grup: 'Presensi Barcode' },
  { id: 'laporan-presensi', label: 'Laporan Presensi', grup: 'Presensi Barcode' },
  { id: 'id-card', label: 'Generate Barcode & ID Card', grup: 'Presensi Barcode' },
  { id: 'pengaturan-presensi', label: 'Pengaturan Presensi', grup: 'Presensi Barcode' },
  { id: 'grafik-nilai', label: 'Grafik Nilai & Tren', grup: 'Laporan & Grafik' },
  { id: 'grafik-absensi', label: 'Grafik Absensi', grup: 'Laporan & Grafik' },
  { id: 'grafik-keuangan', label: 'Grafik Keuangan', grup: 'Laporan & Grafik' },
  { id: 'export-laporan', label: 'Pusat Export Laporan', grup: 'Laporan & Grafik' },
  { id: 'katalog-buku', label: 'Katalog Buku', grup: 'Perpustakaan' },
  { id: 'sirkulasi', label: 'Sirkulasi (Pinjam & Kembali)', grup: 'Perpustakaan' },
  { id: 'denda-perpus', label: 'Denda & Keterlambatan', grup: 'Perpustakaan' },
  { id: 'reservasi-buku', label: 'Reservasi Buku', grup: 'Perpustakaan' },
  { id: 'laporan-perpus', label: 'Laporan Sirkulasi', grup: 'Perpustakaan' },
  { id: 'pengumuman', label: 'Pengumuman', grup: 'Komunikasi' },
  { id: 'surat', label: 'Surat Menyurat', grup: 'Komunikasi' },
  { id: 'mutasi', label: 'Mutasi Siswa', grup: 'Kesiswaan' },
  { id: 'backup', label: 'Backup & Restore', grup: 'Pengaturan' },
  { id: 'prestasi', label: 'Prestasi & Penghargaan', grup: 'Kesiswaan' },
  { id: 'pelanggaran', label: 'Pelanggaran & Konseling', grup: 'Kesiswaan' },
  { id: 'laporan-siswa', label: 'Laporan Siswa', grup: 'Kesiswaan' },
  { id: 'aset', label: 'Data Aset & Inventaris', grup: 'Sarpras' },
  { id: 'peminjaman-aset', label: 'Peminjaman Aset', grup: 'Sarpras' },
  { id: 'pemeliharaan-aset', label: 'Pemeliharaan Aset', grup: 'Sarpras' },
  { id: 'laporan-rekap-aset', label: 'Laporan Rekap Aset', grup: 'Sarpras' },
  { id: 'profil', label: 'Profil Sekolah & Tahun Ajaran', grup: 'Pengaturan' },
  { id: 'kelas', label: 'Data Kelas & Rombel', grup: 'Pengaturan' },
  { id: 'guru', label: 'Data Guru & Staff', grup: 'Pengaturan' },
  { id: 'siswa', label: 'Data Siswa', grup: 'Pengaturan' },
  { id: 'manajemen-user', label: 'Manajemen User', grup: 'Pengaturan' },
  { id: 'hakakses', label: 'Manajemen Hak Akses', grup: 'Pengaturan' },
  { id: 'koneksi-sheets', label: 'Pengaturan Koneksi Google Sheets', grup: 'Pengaturan' },
  { id: 'pengaturan-sistem', label: 'Pengaturan Sistem', grup: 'Pengaturan' },
  { id: 'log-histori', label: 'Log Histori', grup: 'Pengaturan' },
];

const ADMIN_ONLY_PAGES = ['koneksi-sheets', 'pengaturan-sistem'];

// Daftar TAB di dalam tiap halaman yg punya sub-tab -- dipakai Manajemen Hak Akses
// utk atur izin sampai level tab (bukan cuma per-halaman). Halaman yg TIDAK disebut
// di sini dianggap tidak punya tab (izinnya cuma level halaman spt biasa). Key ID
// tab di sini HARUS SAMA PERSIS dgn string dipakai di setTab('...') halaman terkait.
const HAK_AKSES_TABS = {
  tagihan: [
    { id: 'penerbitan', label: 'Penerbitan SPP' },
    { id: 'lain', label: 'Penerbitan Lain' },
    { id: 'tarif', label: 'Tarif' },
  ],
  pembayaran: [
    { id: 'siswa', label: 'Data Siswa' },
    { id: 'pembayaran', label: 'Pembayaran' },
    { id: 'invoice', label: 'Invoice' },
  ],
  'bersihkan-duplikat': [
    { id: 'duplikat', label: 'Cek Data Duplikat' },
    { id: 'nisn', label: 'Cek Data NISN' },
    { id: 'nisnKembar', label: 'Cek NISN Kembar' },
    { id: 'keuangan', label: 'Cek Data Keuangan' },
  ],
  'pemasukan-pengeluaran': [
    { id: 'pemasukan', label: 'Pemasukan Lain' },
    { id: 'pengeluaran', label: 'Pengeluaran' },
  ],
  'laporan-keuangan': [
    { id: 'bukubesar', label: 'Buku Besar' },
    { id: 'cashflow', label: 'Cashflow' },
    { id: 'rekap', label: 'Rekapitulasi' },
    { id: 'labarugi', label: 'Laba Rugi' },
    { id: 'neraca', label: 'Neraca' },
  ],
  beasiswa: [
    { id: 'kategori', label: 'Kategori Beasiswa' },
    { id: 'siswa', label: 'Siswa Penerima' },
  ],
  jadwal: [
    { id: 'grid', label: 'Jadwal per Kelas' },
    { id: 'tabel', label: 'Daftar Jadwal' },
    { id: 'manual', label: 'Tambah Jadwal' },
  ],
  presensi: [
    { id: 'input', label: 'Isi Presensi' },
    { id: 'rekap', label: 'Rekap Kehadiran' },
    { id: 'tabel', label: 'Data Presensi' },
  ],
  nilai: [
    { id: 'input', label: 'Input Nilai' },
    { id: 'rekap', label: 'Rekap Nilai' },
    { id: 'tabel', label: 'Data Nilai' },
  ],
  prestasi: [
    { id: 'tabel', label: 'Daftar Prestasi' },
    { id: 'manual', label: 'Catat Prestasi' },
  ],
  pelanggaran: [
    { id: 'tabel', label: 'Daftar Pelanggaran' },
    { id: 'manual', label: 'Catat Pelanggaran' },
  ],
  kalender: [
    { id: 'kalender', label: 'Kalender Bulanan' },
    { id: 'daftar', label: 'Daftar Agenda' },
    { id: 'manual', label: 'Tambah Agenda' },
  ],
  kkm: [
    { id: 'matriks', label: 'Atur KKM' },
    { id: 'tabel', label: 'Data KKM' },
  ],
  rapor: [
    { id: 'kelas', label: 'Rapor per Kelas' },
  ],
  'bank-soal': [
    { id: 'soal', label: 'Bank Soal' },
    { id: 'tambah-soal', label: 'Tambah Soal' },
    { id: 'ujian', label: 'Daftar Ujian' },
    { id: 'tambah-ujian', label: 'Buat Ujian' },
  ],
  'jadwal-mengajar': [
    { id: 'guru', label: 'Jadwal per Guru' },
    { id: 'beban', label: 'Beban Mengajar' },
  ],
  'presensi-guru': [
    { id: 'input', label: 'Isi Presensi' },
    { id: 'rekap', label: 'Rekap Kehadiran' },
    { id: 'tabel', label: 'Data Presensi' },
  ],
  kinerja: [
    { id: 'rekap', label: 'Rekap Kinerja' },
    { id: 'tabel', label: 'Data Penilaian' },
    { id: 'manual', label: 'Input Penilaian' },
  ],
  pelatihan: [
    { id: 'rekap', label: 'Rekap per Guru' },
    { id: 'tabel', label: 'Daftar Kegiatan' },
    { id: 'manual', label: 'Catat Kegiatan' },
  ],
  'scan-presensi': [
    { id: 'siswa', label: 'Scan Siswa' },
    { id: 'guru', label: 'Scan Guru & Staff' },
  ],
  'laporan-presensi': [
    { id: 'siswa', label: 'Laporan Siswa' },
    { id: 'guru', label: 'Laporan Guru & Staff' },
  ],
  'id-card': [
    { id: 'siswa', label: 'Kartu Siswa' },
    { id: 'guru', label: 'Kartu Guru & Staff' },
  ],
  'katalog-buku': [
    { id: 'katalog', label: 'Katalog' },
    { id: 'tambah', label: 'Tambah Buku' },
    { id: 'label', label: 'Cetak Label Barcode' },
  ],
  sirkulasi: [
    { id: 'pinjam', label: 'Peminjaman' },
    { id: 'kembali', label: 'Pengembalian' },
    { id: 'riwayat', label: 'Riwayat Sirkulasi' },
  ],
  'denda-perpus': [
    { id: 'daftar', label: 'Daftar Denda' },
    { id: 'tambah', label: 'Catat Denda Kerusakan/Kehilangan' },
    { id: 'aturan', label: 'Aturan Pinjam & Denda' },
  ],
  'reservasi-buku': [
    { id: 'daftar', label: 'Daftar Reservasi' },
    { id: 'tambah', label: 'Buat Reservasi' },
  ],
  pengumuman: [
    { id: 'papan', label: 'Papan Pengumuman' },
    { id: 'tabel', label: 'Kelola Pengumuman' },
    { id: 'tulis', label: 'Tulis Pengumuman' },
  ],
  surat: [
    { id: 'masuk', label: 'Surat Masuk' },
    { id: 'keluar', label: 'Surat Keluar' },
    { id: 'catat-masuk', label: 'Catat Surat Masuk' },
    { id: 'buat-keluar', label: 'Buat Surat Keluar' },
  ],
  mutasi: [
    { id: 'daftar', label: 'Daftar Mutasi' },
    { id: 'catat', label: 'Catat Mutasi' },
  ],
  backup: [
    { id: 'backup', label: 'Backup' },
    { id: 'restore', label: 'Restore' },
  ],
  'laporan-siswa': [
    { id: 'siswa', label: 'Rekap per Siswa' },
    { id: 'kelas', label: 'Rekap per Kelas' },
  ],
  aset: [
    { id: 'tabel', label: 'Data Aset (Tabel)' },
    { id: 'manual', label: 'Tambah Manual' },
  ],
  'peminjaman-aset': [
    { id: 'tabel', label: 'Daftar Peminjaman' },
    { id: 'manual', label: 'Catat Peminjaman' },
  ],
  'pemeliharaan-aset': [
    { id: 'tabel', label: 'Daftar Pemeliharaan' },
    { id: 'manual', label: 'Catat Pemeliharaan' },
  ],
  'manajemen-user': [
    { id: 'tambah', label: 'Tambah User' },
    { id: 'daftar', label: 'Daftar User' },
  ],
  profil: [
    { id: 'profil', label: 'Profil Sekolah' },
    // "Tahun Ajaran" py 2 sub-tab LAGI di dalamnya -- subTabs = tab bersarang level
    // ke-3 (Modul > Halaman > Tab > Sub-Tab). ItemId gabungannya jadi 3 bagian
    // dipisah titik, mis. "profil.tahun.tabel".
    { id: 'tahun', label: 'Tahun Ajaran', subTabs: [
      { id: 'tabel', label: 'Daftar Tahun Ajaran' },
      { id: 'manual', label: 'Tambah Tahun Ajaran' },
    ] },
    { id: 'akreditasi', label: 'Riwayat Akreditasi' },
    { id: 'semester', label: 'Periode Semester' },
  ],
  kelas: [
    { id: 'tabel', label: 'Data Kelas (Tabel)' },
    { id: 'manual', label: 'Tambah Manual' },
  ],
  guru: [
    { id: 'tabel', label: 'Data Guru & Staff (Tabel)' },
    { id: 'manual', label: 'Tambah' },
    { id: 'portofolio', label: 'Portofolio' },
  ],
  siswa: [
    { id: 'tabel', label: 'Data Siswa (Tabel)' },
    { id: 'rombel', label: 'Rombel' },
    { id: 'kenaikan', label: 'Kenaikan Kelas' },
    { id: 'riwayat', label: 'Riwayat Siswa' },
    { id: 'portofolio', label: 'Portofolio' },
    // Sejak v1.31.30: bukan tab terpisah lagi, tapi tetap dipakai sbg izin utk
    // tombol "+ Tambah Siswa" / "📊 Upload Excel" di tab Data Siswa (Tabel).
    { id: 'manual', label: 'Tombol Tambah Siswa' },
    { id: 'excel', label: 'Tombol Upload Excel' },
  ],
};

// 4 role BAWAAN yg selalu ada (Admin & Kepala Sekolah py perlakuan khusus di bawah) --
// role TAMBAHAN yg dibuat lewat "+ Tambah Role" digabung di ATAS daftar ini, TIDAK
// menggantikannya, supaya role bawaan tidak pernah hilang begitu saja.
const ROLE_BAWAAN = ['Kepala Sekolah', 'Bendahara / TU', 'Staf TU', 'Admin'];

function buildDefaultPermissionsUntukRole(role) {
  const perms = {};
  HAK_AKSES_PAGES.forEach(p => {
    if (ADMIN_ONLY_PAGES.includes(p.id)) {
      perms[p.id] = role === 'Admin';
    } else {
      perms[p.id] = !(halamanSensitif.includes(p.id) && !['Kepala Sekolah', 'Admin'].includes(role));
    }
  });
  return perms;
}

export function AppProvider({ children }) {
  const [permissions, setPermissions] = useState({});
  const [rolesTambahan, setRolesTambahan] = useState([]); // dari Sheet, di LUAR 4 role bawaan
  const permissionRoles = useMemo(() => [...ROLE_BAWAAN, ...rolesTambahan], [rolesTambahan]);

  const isiRolesHakAksesDariRows = useCallback((roleRows, hakRows) => {
    setRolesTambahan(roleRows.map(r => String(r['Nama Role'] ?? '').trim()).filter(Boolean));
    const permMap = {};
    // PENTING -- ketemu penyebab SEBENARNYA dari "hak akses balik lagi/tidak berubah":
    // sheet "Hak Akses" ternyata bisa punya LEBIH DARI 1 BARIS utk role yg SAMA (mis.
    // krn baris lama tidak ketemu saat upsert di Code.gs, jadi nambah baris baru,
    // bukan nimpa baris yg sudah ada). Kode LAMA di sini pakai `permMap[role] =
    // JSON.parse(...)` -- GANTI TOTAL tiap ketemu baris utk role itu -- jadi kalau
    // baris TERAKHIR utk 1 role cuma py 1-2 key (mis. cuma {"changelog":false} dari
    // baris paling bawah), SEMUA key dari baris SEBELUMNYA (mis. profil/kelas/guru/
    // siswa/manajemen-user/hakakses dari baris yg lebih atas) HILANG total dari hasil
    // akhir, walau datanya MASIH ADA persis di Sheet -- ini penyebab kenapa restriksi
    // yg sudah diterapkan kelihatan "tidak berlaku sama sekali" padahal sudah benar
    // disimpan. Sekarang di-GABUNG (merge per-key) dari SEMUA baris role itu, urut
    // dari atas ke bawah, baris yg lebih BAWAH menang cuma utk key yg SAMA -- bukan
    // membuang key dari baris lain yg tidak disebut ulang.
    hakRows.forEach(row => {
      const role = String(row['Role'] ?? '').trim();
      let parsed = {};
      try { parsed = JSON.parse(row['PermissionsJson'] || '{}'); } catch { parsed = {}; }
      permMap[role] = { ...(permMap[role] || {}), ...parsed };
    });
    setPermissions(permMap);
  }, []);

  // "Tiket" antrean utk fetch Roles+Hak Akses -- ADA 2 tempat yg bisa memuat data ini
  // (muatMaster saat app pertama dibuka, DAN muatRolesDanHakAkses saat "Terapkan"/tambah
  // role) -- keduanya menulis ke state `permissions` yg SAMA. Tanpa penanda tiket ini,
  // fetch yg dikirim DULUAN tapi kebetulan lambat selesainya (mis. muatMaster kena
  // "cold start" Apps Script pas app baru dibuka) bisa selesai BELAKANGAN dan menimpa
  // balik hasil fetch yg lebih BARU (yg sudah mencerminkan perubahan barusan) dengan
  // data BASI -- persis gejala "abis Terapkan sukses & kotaknya sudah benar, tapi
  // beberapa detik kemudian balik sendiri ke posisi lama". Aturannya: tiap kali MULAI
  // fetch, ambil nomor tiket baru; saat fetch itu SELESAI, cuma diterapkan kalau tiketnya
  // MASIH yg terbaru (blm ada fetch lain yg dimulai sesudahnya) -- fetch basi dibuang.
  const hakAksesTiketRef = useRef(0);
  const terapkanHakAksesJikaMasihTerbaru = useCallback((tiket, roleRows, hakRows) => {
    if (tiket !== hakAksesTiketRef.current) return;
    isiRolesHakAksesDariRows(roleRows, hakRows);
  }, [isiRolesHakAksesDariRows]);

  const muatRolesDanHakAkses = useCallback(async () => {
    if (!isConfigured()) return;
    const tiket = ++hakAksesTiketRef.current;
    try {
      const [roleRows, hakRows] = await Promise.all([fetchRolesFromSheet(), fetchHakAksesFromSheet()]);
      terapkanHakAksesJikaMasihTerbaru(tiket, roleRows, hakRows);
    } catch (err) {
      // Diam2 gagal -- role/permission tetap pakai default bawaan di bawah (fallback).
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terapkanHakAksesJikaMasihTerbaru]);

  // addRole: cuma role TAMBAHAN (di luar 4 bawaan) yg bisa ditambah lewat sini.
  const addRole = useCallback(async (namaRole) => {
    const nama = namaRole.trim();
    if (!nama) throw new Error('Nama role tidak boleh kosong.');
    if (permissionRoles.includes(nama)) throw new Error('Role dengan nama itu sudah ada.');
    await addRoleToSheet(nama);
    await muatRolesDanHakAkses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionRoles]);

  // Ubah 1 izin (halaman ATAU "halaman.tab") utk 1 role -- update state LANGSUNG
  // (biar UI responsif), lalu simpan JSON lengkap role itu ke Sheet di belakang layar.
  // Terapkan SEKALIGUS beberapa perubahan izin (dipanggil oleh tombol "Terapkan" di
  // Manajemen Hak Akses) -- BUKAN lagi simpan langsung tiap klik checkbox. daftarPerubahan
  // = [{role, itemId, checked}, ...]. Semua dikirim, baru SEKALI refresh dari server &
  // SATU toast ringkasan di akhir -- lebih cepat dirasakan (centang tidak nunggu network
  // tiap klik) dan otomatis menghindari race condition antar klik cepat sama sekali.
  const terapkanPerubahanHakAkses = useCallback(async (daftarPerubahan) => {
    if (daftarPerubahan.length === 0) return;
    const gagal = [];
    for (const { role, itemId, checked } of daftarPerubahan) {
      try {
        await saveHakAksesRole(role, itemId, checked);
      } catch (err) {
        gagal.push({ role, itemId, error: err.message });
      }
    }
    await muatRolesDanHakAkses();
    if (gagal.length === 0) {
      toast(`${daftarPerubahan.length} perubahan hak akses berhasil diterapkan.`);
    } else {
      toast(`${daftarPerubahan.length - gagal.length} perubahan tersimpan, ${gagal.length} gagal: ${gagal[0].error}`, 'error');
    }
    return gagal;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissionsUntukTampil = useMemo(() => {
    const hasil = {};
    permissionRoles.forEach(role => {
      // PENTING: GABUNG default (baseline aman -- halaman admin-only/sensitif otomatis
      // tertutup utk role selain Admin/Kepala Sekolah) DENGAN izin yg sudah PERNAH
      // disimpan eksplisit utk role itu -- bukan pilih salah satu spt sebelumnya
      // (`permissions[role] || buildDefaultPermissionsUntukRole(role)`). Kenapa: begitu
      // 1 role py SATU SAJA baris di Sheet Hak Akses (krn baru 1x pernah diubah), cara
      // LAMA membuang SELURUH baseline default role itu -- akibatnya SEMUA halaman lain
      // yg belum pernah disentuh (termasuk yg admin-only spt Pengaturan Koneksi Google
      // Sheets & Pengaturan Sistem) diam2 jadi TERBUKA (default "boleh" krn key-nya
      // tidak ada), padahal harusnya tetap tertutup utk role selain Admin. Baseline
      // default dipasang DULU, baru ditimpa oleh apa yg benar2 pernah disimpan eksplisit.
      hasil[role] = { ...buildDefaultPermissionsUntukRole(role), ...(permissions[role] || {}) };
    });
    return hasil;
  }, [permissionRoles, permissions]);

  const [toasts, setToasts] = useState([]);

  // ---- Data induk: SUMBER ASLINYA Google Sheets, bukan lagi data dami ----
  // "deferInitialFetch: true" di SEMUANYA -- data awal diisi SEKALIGUS lewat batch
  // (lihat useEffect fetchAllFromSheet di bawah), bukan 14 request terpisah saat
  // mount. refresh() manual (setelah tambah/edit/hapus) TETAP 1 request spt biasa.
  const defer = { deferInitialFetch: true };
  const siswaRes = useSheetResource(fetchSiswaFromSheet, normalizeSheetSiswa, 'master', defer);
  const kelasRes = useSheetResource(fetchKelasFromSheet, normalizeSheetKelas, 'master', defer);
  const guruRes = useSheetResource(fetchGuruFromSheet, normalizeSheetGuru, 'master', defer);
  const asetRes = useSheetResource(fetchAsetFromSheet, normalizeSheetAset, 'master', defer);
  const tahunAjaranRes = useSheetResource(fetchTahunAjaranFromSheet, normalizeSheetTahunAjaran, 'master', defer);
  const tarifRes = useSheetResource(fetchTarifFromSheet, normalizeSheetTarif, 'keuangan', defer);
  const tagihanSppRes = useSheetResource(fetchTagihanSppFromSheet, normalizeSheetTagihanSpp, 'keuangan', defer);
  const tagihanLainRes = useSheetResource(fetchTagihanLainFromSheet, normalizeSheetTagihanLain, 'keuangan', defer);
  const pembayaranRes = useSheetResource(fetchPembayaranFromSheet, normalizeSheetPembayaran, 'keuangan', defer);
  const pengeluaranRes = useSheetResource(fetchPengeluaranFromSheet, normalizeSheetPengeluaran, 'keuangan', defer);
  const pemasukanLainRes = useSheetResource(fetchPemasukanLainFromSheet, normalizeSheetPemasukanLain, 'keuangan', defer);
  const akunRes = useSheetResource(fetchAkunFromSheet, normalizeSheetAkun, 'keuangan', defer);
  const beasiswaKategoriRes = useSheetResource(fetchBeasiswaKategoriFromSheet, normalizeSheetBeasiswaKategori, 'keuangan', defer);
  const beasiswaSiswaRes = useSheetResource(fetchBeasiswaSiswaFromSheet, normalizeSheetBeasiswaSiswa, 'keuangan', defer);
  const riwayatAkademikRes = useSheetResource(fetchRiwayatAkademikFromSheet, normalizeSheetRiwayatAkademik, 'master', defer);
  // ---- Akademik & Kesiswaan (file Sheets ketiga, target 'akademik') ----
  const jadwalRes = useSheetResource(fetchJadwalFromSheet, normalizeSheetJadwal, 'akademik', defer);
  const presensiRes = useSheetResource(fetchPresensiFromSheet, normalizeSheetPresensi, 'akademik', defer);
  const nilaiRes = useSheetResource(fetchNilaiFromSheet, normalizeSheetNilai, 'akademik', defer);
  const prestasiRes = useSheetResource(fetchPrestasiFromSheet, normalizeSheetPrestasi, 'akademik', defer);
  const pelanggaranRes = useSheetResource(fetchPelanggaranFromSheet, normalizeSheetPelanggaran, 'akademik', defer);
  const presensiGuruRes = useSheetResource(fetchPresensiGuruFromSheet, normalizeSheetPresensiGuru, 'akademik', defer);
  const kinerjaRes = useSheetResource(fetchKinerjaFromSheet, normalizeSheetKinerja, 'akademik', defer);
  const pelatihanRes = useSheetResource(fetchPelatihanFromSheet, normalizeSheetPelatihan, 'akademik', defer);
  const pengaturanPresensiRes = useSheetResource(fetchPengaturanPresensiFromSheet, null, 'akademik', defer);
  const akreditasiRes = useSheetResource(akreditasiApi.fetch, normalizeSheetAkreditasi, 'akademik', defer);
  const semesterRes = useSheetResource(semesterApi.fetch, normalizeSheetSemester, 'akademik', defer);
  const mutasiRes = useSheetResource(mutasiApi.fetch, normalizeSheetMutasi, 'akademik', defer);
  const pengumumanRes = useSheetResource(pengumumanApi.fetch, normalizeSheetPengumuman, 'akademik', defer);
  const suratRes = useSheetResource(suratApi.fetch, normalizeSheetSurat, 'akademik', defer);
  const bukuRes = useSheetResource(fetchBukuFromSheet, normalizeSheetBuku, 'akademik', defer);
  const sirkulasiRes = useSheetResource(fetchSirkulasiFromSheet, normalizeSheetSirkulasi, 'akademik', defer);
  const dendaPerpusRes = useSheetResource(fetchDendaPerpusFromSheet, normalizeSheetDendaPerpus, 'akademik', defer);
  const reservasiRes = useSheetResource(fetchReservasiFromSheet, normalizeSheetReservasi, 'akademik', defer);
  const pengaturanPerpusRes = useSheetResource(fetchPengaturanPerpusFromSheet, null, 'akademik', defer);
  const kkmRes = useSheetResource(fetchKkmFromSheet, normalizeSheetKkm, 'akademik', defer);
  const agendaRes = useSheetResource(fetchAgendaFromSheet, normalizeSheetAgenda, 'akademik', defer);
  const bankSoalRes = useSheetResource(fetchBankSoalFromSheet, normalizeSheetBankSoal, 'akademik', defer);
  const ujianRes = useSheetResource(fetchUjianFromSheet, normalizeSheetUjian, 'akademik', defer);
  const raporRes = useSheetResource(fetchRaporFromSheet, normalizeSheetRapor, 'akademik', defer);

  // ---- Profil Sekolah: 1 rekaman tunggal, bukan daftar ----
  // TIDAK auto-fetch sendiri saat mount lagi (dulu +1 request terpisah) -- diisi
  // lewat batch Master di bawah. refreshProfil() manual TETAP jalan spt biasa.
  const [profilSekolah, setProfilSekolahRaw] = useState(null);
  const [profilLoading, setProfilLoading] = useState(true);
  const [profilExists, setProfilExists] = useState(false);
  const isiProfilDariRows = useCallback((rows) => {
    if (rows.length > 0) {
      setProfilSekolahRaw(normalizeSheetProfil(rows[0]));
      setProfilExists(true);
    } else {
      setProfilSekolahRaw(null);
      setProfilExists(false);
    }
    setProfilLoading(false);
  }, []);
  const refreshProfil = useCallback(async () => {
    if (!isConfigured()) { setProfilSekolahRaw(null); setProfilLoading(false); return; }
    setProfilLoading(true);
    try {
      const rows = await fetchProfilFromSheet();
      isiProfilDariRows(rows);
    } finally {
      setProfilLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // muatMaster/muatKeuangan: 1 request gabungan per target (Master & Keuangan), BUKAN
  // 14+1 request terpisah -- lihat catatan di useSheetResource.js & fetchAllFromSheet().
  // Dipakai baik utk LOAD AWAL (withFallback=true -- kalau batch gagal, jatuhkan ke cara
  // lama refresh() 1-per-1 sbg cadangan supaya user tidak macet) MAUPUN utk AUTO-REFRESH
  // berkala (withFallback=false -- lihat efek di bawah -- kalau 1 siklus polling gagal,
  // cukup diam & coba lagi siklus berikutnya, TIDAK usah membombardir 9 request 1-per-1
  // tiap kali 1 polling gagal sesaat).
  const muatMaster = useCallback(async (withFallback) => {
    if (!isConfigured('master')) { isiProfilDariRows([]); return; }
    const tiketHakAkses = ++hakAksesTiketRef.current;
    try {
      const semua = await fetchAllFromSheet('master');
      siswaRes.setFromBatch(semua.siswa || []);
      kelasRes.setFromBatch(semua.kelas || []);
      guruRes.setFromBatch(semua.guru || []);
      asetRes.setFromBatch(semua.aset || []);
      tahunAjaranRes.setFromBatch(semua.tahunAjaran || []);
      riwayatAkademikRes.setFromBatch(semua.riwayatAkademik || []);
      isiProfilDariRows(semua.profil || []);
      terapkanHakAksesJikaMasihTerbaru(tiketHakAkses, semua.roles || [], semua.hakAkses || []);
    } catch (err) {
      if (!withFallback) return; // polling berkala: diam saja, coba lagi siklus berikutnya
      siswaRes.refresh(); kelasRes.refresh(); guruRes.refresh(); asetRes.refresh(); tahunAjaranRes.refresh();
      riwayatAkademikRes.refresh();
      refreshProfil();
      muatRolesDanHakAkses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const muatKeuangan = useCallback(async (withFallback) => {
    if (!isConfigured('keuangan')) return;
    try {
      const semua = await fetchAllFromSheet('keuangan');
      tarifRes.setFromBatch(semua.tarif || []);
      tagihanSppRes.setFromBatch(semua.tagihanSpp || []);
      tagihanLainRes.setFromBatch(semua.tagihanLain || []);
      pembayaranRes.setFromBatch(semua.pembayaran || []);
      pengeluaranRes.setFromBatch(semua.pengeluaran || []);
      pemasukanLainRes.setFromBatch(semua.pemasukanLain || []);
      akunRes.setFromBatch(semua.akunBukuBesar || []);
      beasiswaKategoriRes.setFromBatch(semua.beasiswaKategori || []);
      beasiswaSiswaRes.setFromBatch(semua.beasiswaSiswa || []);
    } catch (err) {
      if (!withFallback) return;
      tarifRes.refresh(); tagihanSppRes.refresh(); tagihanLainRes.refresh(); pembayaranRes.refresh();
      pengeluaranRes.refresh(); pemasukanLainRes.refresh(); akunRes.refresh();
      beasiswaKategoriRes.refresh(); beasiswaSiswaRes.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Akademik: SENGAJA tidak ikut polling 30 detik ----
  // Presensi & nilai bisa puluhan ribu baris. Dimuat saat app dibuka, saat tab
  // browser aktif lagi, dan lewat refreshXxx() setelah simpan/ubah/hapus.
  const muatAkademik = useCallback(async (withFallback) => {
    if (!isConfigured('akademik')) return;
    try {
      const semua = await fetchAllFromSheet('akademik');
      jadwalRes.setFromBatch(semua.jadwal || []);
      presensiRes.setFromBatch(semua.presensi || []);
      nilaiRes.setFromBatch(semua.nilai || []);
      prestasiRes.setFromBatch(semua.prestasi || []);
      pelanggaranRes.setFromBatch(semua.pelanggaran || []);
      kkmRes.setFromBatch(semua.kkm || []);
      bukuRes.setFromBatch(semua.buku || []);
      akreditasiRes.setFromBatch(semua.akreditasi || []);
      semesterRes.setFromBatch(semua.semester || []);
      mutasiRes.setFromBatch(semua.mutasi || []);
      pengumumanRes.setFromBatch(semua.pengumuman || []);
      suratRes.setFromBatch(semua.surat || []);
      sirkulasiRes.setFromBatch(semua.sirkulasi || []);
      dendaPerpusRes.setFromBatch(semua.dendaPerpus || []);
      reservasiRes.setFromBatch(semua.reservasiBuku || []);
      pengaturanPerpusRes.setFromBatch(semua.pengaturanPerpus || []);
      pengaturanPresensiRes.setFromBatch(semua.pengaturanPresensi || []);
      presensiGuruRes.setFromBatch(semua.presensiGuru || []);
      kinerjaRes.setFromBatch(semua.kinerja || []);
      pelatihanRes.setFromBatch(semua.pelatihan || []);
      agendaRes.setFromBatch(semua.agenda || []);
      bankSoalRes.setFromBatch(semua.bankSoal || []);
      ujianRes.setFromBatch(semua.ujian || []);
      raporRes.setFromBatch(semua.rapor || []);
    } catch (err) {
      if (!withFallback) return;
      jadwalRes.refresh(); presensiRes.refresh(); nilaiRes.refresh(); prestasiRes.refresh(); pelanggaranRes.refresh();
      akreditasiRes.refresh(); semesterRes.refresh(); mutasiRes.refresh(); pengumumanRes.refresh(); suratRes.refresh();
      bukuRes.refresh(); sirkulasiRes.refresh(); dendaPerpusRes.refresh(); reservasiRes.refresh(); pengaturanPerpusRes.refresh();
      presensiGuruRes.refresh(); pengaturanPresensiRes.refresh(); kinerjaRes.refresh(); pelatihanRes.refresh();
      kkmRes.refresh(); agendaRes.refresh(); bankSoalRes.refresh(); ujianRes.refresh(); raporRes.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periode semester (kalau diatur) dipakai semua modul lewat semesterDariTanggal().
  useEffect(() => { setPeriodeSemester(semesterRes.data); }, [semesterRes.data]);

  // ---- Load AWAL (sekali saat app dibuka) ----
  useEffect(() => {
    muatMaster(true);
    muatKeuangan(true);
    muatAkademik(true);
    function akademikSaatTabAktif() {
      if (document.visibilityState === 'visible') muatAkademik(false);
    }
    document.addEventListener('visibilitychange', akademikSaatTabAktif);
    return () => document.removeEventListener('visibilitychange', akademikSaatTabAktif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Auto-refresh berkala dari Google Sheets ----
  // Supaya user TIDAK perlu klik "Muat Ulang" manual lagi -- penting krn kadang ada
  // BEBERAPA staf yg login bersamaan (mis. Bendahara catat pembayaran, sementara Admin
  // buka Rekap Tunggakan) -- tanpa ini, layar yg sudah lama terbuka bisa menampilkan
  // data BASI (mis. tagihan yg baru saja dibayar orang lain masih kelihatan "Belum
  // Lunas"). Interval SENGAJA 30 detik -- cukup terasa "real-time" utk operasional
  // sekolah sehari-hari, tapi tidak terlalu sering sampai berisiko kena limit kuota
  // Google Apps Script (akun gratis) kalau banyak staf login bersamaan. Tinggal ubah
  // angka di bawah ini kalau mau lebih cepat/lambat.
  const AUTO_REFRESH_INTERVAL_MS = 30 * 1000;
  useEffect(() => {
    function refreshDiamDiam() {
      muatMaster(false);
      muatKeuangan(false);
    }
    function saatTabAktifLagi() {
      if (document.visibilityState === 'visible') refreshDiamDiam();
    }
    document.addEventListener('visibilitychange', saatTabAktifLagi);
    const interval = setInterval(refreshDiamDiam, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', saatTabAktifLagi);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkron ulang Hak Akses SECARA BERKALA + tiap kali tab ini balik aktif (mis. user
  // pindah ke tab/aplikasi lain lalu balik lagi) -- PENTING krn tanpa ini, sesi yg
  // sudah lama terbuka (mis. petugas login pagi, tab-nya dibiarkan terbuka seharian)
  // akan TERUS pakai salinan izin akses yg diambil SEKALI waktu pertama dia login,
  // walau Admin sudah ubah & Terapkan hak akses barunya di sesi lain. Efeknya persis
  // spt yg dilaporkan: kelihatannya "hak akses sudah dicabut tapi kok bisa akses
  // terus, tidak ada perubahan apa pun" -- padahal datanya di Sheet sudah benar,
  // cuma sesi yg SEDANG terbuka itu belum tahu ada perubahan (tidak ada mekanisme
  // push real-time dari Sheet ke browser). Begitu permissions ke-refresh, halaman yg
  // sedang tampil ikut re-render otomatis (canAccess baca ulang state ini), jadi
  // TIDAK perlu user logout/refresh manual utk pembatasan barunya berlaku.
  // (Ini TERPISAH dari auto-refresh data di atas krn sudah ada duluan & polling-nya
  // 2 menit -- lebih jarang krn hak akses jarang berubah -- sengaja tidak digabung
  // supaya tidak perlu ubah perilaku yg sudah teruji.)
  useEffect(() => {
    function saatTabAktifLagi() {
      if (document.visibilityState === 'visible') muatRolesDanHakAkses();
    }
    document.addEventListener('visibilitychange', saatTabAktifLagi);
    const interval = setInterval(muatRolesDanHakAkses, 2 * 60 * 1000); // jaga2 tiap 2 menit walau tab tak pernah di-blur sama sekali
    return () => {
      document.removeEventListener('visibilitychange', saatTabAktifLagi);
      clearInterval(interval);
    };
  }, [muatRolesDanHakAkses]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const tahunAjaranAktifObj = useMemo(() => tahunAjaranRes.data.find(t => t.aktif), [tahunAjaranRes.data]);

  const siswaById = useCallback((id) => siswaRes.data.find(s => s.id === id), [siswaRes.data]);

  const allTagihan = useMemo(() => [...tagihanSppRes.data, ...tagihanLainRes.data], [tagihanSppRes.data, tagihanLainRes.data]);
  const tagihanTerbayar = useCallback((refType, refNo, nisn) => hitungTerbayar(pembayaranRes.data, refType, refNo, nisn), [pembayaranRes.data]);

  const setTahunAjaranAktif = useCallback(async (no) => {
    await setActiveTahunAjaranOnSheet(no);
    await tahunAjaranRes.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaranRes.refresh]);

  const value = {
    tahunAjaran: tahunAjaranRes.data, tahunAjaranLoading: tahunAjaranRes.loading, tahunAjaranLoaded: tahunAjaranRes.loaded, refreshTahunAjaran: tahunAjaranRes.refresh,
    tahunAjaranAktif: tahunAjaranAktifObj, setTahunAjaranAktif,
    siswa: siswaRes.data, siswaLoading: siswaRes.loading, siswaError: siswaRes.error, siswaLoaded: siswaRes.loaded, refreshSiswa: siswaRes.refresh, siswaById,
    kelas: kelasRes.data, kelasLoading: kelasRes.loading, kelasError: kelasRes.error, kelasLoaded: kelasRes.loaded, refreshKelas: kelasRes.refresh,
    guru: guruRes.data, guruLoading: guruRes.loading, guruError: guruRes.error, guruLoaded: guruRes.loaded, refreshGuru: guruRes.refresh,
    aset: asetRes.data, asetLoading: asetRes.loading, asetError: asetRes.error, asetLoaded: asetRes.loaded, refreshAset: asetRes.refresh,
    tarif: tarifRes.data, tarifLoading: tarifRes.loading, tarifError: tarifRes.error, tarifLoaded: tarifRes.loaded, refreshTarif: tarifRes.refresh,
    tagihanSpp: tagihanSppRes.data, tagihanSppLoading: tagihanSppRes.loading, tagihanSppLoaded: tagihanSppRes.loaded, refreshTagihanSpp: tagihanSppRes.refresh,
    tagihanLain: tagihanLainRes.data, tagihanLainLoading: tagihanLainRes.loading, tagihanLainLoaded: tagihanLainRes.loaded, refreshTagihanLain: tagihanLainRes.refresh,
    pembayaran: pembayaranRes.data, pembayaranLoading: pembayaranRes.loading, pembayaranLoaded: pembayaranRes.loaded, refreshPembayaran: pembayaranRes.refresh,
    pengeluaran: pengeluaranRes.data, pengeluaranLoading: pengeluaranRes.loading, pengeluaranLoaded: pengeluaranRes.loaded, refreshPengeluaran: pengeluaranRes.refresh,
    pemasukanLain: pemasukanLainRes.data, pemasukanLainLoading: pemasukanLainRes.loading, pemasukanLainLoaded: pemasukanLainRes.loaded, refreshPemasukanLain: pemasukanLainRes.refresh,
    akun: akunRes.data, akunLoading: akunRes.loading, akunLoaded: akunRes.loaded, refreshAkun: akunRes.refresh,
    beasiswaKategori: beasiswaKategoriRes.data, beasiswaKategoriLoading: beasiswaKategoriRes.loading, beasiswaKategoriLoaded: beasiswaKategoriRes.loaded, refreshBeasiswaKategori: beasiswaKategoriRes.refresh,
    beasiswaSiswa: beasiswaSiswaRes.data, beasiswaSiswaLoading: beasiswaSiswaRes.loading, beasiswaSiswaLoaded: beasiswaSiswaRes.loaded, refreshBeasiswaSiswa: beasiswaSiswaRes.refresh,
    riwayatAkademik: riwayatAkademikRes.data, riwayatAkademikLoading: riwayatAkademikRes.loading, riwayatAkademikLoaded: riwayatAkademikRes.loaded, refreshRiwayatAkademik: riwayatAkademikRes.refresh,
    jadwal: jadwalRes.data, jadwalLoaded: jadwalRes.loaded, jadwalLoading: jadwalRes.loading, refreshJadwal: jadwalRes.refresh,
    presensi: presensiRes.data, presensiLoaded: presensiRes.loaded, presensiLoading: presensiRes.loading, refreshPresensi: presensiRes.refresh,
    nilai: nilaiRes.data, nilaiLoaded: nilaiRes.loaded, nilaiLoading: nilaiRes.loading, refreshNilai: nilaiRes.refresh,
    prestasi: prestasiRes.data, prestasiLoaded: prestasiRes.loaded, prestasiLoading: prestasiRes.loading, refreshPrestasi: prestasiRes.refresh,
    pelanggaran: pelanggaranRes.data, pelanggaranLoaded: pelanggaranRes.loaded, pelanggaranLoading: pelanggaranRes.loading, refreshPelanggaran: pelanggaranRes.refresh,
    presensiGuru: presensiGuruRes.data, presensiGuruLoaded: presensiGuruRes.loaded, refreshPresensiGuru: presensiGuruRes.refresh,
    kinerja: kinerjaRes.data, kinerjaLoaded: kinerjaRes.loaded, refreshKinerja: kinerjaRes.refresh,
    pelatihan: pelatihanRes.data, pelatihanLoaded: pelatihanRes.loaded, refreshPelatihan: pelatihanRes.refresh,
    pengaturanPresensiRows: pengaturanPresensiRes.data, refreshPengaturanPresensi: pengaturanPresensiRes.refresh,
    akreditasi: akreditasiRes.data, refreshAkreditasi: akreditasiRes.refresh,
    periodeSemester: semesterRes.data, refreshSemester: semesterRes.refresh,
    mutasi: mutasiRes.data, refreshMutasi: mutasiRes.refresh,
    pengumuman: pengumumanRes.data, refreshPengumuman: pengumumanRes.refresh,
    surat: suratRes.data, refreshSurat: suratRes.refresh,
    buku: bukuRes.data, bukuLoaded: bukuRes.loaded, refreshBuku: bukuRes.refresh,
    sirkulasi: sirkulasiRes.data, sirkulasiLoaded: sirkulasiRes.loaded, refreshSirkulasi: sirkulasiRes.refresh,
    dendaPerpus: dendaPerpusRes.data, refreshDendaPerpus: dendaPerpusRes.refresh,
    reservasi: reservasiRes.data, refreshReservasi: reservasiRes.refresh,
    pengaturanPerpusRows: pengaturanPerpusRes.data, refreshPengaturanPerpus: pengaturanPerpusRes.refresh,
    kkm: kkmRes.data, kkmLoaded: kkmRes.loaded, refreshKkm: kkmRes.refresh,
    agenda: agendaRes.data, agendaLoaded: agendaRes.loaded, refreshAgenda: agendaRes.refresh,
    bankSoal: bankSoalRes.data, bankSoalLoaded: bankSoalRes.loaded, refreshBankSoal: bankSoalRes.refresh,
    ujian: ujianRes.data, ujianLoaded: ujianRes.loaded, refreshUjian: ujianRes.refresh,
    rapor: raporRes.data, raporLoaded: raporRes.loaded, refreshRapor: raporRes.refresh,
    muatAkademik,
    allTagihan, tagihanTerbayar,
    profilSekolah, profilLoading, profilExists, refreshProfil,
    permissions: permissionsUntukTampil, terapkanPerubahanHakAkses, addRole, muatRolesDanHakAkses,
    toast, toasts,
    HAK_AKSES_PAGES, HAK_AKSES_TABS, permissionRoles, halamanSensitif, ADMIN_ONLY_PAGES,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData harus dipakai di dalam <AppProvider>');
  return ctx;
}
