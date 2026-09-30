# Sistem SPP & Sarpras — MI Ikhlasiyah (versi React)

Migrasi dari versi HTML/vanilla JS satu-file ke React + Vite. Dikerjakan **modul per modul**,
mengikuti pola kerja yang sama seperti pembangunan versi HTML aslinya.

## Menjalankan secara lokal

```bash
npm install
npm run dev       # mode pengembangan, http://localhost:5173
npm run build     # build produksi ke folder dist/
npm run preview   # jalankan hasil build
```

Login demo (klik kartu akun demo di layar login, atau ketik manual):

| Role | Username | Password |
|---|---|---|
| Kepala Sekolah | `kepsek` | `kepsek123` |
| Bendahara / TU | `bendahara` | `bendahara123` |
| Staf TU | `staftu` | `staftu123` |

## Status migrasi

### Sudah dimigrasi penuh (putaran 1)
- Fondasi: routing (React Router), state global (AppContext), sesi login (AuthContext)
- Login screen + logout + hak akses per role (menu otomatis tersembunyi sesuai permissions)
- Sidebar collapsible (grup & sub-grup, persis versi HTML)
- Komponen bersama: DataTable (search + sort + pagination, pengganti createTableController), Modal, Toast
- Dashboard — ringkasan statistik
- SPP Peserta Didik — pencarian siswa, kartu profil, riwayat per tahun ajaran (bisa dibuka/tutup), status Lunas/Sebagian/Belum Lunas dihitung ulang otomatis

### Belum dimigrasi (tampil sebagai halaman "Belum dimigrasi" di sidebar)
Urutan yang disarankan untuk putaran berikutnya (mengikuti prioritas bisnis, sama seperti urutan asli):
1. Keuangan: Tagihan & Biaya (penerbitan SPP + tarif), Pembayaran & Invoice (+ kwitansi), Rekap Tunggakan (+ pemutihan piutang), Laporan Keuangan (Rekapitulasi, Jurnal Pengeluaran, Laba Rugi, Dashboard Eksekutif, Neraca)
2. Sarpras: Data Aset, Peminjaman, Pemeliharaan, Laporan Rekap Aset
3. Pengaturan: Profil Sekolah (+ upload logo), Data Kelas/Guru/Siswa, Manajemen User (+ reset password), Manajemen Hak Akses, Log Penghapusan, Pengaturan Sistem
4. Sistem verifikasi password sebelum hapus data (audit trail)
5. Export Excel/Word/PDF

### Catatan arsitektur
- Data masih dummy/in-memory (src/db/seed.js) — reset tiap reload, sama seperti versi HTML.
- State dikelola lewat React Context (AppContext, AuthContext), belum pakai state management library eksternal — cukup untuk skala aplikasi ini.
- Routing pakai HashRouter supaya bisa di-deploy langsung ke GitHub Pages tanpa konfigurasi server tambahan.

## Struktur folder

```
src/
  context/       AppContext (data), AuthContext (sesi login)
  components/
    layout/      Sidebar, Topbar, AppShell, Page (pembungkus per halaman + guard hak akses)
    common/      DataTable, Modal, ToastContainer
    auth/        LoginScreen
  pages/         satu file per halaman, dikelompokkan per modul
  db/            seed.js (data contoh), helpers.js (format rupiah/tanggal, dsb)
  styles/        theme.css (palet warna & komponen dasar, portasi dari versi HTML)
```
