# Menyambungkan Aplikasi ke Google Sheets

Arsitekturnya **TIGA file Google Sheets terpisah**:

| File | Isinya | Kode Apps Script |
|---|---|---|
| **Data Induk** | Siswa, Kelas, Guru, Profil Sekolah, Tahun Ajaran, User, Log Aktivitas | `Code.gs` |
| **Keuangan** | Tarif, Tagihan SPP, Tagihan Lain, Pembayaran, dst | `Code-Keuangan.gs` |
| **Akademik** | Jadwal, Presensi, Nilai, Prestasi, Pelanggaran, KKM, Kalender, Bank Soal, Ujian, Rapor, Presensi Guru, Kinerja, Pelatihan, Pengaturan Presensi, Perpustakaan, Akreditasi, Semester, Mutasi, Pengumuman, Surat | `Code-Akademik.gs` |

**Kenapa dipisah?** Data Induk jumlahnya relatif tetap (paling nambah beberapa siswa/tahun).
Data Keuangan terus bertambah tiap bulan (tagihan SPP tiap siswa tiap bulan) — dipisah supaya
file Data Induk tetap ringan dalam jangka panjang.

## Setup File Data Induk (kalau belum)

1. Buka/buat Google Sheet untuk Data Induk.
2. Extensions → Apps Script → tempel isi `Code.gs`.
3. Ganti `SECRET` dengan kata sandi pilihan Anda.
4. Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
5. Salin URL → aplikasi React → Pengaturan Koneksi (khusus Admin) → bagian **"Koneksi Data Induk"**.

## Setup File Keuangan (BARU)

1. Buat Google Sheet **BARU, TERPISAH** dari Sheet Data Induk.
2. Extensions → Apps Script → tempel isi `Code-Keuangan.gs`.
3. Ganti `SECRET` dengan kata sandi pilihan Anda (**boleh beda** dari SECRET Data Induk — lebih aman).
4. Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
5. Salin URL → aplikasi React → Pengaturan Koneksi → bagian **"Koneksi Data Keuangan"**.

Kedua sheet akan otomatis dibuatkan tab-tab yang sesuai begitu ada data pertama dikirim dari
aplikasi — tidak perlu bikin tab atau header kolom manual.

## Setup File Akademik (BARU, v1.32.0)

Dipakai modul Jadwal Pelajaran, Presensi Siswa, Nilai Akademik, Prestasi, Pelanggaran & Konseling, dan Laporan Siswa.

1. Buat Google Sheet **BARU, TERPISAH** dari Data Induk & Keuangan.
2. Extensions → Apps Script → tempel isi `Code-Akademik.gs`.
3. Ganti `SECRET` dengan kata sandi pilihan Anda.
4. Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
5. Salin URL → `src/config/sheetsDefaults.js` bagian `akademik` (url + secret yang sama dgn langkah 3) → build ulang.

Beda dari dua script lama: nomor `No` baru dihitung dari No terbesar + 1 (bukan jumlah baris), jadi tidak bisa kembar setelah ada baris yang dihapus, dan ada aksi `bulkUpsert` untuk presensi/nilai supaya simpan ulang tidak menggandakan data.

### Update ke v1.38.0 — PENTING: ketiga script
Versi ini menambahkan aksi `replaceAll` (dipakai fitur Restore) ke **KETIGA** script. Tempel ulang `Code.gs`, `Code-Keuangan.gs`, **dan** `Code-Akademik.gs` terbaru ke masing-masing Apps Script-nya, lalu Deploy → Manage deployments → New version di ketiganya. URL tidak berubah.
Tanpa langkah ini, Backup tetap jalan, tetapi Restore akan menolak dgn pesan "aksi replaceAll tidak dikenal".
Tab baru di file Akademik: Riwayat Akreditasi, Periode Semester, Mutasi Siswa, Pengumuman, Surat Menyurat.

### Update ke v1.37.0
Tempel ulang `Code-Akademik.gs` → Deploy → New version. Tab baru: Katalog Buku, Sirkulasi Buku, Denda Perpustakaan, Reservasi Buku, Pengaturan Perpustakaan.

### Update ke v1.35.0
Tempel ulang `Code-Akademik.gs` → Deploy → New version. Tab baru: Pengaturan Presensi. Tab Presensi Siswa & Presensi Guru otomatis mendapat kolom baru di ujung kanan (Jam Pulang, Metode, Menit Terlambat, Denda) -- data lama tidak berubah.

### Update ke v1.34.0
Sama seperti di bawah: tempel ulang `Code-Akademik.gs` terbaru → Deploy → New version. Tab baru: Presensi Guru, Penilaian Kinerja, Pelatihan Guru.

### Update ke v1.33.0
Kalau `Code-Akademik.gs` versi 1.32.0 sudah terpasang: tempel ulang isi file terbaru, lalu **Deploy → Manage deployments → pensil → Version: New version → Deploy**. URL tidak berubah, 5 tab baru (KKM, Kalender Akademik, Bank Soal, Ujian, Rapor) terbentuk sendiri.

## Catatan Umum

- **Setiap kali mengubah kode `.gs`**, wajib **Deploy → Manage deployments → ikon pensil →
  Version: New version → Deploy** supaya perubahan aktif. Sekadar menyimpan file saja tidak cukup.
- Kata sandi (`SECRET`) dikirim di setiap permintaan tulis (tambah/ubah/hapus data) — proteksi
  ringan yang cocok untuk skala sekolah, bukan enkripsi tingkat bank.
- Kalau redeploy menghasilkan URL baru, ingat update lagi di Pengaturan Koneksi React.
