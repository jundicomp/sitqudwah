// Riwayat pembaruan aplikasi -- versi diambil dari git commit, TAPI deskripsinya
// ditulis ULANG manual (bukan disalin mentah dari pesan commit) supaya bahasanya
// pantas dibaca pengguna sekolah, bukan istilah teknis programmer. Setiap kali ada
// rilis baru, tambahkan 1 entri baru di PALING ATAS array ini.
export const CHANGELOG = [
  {
    versi: '1.38.2',
    tanggal: '2026-09-30',
    poin: [
      'Layar login kini memeriksa KETIGA koneksi (data induk, keuangan, akademik) dan menampilkan penyebabnya kalau gagal, mis. "kata sandi (secret) tidak cocok" atau "URL tidak bisa diakses"',
      'Sisa tulisan "SPP dan Sarpras" dan inisial "MI" di layar login, sidebar, kwitansi & aset diganti identitas Siskom Qudwah',
      'Pilihan jenjang siswa ditambah TK, SD, SMP, dan SMA',
    ],
  },
  {
    versi: '1.38.1',
    tanggal: '2026-09-30',
    poin: [
      'Aplikasi kini bernama "Siskom Qudwah" -- tampil di judul tab browser (mis. "Presensi Siswa · Siskom Qudwah") dan di bawah nama sekolah pada sidebar',
      'Ikon tab browser (favicon) otomatis memakai logo sekolah dari Pengaturan › Profil Sekolah, dan langsung tampil sejak halaman dibuka',
      'Tersambung ke tiga file Google Sheets baru milik SIT Qudwah, dan alamat aplikasi pindah ke jundicomp.github.io/sitqudwah',
    ],
  },
  {
    versi: '1.38.0',
    tanggal: '2026-09-27',
    poin: [
      'MENU BARU -- Komunikasi: "Pengumuman" (papan pengumuman dgn pengumuman penting disematkan di atas, jadwal terbit & kedaluwarsa, tombol Kirim via WA ke grup wali murid/guru, dan tampil di Dashboard) dan "Surat Menyurat" (agenda surat masuk & keluar, disposisi, tautan berkas, nomor surat keluar otomatis berurutan per tahun)',
      'MENU BARU -- Kesiswaan › "Mutasi Siswa": catat mutasi masuk, keluar, mengundurkan diri, dikeluarkan, atau meninggal. Status siswa di Data Siswa otomatis ikut berubah, dan surat keterangan pindah bisa langsung dicetak',
      'MENU BARU -- Pengaturan › "Backup & Restore": unduh seluruh data dari ketiga file Google Sheets dalam satu file (JSON utk restore, Excel utk dibaca). Restore khusus Admin, per tab, dgn konfirmasi ketik PULIHKAN, dan salinan data saat ini otomatis diunduh dulu sebelum ditimpa',
      'Profil Sekolah: tab baru "Riwayat Akreditasi" dgn peringatan setahun sebelum masa berlaku habis, dan "Periode Semester" -- tanggal awal/akhir tiap semester bisa diatur, dan semua modul (presensi, nilai, rapor, laporan) otomatis mengikutinya',
      'Portofolio Siswa kini menampilkan rekam akademik per semester, kehadiran, prestasi, catatan pelanggaran, status rapor, mutasi, dan jumlah peminjaman buku',
      'Isian teks panjang (mis. isi pengumuman) kini memakai kotak teks multi-baris',
    ],
  },
  {
    versi: '1.37.0',
    tanggal: '2026-09-27',
    poin: [
      'MODUL BARU -- Perpustakaan. Kartu pelajar & kartu pegawai (dari menu Barcode & ID Card) langsung berfungsi sbg kartu anggota perpustakaan, tanpa pendaftaran terpisah',
      '"Sirkulasi": pinjam = scan kartu anggota lalu scan beberapa buku sekaligus; kembali = cukup scan label buku. Otomatis mengecek stok, batas jumlah pinjaman, pinjaman yang lewat jatuh tempo, denda yang belum lunas, dan reservasi anggota lain',
      '"Katalog Buku": koleksi fisik & digital lengkap dgn stok tersedia, kode buku otomatis (BK-0001, dst), dan cetak label barcode untuk ditempel di buku',
      '"Reservasi Buku": pesan buku yang sedang dipinjam; saat buku dikembalikan, pemesan pertama otomatis berstatus Siap Diambil, dan saat dipinjam oleh pemesannya otomatis Selesai',
      '"Denda & Keterlambatan": denda keterlambatan tercatat otomatis saat pengembalian, denda kerusakan/kehilangan bisa dicatat manual, tombol Tandai Lunas, estimasi denda berjalan, serta pengaturan lama pinjam, tarif denda & batas buku per anggota',
      '"Laporan Sirkulasi": peminjaman per bulan & per kategori, persentase keterlambatan, buku terpopuler, peminjam teraktif, kelas paling rajin membaca, dan jumlah buku yang tak pernah dipinjam',
    ],
  },
  {
    versi: '1.36.0',
    tanggal: '2026-09-27',
    poin: [
      'MENU BARU -- Laporan & Grafik: "Grafik Nilai & Tren" (rata-rata per mapel dibanding KKM, per kelas, tren bulanan, sebaran predikat, 10 besar & siswa yang perlu pendampingan)',
      '"Grafik Absensi": tren kehadiran harian siswa & guru, pola per hari dalam seminggu, kehadiran per kelas, komposisi status, dan siswa dgn alpha terbanyak',
      '"Grafik Keuangan": pemasukan vs pengeluaran per bulan, saldo kumulatif, tingkat penagihan SPP per bulan, sumber pemasukan, pengeluaran per kategori, dan tunggakan per tingkat',
      '"Pusat Export Laporan": 14 laporan siap unduh ke Excel dari satu tempat (ringkasan statistik, data siswa & guru, kehadiran, nilai & leger, prestasi, pelanggaran, kinerja, tunggakan, kas bulanan, aset) dgn filter tahun ajaran, semester & rentang tanggal. Hanya laporan dari menu yang boleh diakses yang ditampilkan',
      'Dashboard utama: tambahan ringkasan Akademik & Kesiswaan (kehadiran siswa & guru hari ini, terlambat, rata-rata nilai semester, prestasi, kasus pelanggaran terbuka, agenda 2 minggu ke depan)',
    ],
  },
  {
    versi: '1.35.0',
    tanggal: '2026-09-27',
    poin: [
      'MODUL BARU -- Presensi Barcode: "Scan Presensi" utk siswa & guru/staff. Scan pertama hari ini tercatat MASUK, scan berikutnya tercatat PULANG, keterlambatan & denda dihitung otomatis. Bisa pakai scanner barcode USB, ketik kode manual, atau kamera HP (di browser yang mendukung). Kartu tertinggal bisa dicatat lewat pencarian nama',
      'Hasil scan langsung masuk ke data Presensi Siswa dan Presensi Guru & Staff yang sama -- rekap kehadiran, rapor, dan laporan siswa otomatis ikut menghitungnya. Kartu lama dari versi sebelumnya tetap bisa dipakai',
      'MODUL BARU -- "Barcode & ID Card": kartu pelajar & kartu pegawai ukuran KTP (depan-belakang) lengkap dgn barcode presensi, bisa dicetak sekelas sekaligus atau diunduh per kartu sbg gambar JPG',
      'MODUL BARU -- "Dashboard Rekapitulasi" (kehadiran hari ini per kelas, daftar yang terlambat, guru yang belum tercatat), "Laporan Presensi" (keterlambatan, total denda, rata-rata jam masuk per siswa/pegawai), dan "Pengaturan Presensi" (jam masuk, batas toleransi, jam pulang, besaran denda)',
      'Data presensi yang diisi manual lalu disimpan ulang tidak lagi menghapus jam masuk/pulang hasil scan',
    ],
  },
  {
    versi: '1.34.0',
    tanggal: '2026-09-27',
    poin: [
      'MODUL BARU -- Kepegawaian: "Jadwal Mengajar" menampilkan jadwal mingguan tiap guru dan rekap beban mengajar (JP/minggu, kelas & mapel yang diampu, tugas tambahan). Datanya langsung diambil dari Jadwal Pelajaran, jadi tidak perlu input dua kali',
      'MODUL BARU -- "Presensi Guru & Staff": isi presensi harian semua guru & staff sekaligus (Hadir, Sakit, Izin, Dinas Luar, Alpha) lengkap dgn jam masuk/pulang, plus rekap kehadiran per rentang tanggal',
      'MODUL BARU -- "Penilaian Kinerja": penilaian 5 aspek (perencanaan, pelaksanaan, penilaian, kedisiplinan, komunikasi) dgn skor total & predikat otomatis, rekap per guru, dan aspek yang paling perlu ditingkatkan di sekolah',
      'MODUL BARU -- "Pelatihan & Sertifikasi": catatan pelatihan, workshop, seminar, diklat, sertifikasi & studi lanjut, rekap total JP per guru, dan penanda guru yang belum mengikuti kegiatan tahun ini',
    ],
  },
  {
    versi: '1.33.0',
    tanggal: '2026-09-27',
    poin: [
      'MODUL BARU -- "Kalender Akademik": tampilan kalender bulanan (ujian, libur, kegiatan, rapat dgn warna berbeda), bisa difilter per kelas, plus daftar agenda bulan berjalan',
      'MODUL BARU -- "Kurikulum & KKM": atur KKM/KKTP setiap mata pelajaran untuk kelas 1-6 dalam satu tabel, bisa disalin dari tahun ajaran sebelumnya atau diisi otomatis dgn nilai standar',
      'MODUL BARU -- "Rapor Digital": nilai rapor otomatis diambil dari Nilai Akademik lengkap dgn KKM, predikat, ketuntasan & peringkat kelas; ketidakhadiran otomatis dari Presensi Siswa; wali kelas tinggal melengkapi sikap, ekstrakurikuler & catatan, lalu menerbitkan dan mencetak/menyimpan PDF',
      'MODUL BARU -- "Bank Soal & Ujian": kumpulan soal (pilihan ganda, isian, esai) per mapel & kelas, susun ujian dari bank soal, lalu cetak naskah soal dan kunci jawabannya',
    ],
  },
  {
    versi: '1.32.0',
    tanggal: '2026-09-27',
    poin: [
      'MODUL BARU -- Akademik: menu "Jadwal Pelajaran" (jadwal mingguan per kelas, lengkap dgn peringatan otomatis kalau ada guru mengajar di 2 kelas bersamaan atau 1 kelas punya 2 pelajaran di jam yang sama), "Presensi Siswa" (isi presensi sekelas sekaligus per tanggal dgn tombol H/S/I/A, rekap kehadiran per rentang tanggal), dan "Nilai Akademik" (input nilai sekelas sekaligus per penilaian, rekap nilai per mapel lengkap dgn predikat & peringkat)',
      'MODUL BARU -- Kesiswaan: menu "Prestasi & Penghargaan", "Pelanggaran & Konseling" (poin otomatis sesuai kategori, daftar siswa yang perlu pembinaan khusus), dan "Laporan Siswa" (gabungan kehadiran, nilai, prestasi, dan poin pelanggaran per siswa & per kelas, dgn penanda siswa yang perlu perhatian)',
      'Data modul Akademik & Kesiswaan disimpan di file Google Sheets KETIGA (terpisah dari Data Induk & Keuangan) supaya aplikasi tetap ringan walau data presensi terus bertambah setiap hari. Status koneksinya tampil sbg titik "A" di bagian atas layar',
      'Presensi & nilai yang disimpan ulang di tanggal/penilaian yang sama otomatis MEMPERBARUI data lama, bukan membuat data dobel',
      'Semua menu & tab baru sudah bisa diatur aksesnya per role lewat Manajemen Hak Akses',
    ],
  },
  {
    versi: '1.31.31',
    tanggal: '2026-09-18',
    poin: [
      'PERBAIKAN PENTING (bikin app lambat/macet) -- "Pindah Rombel Massal" di Data Siswa > tab Rombel: dulu tiap siswa yang dipindahkan diproses SATU PER SATU ke Google Sheets, dan tiap prosesnya harus menyisir baris data siswa dari awal sampai ketemu -- kalau data siswa sudah ratusan baris dan yang dipindahkan banyak sekaligus, halaman bisa kelihatan macet lama di "Memindahkan..." lalu akhirnya gagal tanpa pesan jelas. Sekarang SEMUA siswa terpilih diproses dalam 1 kali kirim ke Google Sheets, jauh lebih cepat dan tidak mudah macet',
      'PERBAIKAN PERFORMA (server/Google Apps Script) -- proses ubah data 1 baris (dipakai banyak fitur: edit siswa, hapus siswa, pindah rombel, dll) dan proses set Tahun Ajaran Aktif di backend Data Induk (Code.gs) diperbaiki supaya membaca daftar nomor baris SEKALI saja, bukan menyisir baris satu-per-satu -- perbaikan yang sama sudah lebih dulu ada di backend Keuangan, sekarang menyusul di backend Data Induk juga. Efeknya: semua proses ubah/hapus data siswa jadi lebih cepat, terutama kalau jumlah siswa sudah banyak',
    ],
  },
  {
    versi: '1.31.30',
    tanggal: '2026-09-18',
    poin: [
      'Riwayat Pembaruan (Changelog) sekarang ditampilkan 10 versi per halaman, dilengkapi tombol "Sebelumnya" / "Berikutnya" -- sebelumnya semua riwayat digabung dalam 1 halaman panjang yang harus di-scroll terus',
      'Notifikasi "⚠️ Siswa Perlu Tindak Lanjut" di Data Siswa sekarang cuma menampilkan 5 baris pertama supaya kartunya tidak memanjang -- sisanya bisa dilihat lewat tombol "Lihat Semua" yang membuka daftar lengkapnya dalam jendela terpisah',
      'Perbaikan bug: tab "🪪 Portofolio" di Data Siswa blank/kosong begitu 1 siswa dipilih -- ada kesalahan kode yang bikin halaman gagal menghitung info keuangan siswa (kini sudah benar, profil siswa tampil lengkap lagi)',
      'Perbaikan: tab "🎓 Riwayat Siswa" sekarang menampilkan pesan "tidak ditemukan" kalau nama/NISN yang dicari tidak cocok dengan siswa manapun -- sebelumnya kotak pencarian terlihat diam saja tanpa keterangan apa pun, jadi tampak seperti error',
      'Data Siswa: form "Tambah Siswa" dan "Upload Excel" bukan lagi tab terpisah -- sekarang jadi tombol "+ Tambah Siswa" dan "📊 Upload Excel" langsung di tab Data Siswa (Tabel), dan form-nya terbuka sbg jendela (modal) supaya alurnya lebih ringkas',
    ],
  },
  {
    versi: '1.31.29',
    tanggal: '2026-09-18',
    poin: [
      'FITUR BARU -- Data Siswa: tab "🎒 Kenaikan Kelas" utk memproses naik kelas/tinggal kelas/lulus/pindah sekolah/berhenti utk banyak siswa sekaligus di awal tahun ajaran baru. Setiap siswa yang diproses otomatis tercatat rapi sbg riwayat -- Kelas/Tingkat, Rombel, Wali Kelas, dan Status setiap tahun ajaran TIDAK PERNAH ditimpa/dihapus, cuma ditambah terus setiap tahun (data siswa jadi "data induk" yang aman, riwayat kelas/rombelnya yang "bergerak" dicatat terpisah)',
      'FITUR BARU -- Data Siswa: tab "🎓 Riwayat Siswa" dirombak total -- sekarang bisa cari SIAPA SAJA siswa (aktif maupun yang sudah lulus/pindah/berhenti) dan langsung lihat perjalanan lengkapnya dari Kelas 1 sampai sekarang/tamat, lengkap dgn Kelas, Rombel, Wali Kelas, dan Status tiap tahun ajaran. Daftar siswa Lulus/Pindah/Berhenti yang sudah ada sebelumnya tetap ada di bagian bawah',
      'Perbaikan bug: Kartu SPP & Kartu Biaya Lain utk tahun ajaran YANG SUDAH LEWAT sekarang menampilkan Kelas & Rombel siswa PADA TAHUN ITU (kalau sudah pernah diproses lewat Kenaikan Kelas), BUKAN Kelas/Rombel siswa SAAT INI -- sebelumnya siswa yang sudah naik kelas akan salah menampilkan kelas barunya di kartu SPP tahun-tahun sebelumnya',
    ],
  },
  {
    versi: '1.31.28',
    tanggal: '2026-09-18',
    poin: [
      'Cek Data dan Sistem: tab baru "👯 Cek NISN Kembar" -- mendeteksi NISN yang justru TERPAKAI di lebih dari 1 siswa sekaligus (kebalikan dari tab "Cek Data NISN" yang cuma mendeteksi NISN kosong). Setiap NISN kembar ditampilkan berkelompok, lengkap dengan peringatan berapa tagihan/pembayaran yang tercatat di NISN itu, dan 3 aksi per baris: 👁️ Lihat detail lengkap, ✏️ Edit, atau 🗑️ Hapus',
      'Perbaikan bug: mengedit data siswa lewat menu Data Siswa (Tabel) -- termasuk lewat tab "Cek NISN Kembar" yang baru -- diam-diam MENGOSONGKAN Rombel siswa itu setiap kali disimpan, karena field Rombel tidak ikut ditulis ulang saat edit. Sekarang Rombel (dan kolom lain di luar form Edit) selalu ikut dipertahankan seperti semula',
    ],
  },
  {
    versi: '1.31.27',
    tanggal: '2026-09-17',
    poin: [
      'Dashboard: notifikasi "⚠️ Siswa Perlu Tindak Lanjut" sekarang JUGA menangkap siswa yang Kelas/Tingkat-nya sudah diisi tapi belum ditempatkan ke Rombel spesifiknya (mis. Yaman/Epitamala) -- sebelumnya kasus ini tidak ketahuan di notifikasi ini sama sekali, cuma kelihatan kalau admin sengaja buka menu Pengaturan > Data Kelas & Rombel',
      'Kartu SPP & Kartu Biaya Lain: kalau Rombel siswa memang belum diisi/ditempatkan, sekarang tampil jujur "Rombel belum ditentukan" -- BUKAN diam-diam meminjam nama Rombel siswa lain yang kebetulan 1 Tingkat (perbaikan lanjutan dari bug Rombel salah cetak di v1.31.26)',
    ],
  },
  {
    versi: '1.31.26',
    tanggal: '2026-09-17',
    poin: [
      'Perbaikan bug: Kartu SPP & Kartu Biaya Lain (di tab Data Siswa) bisa salah cetak nama Rombel siswa kalau Kelas/Tingkatnya punya LEBIH DARI SATU Rombel (mis. Kelas 6 Yaman & Kelas 6 Epitamala) -- sebelumnya sistem asal ambil Rombel pertama yang ketemu utk tingkat itu, tanpa mencocokkan Rombel siswanya sendiri. Sekarang nama Rombel yang tercetak selalu sesuai data Rombel siswa yang bersangkutan',
    ],
  },
  {
    versi: '1.31.25',
    tanggal: '2026-09-17',
    poin: [
      'Catat Pembayaran: perbaikan kasus ambigu utk tagihan yang punya Nilai Cicilan TAPI "Nominal Tetap Saat Bayar?" dipilih Tidak (mis. Uang Bangunan yang boleh diangsur bebas, Cicilan cuma dipasang sbg referensi nominal per termin). Sebelumnya dropdown "Jumlah Kali Cicilan" tetap muncul walau nominalnya bebas diedit, jadi bisa kepilih "2x" di dropdown tapi nominal yang dicatat malah diketik manual beda sendiri -- sekarang dropdown itu HANYA muncul kalau nominalnya memang dikunci (Nominal Tetap = Ya). Kalau bebas diedit, nilai cicilan cukup ditampilkan sbg info referensi di bawah kolom Nominal Dibayar, tanpa memaksa kelipatan tertentu',
    ],
  },
  {
    versi: '1.31.24',
    tanggal: '2026-09-17',
    poin: [
      'Tarif SPP & Biaya: ada field baru "Nominal Tetap Saat Bayar?" (Ya/Tidak, default Ya) -- ini menggantikan aturan baku yang dipasang manual di v1.31.22 & v1.31.23. Sekarang Admin sendiri yang menentukan per Tarif, apakah nominal yang dibayar di Catat Pembayaran dikunci (Ya) atau boleh diedit bebas (Tidak), berlaku sama utk SPP maupun Tagihan Lain',
      'Artinya: SPP sekarang BISA dibuka lagi supaya bisa dibayar sebagian/dicicil per bulan (tinggal ubah "Nominal Tetap Saat Bayar?" jadi "Tidak" di Tarif SPP-nya) -- sebelumnya di v1.31.23 ini terkunci mutlak tanpa opsi. Begitu juga Tagihan Lain sekarang bisa dikunci meskipun tidak punya Nilai Cicilan',
      'Nilai "Nominal Tetap" ini ikut disalin ke setiap tagihan pas diterbitkan (sama seperti Wajib/Cicilan) -- jadi tagihan yang SUDAH terbit sebelum Tarif-nya diubah tidak otomatis ikut berubah. Kalau perlu, betulkan satu-satu lewat tabel "Daftar Tagihan Lain (Semua Siswa)", atau terbitkan ulang',
    ],
  },
  {
    versi: '1.31.23',
    tanggal: '2026-09-17',
    poin: [
      'Catat Pembayaran: field "Nominal Dibayar (Rp)" utk tagihan SPP bulanan sekarang JUGA dikunci -- otomatis sebesar sisa tagihan bulan itu, tidak bisa diedit manual. Ini keputusan sadar: akibatnya SPP tidak lagi bisa dicatat dibayar SEBAGIAN lewat form ini (harus lunas sekaligus per bulan). Kalau butuh bayar cicilan/sebagian per bulan lagi di kemudian hari, beri tahu supaya bisa dibuka kuncinya lagi',
    ],
  },
  {
    versi: '1.31.22',
    tanggal: '2026-09-17',
    poin: [
      'Catat Pembayaran: utk tagihan yang punya Nilai Cicilan, field "Nominal Dibayar (Rp)" sekarang dikunci (tidak bisa diedit manual) -- nilainya murni mengikuti pilihan "Jumlah Kali Cicilan" di atasnya, jadi tidak ada lagi kemungkinan salah ketik nominal yang tidak sesuai kelipatan cicilan. Ganti jumlah kali cicilan kalau mau bayar jumlah yang berbeda. Utk tagihan yang TIDAK punya Nilai Cicilan, field ini tetap bebas diisi seperti biasa',
    ],
  },
  {
    versi: '1.31.21',
    tanggal: '2026-09-17',
    poin: [
      'Lanjutan perbaikan v1.31.20: kolom pencarian di SEMUA tabel yang berpotensi kena masalah yang sama (Data Aset, Buku Besar, Data Guru & Staff, Data Kelas, Tahun Ajaran, Manajemen User, Log Histori, Tarif SPP & Biaya, Pemasukan Lain, Jurnal Pengeluaran, Beasiswa Kategori, Data Siswa) sekarang dibuat kebal terhadap tipe data apa pun yang tersimpan di Google Sheets (angka, teks, atau kosong) -- diperiksa satu per satu, sudah tidak ada lagi tabel yang berisiko blank putih saat dicari',
    ],
  },
  {
    versi: '1.31.20',
    tanggal: '2026-09-17',
    poin: [
      'Perbaikan bug: tabel "Daftar Tagihan Lain (Semua Siswa)" (fitur baru v1.31.19) bisa membuat layar tiba-tiba blank putih saat mengetik di kolom pencarian, khusus kalau NISN siswa tersimpan di Google Sheets sebagai angka murni (bukan teks). Sudah diperbaiki -- pencarian sekarang aman dipakai utk NISN berformat apa pun',
    ],
  },
  {
    versi: '1.31.19',
    tanggal: '2026-09-17',
    poin: [
      'Tagihan Lain: sekarang ada tabel baru "Daftar Tagihan Lain (Semua Siswa)" di bawah form penerbitan -- setiap tagihan yang sudah terbit ke siswa bisa dibetulkan langsung (Nominal, Wajib/Tidak, Jatuh Tempo, Keterangan, Nilai Cicilan) atau dihapus lewat ikon ✏️/🗑️, tanpa perlu menerbitkan ulang. Cocok utk membetulkan salah input tanpa mengubah tagihan siswa lain',
      'Data sekarang otomatis diperbarui sendiri setiap 30 detik dari Google Sheets (dan juga langsung saat kembali membuka tab browser ini) -- berguna kalau ada staf lain yang sedang mencatat bersamaan, jadi tidak perlu klik "Muat Ulang" manual lagi utk lihat data terbaru. Berjalan diam-diam di belakang layar, tidak mengganggu yang sedang diketik',
      'Perbaikan kecil: pesan konfirmasi saat Edit data (mis. di Riwayat Pembayaran atau Tagihan Lain) yang sebelumnya kadang menampilkan tulisan "undefined" pada nama datanya, sekarang menampilkan nama yang benar',
    ],
  },
  {
    versi: '1.31.18',
    tanggal: '2026-09-17',
    poin: [
      'Catat Pembayaran: tagihan yang punya Nilai Cicilan sekarang punya field baru "Jumlah Kali Cicilan" (mis. 1x/2x/3x) -- pilih mau bayar berapa kali cicilan sekaligus, Nominal Dibayar & Keterangan otomatis terisi mengikuti pilihan itu (mis. "2 kali cicilan"), keduanya tetap bisa diedit manual sesudahnya. Peringatan nominal berlebih juga ikut menyesuaikan jumlah kali yang dipilih',
      'Tarif SPP & Biaya: form "Tambah Tarif" yang dulu selalu tampil penuh di bawah tabel sekarang jadi jendela (modal) yang dibuka lewat tombol "+ Tambah Tarif"',
      'Riwayat Pembayaran: khusus akun Admin, sekarang ada tombol Edit (✏️) dan Hapus (🗑️) di kolom Aksi untuk membetulkan atau membatalkan catatan pembayaran yang salah input -- keduanya perlu konfirmasi password dulu, dan sisa tagihan siswa otomatis terhitung ulang begitu tersimpan/terhapus. Akun selain Admin hanya bisa lihat & cetak Kwitansi seperti biasa',
    ],
  },
  {
    versi: '1.31.17',
    tanggal: '2026-09-17',
    poin: [
      'Manajemen User: setiap akun sekarang punya Status "Aktif"/"Nonaktif" -- klik ikon 🚫 di kolom Aksi utk menonaktifkan akun sementara (tidak bisa dipakai login lagi sampai diaktifkan kembali lewat ikon ✓), tanpa perlu hapus datanya. Tidak bisa menonaktifkan akun yang sedang dipakai login sendiri',
      'Tarif SPP & Biaya: form "Tambah Tarif" punya field baru "Nilai Cicilan (Rp)" (opsional) -- kalau diisi, saat tagihan dari tarif ini dibayar lewat "Catat Pembayaran", nominal yang otomatis terisi adalah sebesar cicilan tadi (bukan langsung seluruh sisa tagihan), dan kalau nominal ditulis melebihi nilai cicilan akan muncul peringatan (tidak memblokir, cuma pengingat)',
      'Catat Pembayaran: field Keterangan sekarang WAJIB diisi utk pembayaran di luar SPP (mis. Uang Pangkal, Seragam, Uang Perpisahan) -- utk pembayaran SPP tetap opsional seperti biasa',
    ],
  },
  {
    versi: '1.31.16',
    tanggal: '2026-09-17',
    poin: [
      'Tab Pembayaran: form "Catat Pembayaran" yang dulu selalu tampil penuh di atas halaman sekarang jadi 1 tombol -- diklik akan membuka jendela lebar 2 kolom: kolom kiri utk cari siswa & catat pembayaran (persis seperti sebelumnya), kolom kanan langsung menampilkan Riwayat Pembayaran siswa yang sedang dipilih, jadi bisa dicek dulu/sesudah tanpa tutup jendela',
      'Widget "Pembayaran Hari Ini": opsi lihat "Kemarin" dihapus dari sini krn isinya nyaris sama dgn tabel Riwayat Pembayaran di bawahnya. Tabel Riwayat Pembayaran sekarang selalu menampilkan SEMUA transaksi (tidak lagi bergantung siswa yg sedang dicari) & sudah punya tombol cepat "Hari Ini" maupun "Kemarin" sendiri',
      'Dashboard SPP: grafik "Tren Nominal Masuk per Bulan" sekarang menampilkan langsung nominalnya di atas tiap titik bulan yang sudah lewat (mis. "Rp 32,2jt"), tidak perlu arahkan mouse dulu utk lihat angkanya',
      'Dashboard SPP: tambah tabel baru "Rekap Pembayaran SPP per Rombel" -- pilih rombel (atau geser Sebelumnya/Berikutnya), lalu lihat status lunas per siswa utk tiap bulan dalam 1 tahun ajaran sekaligus (ceklist hijau = sudah lunas bulan itu, silang merah = belum/baru sebagian, garis "-" = belum ada tagihan bulan itu)',
    ],
  },
  {
    versi: '1.31.15',
    tanggal: '2026-09-17',
    poin: [
      'Modul SPP dirombak: sekarang punya 2 sub-menu -- "Dashboard SPP" (baru) dan "Pembayaran". Halaman "SPP Peserta Didik" dan "Pembayaran & Invoice" yang dulu terpisah sekarang digabung jadi satu halaman "Pembayaran" dengan 3 tab: Data Siswa, Pembayaran, Invoice -- supaya tidak perlu bolak-balik menu untuk urusan yang berhubungan',
      'Dashboard SPP (baru): infografis ringkasan SPP tahun ajaran aktif -- kartu Total Siswa (per 6 tingkatan), Total Tagihan, Sudah Terbayar, Total Tunggakan, & persentase Tingkat Kepatuhan Bayar. Dilengkapi grafik batang Tagihan vs Terbayar per Tingkatan Kelas, grafik donat Status Pembayaran Siswa (Lunas/Sebagian/Belum Bayar), grafik tren nominal masuk per bulan, dan daftar ranking Kelas dengan Tunggakan Tertinggi',
      'Tab Pembayaran sekarang menampilkan daftar "Pembayaran Hari Ini" otomatis di bawah form catat pembayaran -- daftar transaksi pembayaran yang masuk hari ini (nama siswa, jenis, metode, nominal, plus total), dengan tombol untuk lihat transaksi kemarin juga',
      'Menu lama "/spp" tetap bisa diakses (otomatis diarahkan ke halaman Pembayaran) supaya bookmark/pintasan lama tidak rusak',
    ],
  },
  {
    versi: '1.31.14',
    tanggal: '2026-09-17',
    poin: [
      'Tampilan sekarang benar-benar responsif di Tablet & HP -- sebelumnya sidebar menu selalu selebar 250px dan tidak bisa mengecil, jadi di layar sempit menu memakan hampir separuh layar',
      'Di Tablet (layar sedang, mis. iPad): menu berubah jadi rel ikon ramping di kiri + tombol hamburger (☰) untuk buka menu lengkap. Klik ikon Keuangan/Sarpras/Pengaturan membuka daftar sub-menunya di sebelah rel',
      'Di HP: menu berubah jadi bar ikon di bagian bawah layar (seperti aplikasi pada umumnya) -- Dashboard & SPP langsung pindah halaman, sedangkan Keuangan/Sarpras/Pengaturan membuka kotak menu (lebar 60%, tidak penuh layar) berisi sub-menunya',
      'Kotak menu di HP/Tablet tidak lagi menampilkan scrollbar bawaan browser yang terlihat kasar saat isinya panjang -- diganti tanda panah ke atas/bawah yang otomatis muncul kalau masih ada menu tersembunyi di atas/bawah',
      'Tampilan desktop (layar besar) tidak berubah sama sekali -- menu sidebar tetap seperti biasa',
    ],
  },
  {
    versi: '1.31.13',
    tanggal: '2026-09-16',
    poin: [
      'Notifikasi/Log "Catat Pembayaran" dipersingkat -- format lama "Pembayaran X sebesar Rp Y dari Z" sering kepotong di kartu notifikasi yang sempit. Sekarang formatnya "Jenis - NISN Nama - Rp..." (mis. "SPP September 2026 - 1234567890 Ashoka Irawan - Rp 350.000"), lebih ringkas & langsung kelihatan intinya sekilas. Berlaku utk pembayaran per-tagihan maupun Bayar SPP Sekaligus',
    ],
  },
  {
    versi: '1.31.12',
    tanggal: '2026-09-16',
    poin: [
      'Perbaikan bug NYATA (ditemukan langsung dari hasil Cek Data Keuangan v1.31.11): Piutang di Neraca & Buku Besar ternyata BELUM ikut memakai lapis pengaman NISN yang sudah dipasang di Kartu SPP sejak v1.31.7 -- akibatnya pembayaran siswa lain yang RefNo-nya kebetulan sama (data lama) bisa salah "ketiban" ke piutang siswa ini, bikin angka Piutang di Neraca/Buku Besar sedikit meleset. Sekarang keduanya sudah konsisten memakai pengaman NISN yang sama',
      'Cek Data dan Sistem > Cek Data NISN: tiap baris Tagihan SPP/Tagihan Biaya Lain/Pembayaran yang NISN-nya kosong sekarang punya tombol "Perbaiki Otomatis" -- otomatis mengisi NISN dengan mencocokkan nama ke Data Siswa (hanya kalau namanya cocok persis ke 1 siswa saja, dan siswa itu sudah punya NISN). Yang tidak bisa otomatis (nama ganda/tidak ketemu/siswa induknya sendiri belum punya NISN) ditampilkan terpisah supaya bisa diperiksa manual',
      'Cek Data dan Sistem > Cek Data Keuangan: bagian Kas Masuk & Kas Keluar sekarang punya tombol "Perbaiki Nomor Ganda" yang benar-benar berfungsi untuk sheet Pemasukan Lain & Pengeluaran (sebelumnya cuma catatan teks yang menyuruh pindah ke tab lain yang ternyata belum mendukung kedua sheet ini)',
    ],
  },
  {
    versi: '1.31.11',
    tanggal: '2026-09-16',
    poin: [
      'Cek Data dan Sistem: tambah tab ke-3, "Cek Data Keuangan" -- alat bantu utk memeriksa kesehatan data laporan keuangan, dari Kas Masuk & Kas Keluar sampai Buku Besar, Cashflow, Rekapitulasi, Laba Rugi, dan Neraca. Tiap bagian punya tombol "Cek Sekarang" sendiri supaya tidak membebani sistem kalau tidak sedang dibutuhkan',
      'Kas Masuk (Pemasukan Lain) & Kas Keluar (Pengeluaran): cek nomor ganda, transaksi duplikat (tanggal+kategori+keterangan+nominal+akun sama persis, lengkap dgn tombol hapus otomatis sisakan 1), nama akun yang tidak dikenal sistem, & nominal yang tidak valid',
      'Buku Besar: ringkasan dampak dari akun-akun tak dikenal yang ditemukan di atas, plus daftar akun Kewajiban/Modal custom yang dibuat tapi belum ada mekanisme pengisian datanya',
      'Cashflow, Rekapitulasi, & Laba Rugi: masing-masing dihitung ULANG secara independen dari data mentah lalu dibandingkan dgn angka yang tampil di laporan aslinya -- kalau ada selisih, kemungkinan besar penyebabnya adalah transaksi ber-akun tak dikenal di atas',
      'Neraca: piutang & saldo kas dihitung ulang independen, PLUS pengecekan baru yang selama ini belum pernah ada -- apakah Aktiva (Kas+Piutang) benar-benar sama dengan Modal hasil akumulasi Laba Rugi dari awal berdiri, bukan cuma diasumsikan sama seperti sekarang',
    ],
  },
  {
    versi: '1.31.10',
    tanggal: '2026-09-16',
    poin: [
      'Cek Data dan Sistem > Cek Data NISN: fitur baru "Isi NISN Massal (Sementara)" -- 1 tombol untuk memberi kode NISN sementara berurutan (mis. IKH0001, IKH0002, ...) ke semua siswa yang NISN-nya masih kosong sekaligus. Kode yang kebetulan sudah dipakai dilewati otomatis supaya tidak ada yang kembar',
      'Setelah diterapkan, muncul daftar nama siswa yang baru saja diberi NISN sementara itu beserta kodenya masing-masing. Ini nomor SEMENTARA saja, tetap wajib diganti dengan NISN asli begitu tersedia dari Dapodik/sekolah',
    ],
  },
  {
    versi: '1.31.9',
    tanggal: '2026-09-16',
    poin: [
      'Catat Pembayaran: setiap baris "Pilih Tagihan Belum Lunas" sekarang punya pemilih tanggal sendiri di sebelah status Belum Lunas/Sebagian. Tombol "Bayar Sekarang" SENGAJA nonaktif dulu sebelum tanggalnya dipilih -- supaya admin yang input pembayaran tanggal mundur (transaksi lama yang baru dicatat sekarang) selalu sadar & sengaja memilih tanggal yang benar, bukan kepencet ikut tanggal hari ini begitu saja',
      'Tanggal yang dipilih di baris itu otomatis mengisi field "Tanggal Bayar" di jendela Catat Pembayaran -- tetap bisa diubah lagi di sana kalau ternyata salah pilih',
    ],
  },
  {
    versi: '1.31.8',
    tanggal: '2026-09-16',
    poin: [
      'Menu "Bersihkan Data Duplikat" diganti nama jadi "Cek Data dan Sistem" dan sekarang punya 2 tab: Cek Data Duplikat (isinya sama seperti sebelumnya) & Cek Data NISN (baru)',
      'Fitur baru Cek Data NISN: 1 tombol utk memindai Data Siswa, Tagihan SPP, Tagihan Biaya Lain, dan Pembayaran sekaligus — melaporkan berapa baris yang sudah ada NISN & berapa yang belum, lengkap dengan daftar namanya masing-masing. Berguna utk mencari & melengkapi data NISN yang bolong sebelum jadi masalah (lihat perbaikan v1.31.7)',
    ],
  },
  {
    versi: '1.31.7',
    tanggal: '2026-09-16',
    poin: [
      'Perbaikan keamanan data Kartu SPP / Kartu Biaya Lain: sebelumnya, status "Lunas" & potongan beasiswa dicocokkan ke pembayaran HANYA lewat nomor tagihan (RefNo), tanpa mengecek NISN. Kalau ada nomor tagihan yang kebetulan sama antara 2 siswa berbeda (mis. peninggalan dari sebelum perbaikan penomoran), pembayaran siswa A bisa salah "ketiban" ke tagihan siswa B, bikin tagihan siswa B kelihatan Lunas & tidak dapat potongan beasiswa padahal belum pernah dibayar sama sekali',
      'Sekarang pencocokan pembayaran ke tagihan WAJIB juga cocok NISN-nya (data pembayaran lama yang belum punya NISN tetap dihitung seperti biasa, supaya riwayat lama tidak berubah)',
    ],
  },
  {
    versi: '1.31.6',
    tanggal: '2026-09-16',
    poin: [
      'Fitur baru: panel "User Aktif" mengambang di pojok kanan atas, khusus terlihat oleh Admin & Kepala Sekolah. Panel ini otomatis menampilkan kotak kecil tiap kali ada petugas lain yang baru saja melakukan sesuatu di aplikasi (mis. "Inkaso — input biaya...", "Petugas SPP — input SPP bulan..."), lengkap dengan nama, role, dan jam kejadian',
      'Tiap kotak bisa ditutup sendiri-sendiri lewat tombol ✕, dan kotak lama yang tidak ditutup akan otomatis menghilang sendiri setelah 15 menit supaya layar tidak penuh',
      'Tidak perlu setelan tambahan apa pun — panel ini memanfaatkan data Log Histori yang sudah ada, jadi tidak menambah beban ke Google Sheets',
    ],
  },
  {
    versi: '1.31.5',
    tanggal: '2026-09-16',
    poin: [
      'Ketemu penyebab UTAMA hak akses "tidak berubah/balik lagi": sheet Hak Akses ternyata bisa punya lebih dari 1 baris untuk role yang sama (mis. Petugas SPP, Kepala Sekolah), dan aplikasi selama ini cuma membaca baris PALING TERAKHIR untuk tiap role — jadi pengaturan dari baris-baris sebelumnya (yang sebenarnya masih tersimpan utuh di Sheet) diam-diam terabaikan. Sekarang aplikasi menggabungkan SEMUA baris untuk role yang sama, jadi pengaturan lama tidak lagi "terkubur" oleh baris baru',
      'Perbaikan pencegahan di Apps Script supaya baris duplikat seperti itu tidak terus bertambah ke depannya',
    ],
  },
  {
    versi: '1.31.4',
    tanggal: '2026-09-16',
    poin: [
      'Perbaikan Manajemen Hak Akses: fitur sinkron-otomatis di versi sebelumnya (1.31.3) ternyata punya efek samping — kalau lagi sedang uncheck beberapa kotak tapi belum sempat klik "Terapkan", sinkron-otomatis itu bisa menimpa balik centang yang belum disimpan tadi. Sekarang sinkron-otomatis dijeda selama masih ada perubahan yang belum diterapkan, jadi centang yang sedang diedit tidak akan tertimpa lagi',
      'Perbaikan lebih dalam: role yang sudah pernah diatur hak aksesnya (walau baru 1 menu) bisa diam-diam kehilangan proteksi bawaan untuk menu-menu LAIN yang belum pernah disentuh — termasuk 2 menu khusus Admin (Pengaturan Koneksi Google Sheets, Pengaturan Sistem) yang seharusnya selalu tertutup untuk role selain Admin. Sekarang proteksi bawaan itu selalu jadi dasar, baru ditimpa oleh menu yang memang benar-benar pernah diatur manual',
    ],
  },
  {
    versi: '1.31.3',
    tanggal: '2026-09-16',
    poin: [
      'Perbaikan Manajemen Hak Akses: kalau seorang user sudah login dan tab browsernya dibiarkan terbuka lama, perubahan hak akses yang diterapkan Admin setelah itu tidak langsung berlaku untuk sesi yang sudah terbuka tadi (harus logout/refresh manual dulu) — kelihatannya seperti "hak akses tidak berubah sama sekali". Sekarang aplikasi otomatis mengecek ulang hak akses secara berkala dan setiap kali tab dibuka/aktif lagi, jadi pembatasan akses terbaru langsung berlaku tanpa user itu harus logout',
    ],
  },
  {
    versi: '1.31.2',
    tanggal: '2026-09-16',
    poin: [
      'Perbaikan lanjutan Manajemen Hak Akses: ternyata masih ada 1 celah lagi — kalau ada proses ambil data lain yang kebetulan belum selesai (mis. pas aplikasi baru dibuka), hasilnya bisa "menimpa balik" perubahan hak akses yang baru saja disimpan beberapa detik kemudian, walau sudah tampil benar sesaat setelah klik Terapkan. Sekarang aplikasi selalu memastikan cuma data PALING BARU yang dipakai, proses lama yang telat selesai otomatis diabaikan',
      'Tambah pengaman supaya halaman aplikasi tidak "nyangkut" ke versi lama di browser setelah update di-deploy',
    ],
  },
  {
    versi: '1.31.1',
    tanggal: '2026-09-16',
    poin: [
      'Perbaikan: Manajemen Hak Akses — kadang setelah klik "Terapkan" dan muncul pesan berhasil, centang hak akses yang baru saja diubah malah balik lagi ke posisi lama. Penyebabnya bukan datanya gagal tersimpan, tapi cara aplikasi mengambil ulang data langsung setelah simpan sempat kena data "basi" (belum yang terbaru). Sekarang sudah dipastikan aplikasi selalu ambil data paling baru setiap kali refresh, bukan cuma di halaman Hak Akses tapi di semua halaman',
    ],
  },
  {
    versi: '1.31.0',
    tanggal: '2026-09-15',
    poin: [
      'Pembayaran: tambah filter Pilih Kelas dan Pilih Rombel di atas kolom Cari Siswa, supaya lebih mudah menemukan siswa di sekolah yang rombelnya banyak/nama miripan',
      '"Bayar Sekaligus" sekarang jadi tombol di sebelah "Pilih Tagihan Belum Lunas" (bukan tab terpisah lagi) — begitu siswa ditemukan, klik tombolnya langsung buka form Bayar Sekaligus dalam bentuk pop-up, tidak perlu pindah tab & cari ulang siswa yang sama',
    ],
  },
  {
    versi: '1.30.0',
    tanggal: '2026-09-15',
    poin: [
      'Fitur baru: menu Pembayaran &amp; Invoice sekarang punya tab "🗓️ Bayar Sekaligus" — untuk siswa yang membayar SPP di muka/rapel beberapa bulan langsung, walau tagihan bulan-bulan berikutnya belum diterbitkan admin',
      'Bayar Sekaligus: pilih siswa, centang bulan-bulan yang mau dibayar (atau pakai "Bayar sampai bulan ..." untuk pilih cepat) — bulan yang belum ada tagihannya otomatis diterbitkan KHUSUS untuk siswa itu saja (siswa lain tidak ikut ditagih), lalu langsung dicatat lunas dalam satu kali simpan',
    ],
  },
  {
    versi: '1.29.0',
    tanggal: '2026-09-15',
    poin: [
      'Perbaikan akar masalah: Jadwal Penerbitan SPP sebelumnya mengecek "sudah/belum terbit" per BULAN (bukan per siswa) — begitu 1 siswa saja sudah punya tagihan bulan itu (mis. siswa pindahan, atau baru masuk belakangan), tombol Terbitkan langsung hilang dan siswa lain yang belum ditagih jadi nyangkut di "Perlu Tindak Lanjut". Sekarang dicek per siswa: tombol Terbitkan tetap ada selama masih ada yang belum ditagih, dengan jumlahnya ditampilkan langsung di tombol (misal "Terbitkan 473"), dan hanya siswa yang belum punya tagihan itu yang diproses',
      'Jadwal Penerbitan SPP: tabel sekarang ada kolom No, dan "Jumlah Siswa" dipecah jadi 2 kolom terpisah — "Sudah Terbit" dan "Belum Terbit" — plus status baru "Terbit Sebagian" untuk bulan yang baru sebagian siswanya ditagih',
    ],
  },
  {
    versi: '1.28.1',
    tanggal: '2026-09-15',
    poin: [
      'Riwayat Pembaruan: setiap versi sekarang dikelompokkan/collapsed — isi poin pembaruannya baru muncul kalau baris versinya diklik, tidak langsung tampil semua sekaligus',
    ],
  },
  {
    versi: '1.28.0',
    tanggal: '2026-09-15',
    poin: [
      'Data Siswa / Rombel: tab "Rombel" sekarang jadi Laporan Rombel lengkap — pilih Kelas, pilih Rombel spesifik (mis. 1A), klik Tampilkan untuk melihat daftar siswanya, dengan jumlah siswa, pengaturan jumlah baris per halaman (10/20/50/100/Semua), pencarian, dan export Excel & PDF (judul MI Ikhlasiyah / Laporan Rombel / Kelas-Rombel)',
    ],
  },
  {
    versi: '1.27.0',
    tanggal: '2026-09-15',
    poin: [
      'Riwayat Pembayaran: tambah filter rentang tanggal (bisa lihat transaksi hari per hari), kolom Tanggal dipindah ke setelah kolom No, total nominal ditampilkan di bawah kolom Nominal, dan pengaturan jumlah baris per halaman (10/20/50/100/Semua)',
      'Riwayat Pembayaran: export Excel dan PDF sekarang pakai judul 3 baris (MI Ikhlasiyah / Laporan Pembayaran / Tanggal sesuai filter yang aktif)',
    ],
  },
  {
    versi: '1.26.0',
    tanggal: '2026-09-15',
    poin: [
      'Bersihkan Data Duplikat: tambah tombol "🔗 Konsolidasikan" untuk kelompok Ambigu — menggabungkan jadi 1 tagihan, semua riwayat pembayaran ikut dipindahkan (tidak hilang), dan kelebihan bayar (kalau genuinely terjadi) ditampilkan jujur agar bisa ditindaklanjuti',
    ],
  },
  {
    versi: '1.25.1',
    tanggal: '2026-09-15',
    poin: [
      'Bersihkan Data Duplikat: tambah tombol "Lihat Detail" per kelompok ambigu — menampilkan rincian setiap baris dan pembayarannya, supaya bisa diputuskan manual bukan cuma percaya label',
    ],
  },
  {
    versi: '1.25.0',
    tanggal: '2026-09-15',
    poin: [
      'Perbaikan akar masalah: nomor tagihan ("No") kadang bisa kembar akibat penerbitan cepat berturut-turut di masa lalu, menyebabkan alat Bersihkan Duplikat salah mendeteksi banyak baris sebagai "sudah dibayar" — sekarang ada tombol "Perbaiki Nomor Ganda" untuk membetulkannya, dan nomor tidak akan kembar lagi ke depannya',
    ],
  },
  {
    versi: '1.24.0',
    tanggal: '2026-09-15',
    poin: [
      'Tambah indikator status koneksi di header — 2 titik berdenyut "D" (Data Induk) dan "K" (Keuangan), hijau saat terhubung, merah saat tidak, otomatis kembali hijau ketika koneksi pulih tanpa perlu reload halaman',
    ],
  },
  {
    versi: '1.23.0',
    tanggal: '2026-09-15',
    poin: [
      'Kurangi "sering kondek/diskonek" — pengambilan data sekarang otomatis dicoba ulang kalau gagal sesaat, sebelum benar-benar ditampilkan sebagai error',
    ],
  },
  {
    versi: '1.22.0',
    tanggal: '2026-09-15',
    poin: [
      'Fitur baru (khusus Kepala Sekolah/Admin): halaman "Bersihkan Data Duplikat" — deteksi & hapus otomatis tagihan SPP/Biaya Lain yang kembar, aman karena tidak pernah menyentuh baris yang sudah dibayar',
      'Halaman yang sama juga mendeteksi tagihan Biaya Lain yang kelas siswanya tidak cocok lagi dengan Tarif yang berlaku sekarang',
    ],
  },
  {
    versi: '1.21.2',
    tanggal: '2026-09-15',
    poin: [
      'Perbaikan bug serius: tagihan SPP/Biaya Lain bisa terbit dobel berulang kali kalau tombol "Terbitkan" diklik lagi sebelum data selesai diperbarui — sekarang tombol benar-benar terkunci sampai data terkonfirmasi',
    ],
  },
  {
    versi: '1.21.1',
    tanggal: '2026-09-15',
    poin: [
      'Pindah Rombel Massal: tambah Filter Kelas dan 2 tab (Belum/Sudah Ada Rombel) dengan hitungan jumlah, plus kolom Rombel Saat Ini',
    ],
  },
  {
    versi: '1.21.0',
    tanggal: '2026-09-15',
    poin: [
      'Fitur baru: Pindah Rombel Massal di tab Rombel — pilih beberapa siswa sekaligus, pindahkan ke rombel (ruang kelas) tujuan tanpa edit satu-satu',
      'Data Siswa sekarang menyimpan Rombel spesifik (mis. "1A"), bukan cuma tingkat kelas — Filter Rombel di SPP dan Wali Kelas di tab Rombel jadi lebih akurat',
    ],
  },
  {
    versi: '1.20.0',
    tanggal: '2026-09-15',
    poin: [
      'Kategori Beasiswa sekarang diisi nilai potongan Rupiah langsung (mis. Rp 40.000), bukan lagi persentase',
      'Perbaikan bug: potongan beasiswa yang sudah ada sejak tagihan terbit tidak lagi terhitung dua kali saat ditampilkan/dibayar',
    ],
  },
  {
    versi: '1.19.0',
    tanggal: '2026-09-15',
    poin: [
      'Manajemen Hak Akses: ditemukan 1 halaman dengan tab bersarang (Tahun Ajaran di dalam Profil Sekolah) — sekarang bisa diatur sampai 3 tingkat, memastikan seluruh halaman bertab di aplikasi tercakup',
    ],
  },
  {
    versi: '1.18.0',
    tanggal: '2026-09-14',
    poin: [
      'Manajemen Hak Akses: tambah tombol "Terapkan" — centang kotak sekarang instan (tidak menunggu tersimpan satu-satu), baru benar-benar tersimpan setelah tombol diklik. Perubahan yang belum diterapkan disorot kuning',
    ],
  },
  {
    versi: '1.17.1',
    tanggal: '2026-09-14',
    poin: [
      'Perbaikan bug: mengatur beberapa hak akses berturut-turut untuk role yang baru dibuat kadang gagal tersimpan — sekarang setiap perubahan disimpan lebih andal satu per satu',
    ],
  },
  {
    versi: '1.17.0',
    tanggal: '2026-09-14',
    poin: [
      'Manajemen User: bisa tambah role/jabatan baru sendiri lewat tombol "+ Tambah Role"',
      'Hak akses sekarang tersimpan permanen (sebelumnya hilang tiap refresh halaman)',
      'Manajemen Hak Akses sekarang bisa diatur sampai level tab di dalam tiap menu (klik ▸ untuk buka), bukan cuma per-menu',
      'Riwayat Pembaruan (Changelog) sekarang juga bisa diatur hak aksesnya',
    ],
  },
  {
    versi: '1.16.0',
    tanggal: '2026-09-14',
    poin: [
      'Kecepatan koneksi ke Google Sheets ditingkatkan — dari 14 permintaan terpisah setiap buka aplikasi, sekarang digabung jadi cuma 2 permintaan besar. Diharapkan lebih jarang muncul "tidak terhubung" dan loading awal lebih cepat',
    ],
  },
  {
    versi: '1.15.1',
    tanggal: '2026-09-13',
    poin: [
      'Perbaikan bug penting: SPP yang sudah pernah dibayar SEBELUM beasiswa dipasang tidak lagi ikut disunat jadi Rp 0 — potongan sekarang benar-benar hanya berlaku maju (ke tagihan yang belum dibayar)',
      'Keterangan potongan di Kartu SPP disingkat jadi "Beasiswa" saja, tidak lagi kalimat panjang',
    ],
  },
  {
    versi: '1.15.0',
    tanggal: '2026-09-13',
    poin: [
      'Beasiswa sekarang bisa dipasang SETELAH tagihan terlanjur terbit — potongan otomatis dihitung saat lihat kartu/bayar, tidak perlu hapus & terbitkan ulang tagihan lama',
      'Form Catat Pembayaran menampilkan kotak potongan beasiswa (harga asli dicoret, badge kategori, nominal setelah potongan) dan otomatis mengisi nominal yang harus dibayar',
      'Kartu SPP, Rekap Tunggakan, Neraca, Buku Besar, dan Portofolio Siswa semua ikut menghitung potongan ini secara konsisten',
    ],
  },
  {
    versi: '1.14.0',
    tanggal: '2026-09-13',
    poin: [
      'Kartu SPP dan Kartu Biaya Lain sekarang punya kolom "Keterangan" — menampilkan info potongan beasiswa (kategori & persentase) untuk bulan yang mendapat potongan',
    ],
  },
  {
    versi: '1.13.0',
    tanggal: '2026-09-13',
    poin: [
      'Perbaikan bug: tagihan dengan potongan beasiswa 100% (Rp 0) sekarang otomatis berstatus "Lunas" saat diterbitkan, tidak lagi nyangkut selamanya di "Belum Lunas"',
      'Field "Tanggal Mulai" pada Siswa Penerima Beasiswa sekarang benar-benar berfungsi — potongan hanya berlaku untuk tagihan mulai bulan itu ke depan, bukan lagi cuma catatan',
    ],
  },
  {
    versi: '1.12.1',
    tanggal: '2026-09-11',
    poin: [
      'Tampilan "Lihat" Sarpras dirombak total: kartu lengkap dengan kop surat sekolah, foto+detail berdampingan, total nilai estimasi, dan tombol share ke gambar',
    ],
  },
  {
    versi: '1.12.0',
    tanggal: '2026-09-11',
    poin: [
      'Pencarian SPP Peserta Didik sekarang menampilkan keterangan jumlah siswa hasil filter (mis. "Terdapat 3 Siswa Kelas 1 Rombel Arofah dari 488 Siswa")',
      'Badge "Penerima Beasiswa" muncul di bawah nama siswa (SPP Peserta Didik & Portofolio Siswa) — tidak ikut tampil di Kartu SPP/Biaya Lain',
      'Tampilan "Lihat Detail" Sarpras dirombak total — ada kop surat sekolah, foto & kondisi di kiri, detail lengkap + total nilai di kanan, bisa dibagikan sebagai gambar',
    ],
  },
  {
    versi: '1.11.0',
    tanggal: '2026-09-11',
    poin: [
      'Kartu SPP sekarang menampilkan detail siswa (Nama, Kelas, Rombel, Tahun Pelajaran) dan selalu tampil 12 bulan penuh',
      'Kwitansi ditambah logo & alamat sekolah, tanda tangan "PETUGAS SPP", dan tombol share ke WhatsApp',
      'Pencarian SPP Peserta Didik bisa difilter per Kelas dan Rombel',
      'Fitur baru: <b>Beasiswa</b> — atur kategori (Anak Yatim, Dhuafa, dll) dan siswa penerimanya; tagihan SPP/Biaya Lain otomatis dipotong sesuai kategori saat diterbitkan',
      'Sarpras sekarang punya field Harga Estimasi per unit — total nilai seluruh Sarpras tampil di kartu ringkasan dan laporan',
    ],
  },
  {
    versi: '1.10.2',
    tanggal: '2026-09-08',
    poin: [
      'Perbaikan bug: logo dan nama sekolah yang diupload lewat Pengaturan > Profil Sekolah sekarang benar tampil di layar Login dan Sidebar (sebelumnya masih logo bawaan yang tidak tersambung)',
    ],
  },
  {
    versi: '1.10.1',
    tanggal: '2026-09-08',
    poin: [
      'Perbaikan bug penting: Buku Besar Piutang Siswa sempat bisa tampil minus kalau ada siswa yang bayar lebih awal dari jatuh tempo — sekarang saldo tidak akan pernah minus',
      'Baris "Saldo Awal" di Buku Besar diganti namanya jadi "Saldo Bulan Sebelumnya" agar lebih jelas',
    ],
  },
  {
    versi: '1.10.0',
    tanggal: '2026-09-08',
    poin: [
      'Buku Besar: total Debit/Kredit/Saldo sekarang jadi bagian tabel (rapi sejajar kolom), tidak lagi kartu terpisah',
      'Buku Besar: bisa filter per bulan, dan Saldo Awal tiap bulan otomatis diambil dari saldo akhir bulan sebelumnya',
      'Buku Besar: tombol Export Excel untuk akun yang dipilih maupun semua akun sekaligus',
      'Semua nilai Rupiah di Laporan Keuangan sekarang rapi rata kanan',
      'Tombol Export Excel ditambahkan ke Cashflow, Rekapitulasi, Laba Rugi, dan Neraca',
    ],
  },
  {
    versi: '1.9.0',
    tanggal: '2026-09-08',
    poin: [
      'Perbaikan bug: Kode Akun di Buku Besar tidak lagi berubah jadi tanggal aneh saat disimpan',
      'Cashflow sekarang menampilkan tiap akun kas/bank secara terpisah (garis warna berbeda per akun), bukan digabung jadi satu angka Kas',
      'Rekapitulasi dan Laba Rugi bisa dipilih per bulan tertentu, tidak cuma tabel ringkas 12 bulan',
      'Laba Rugi per bulan sekarang tampil rapi vertikal (Pendapatan → Pengeluaran → Laba/Rugi Bersih), gaya sama seperti Neraca',
      'Neraca sekarang menampilkan semua akun kas/bank yang ada, termasuk akun baru yang belum ada transaksinya',
    ],
  },
  {
    versi: '1.8.0',
    tanggal: '2026-09-07',
    poin: [
      'Form Catat Pembayaran, Pemasukan Lain, dan Pengeluaran sekarang punya pilihan "Akun Kas/Bank" — tentukan uangnya masuk/keluar dari akun mana (Kas fisik, atau Bank BCA misalnya)',
      'Buku Besar sekarang benar-benar memisahkan mutasi per akun sesuai pilihan itu, mencegah selisih saldo antar akun kas/bank',
    ],
  },
  {
    versi: '1.7.0',
    tanggal: '2026-09-07',
    poin: [
      'Fitur baru: <b>Buku Besar</b> — pilih akun (Kas, Piutang, Pendapatan, Beban) untuk lihat riwayat mutasi dan saldo berjalan, bisa tambah akun sendiri',
      'Neraca sekarang bisa dilihat per bulan tertentu, tidak cuma kondisi hari ini',
      'Perbaikan bug penting: angka Kas di Neraca sebelumnya belum menghitung Pemasukan Lain, sekarang sudah benar dan sinkron dengan Cashflow',
      'Halaman Dashboard Eksekutif dihapus (fungsinya sudah tercakup di laporan lain)',
    ],
  },
  {
    versi: '1.6.0',
    tanggal: '2026-09-07',
    poin: [
      'Form "Pemasukan Lain" dan "Pengeluaran" kini muncul sebagai jendela pop-up (klik tombol "+ Baru"), bukan tertata permanen di bawah tabel',
      'Perbaikan bug: tabel sekarang pasti ter-update begitu selesai menyimpan data baru',
      'Animasi konfirmasi simpan sekarang juga tampil di Catat Pembayaran, Tambah User, Ganti Password, dan Profil Sekolah',
    ],
  },
  {
    versi: '1.5.1',
    tanggal: '2026-09-07',
    poin: [
      'Fitur baru: halaman <b>Riwayat Pembaruan</b> ini sendiri — klik nomor versi di footer untuk melihat semua perubahan aplikasi dari awal',
    ],
  },
  {
    versi: '1.5.0',
    tanggal: '2026-09-07',
    poin: [
      'Fitur baru: <b>Pemasukan Lain & Pengeluaran</b> — catat donasi, bantuan pemerintah, dan pengeluaran operasional sekolah dalam 1 menu',
      'Laporan <b>Laba Rugi</b> sekarang ikut menghitung Pemasukan Lain, bukan cuma SPP',
      'Laporan baru: <b>Cashflow & Kondisi Kas</b> — lihat saldo kas berjalan tiap bulan beserta grafik trennya',
    ],
  },
  {
    versi: '1.4.1',
    tanggal: '2026-09-07',
    poin: [
      'Rapikan tampilan Kartu SPP & Kartu Biaya Lain — angka rupiah kini rapi sejajar seperti kartu fisik',
    ],
  },
  {
    versi: '1.4.0',
    tanggal: '2026-09-07',
    poin: [
      'Kartu SPP & Kartu Biaya Lain kini terpisah rapi (2 kolom di layar besar), lengkap dengan header sekolah',
      'Bisa dibagikan langsung sebagai gambar ke WhatsApp lewat tombol share di tiap kartu',
    ],
  },
  {
    versi: '1.3.2',
    tanggal: '2026-09-06',
    poin: [
      'Perbaikan visual: warna judul Portofolio Guru, nama panjang tidak lagi terpotong',
      'Status Belum Lunas/Lunas di Portofolio Siswa kini berwarna merah/hijau',
      'Grafik "Sebaran per Kelas" tampil lebih menarik (kartu warna-warni)',
    ],
  },
  {
    versi: '1.3.1',
    tanggal: '2026-09-06',
    poin: [
      'Perbaikan bug: kotak saran pencarian (Portofolio, Catat Pembayaran, dll) yang sebelumnya bisa terpotong, sekarang selalu tampil utuh',
    ],
  },
  {
    versi: '1.3.0',
    tanggal: '2026-09-06',
    poin: [
      'Fitur baru: <b>Portofolio Siswa</b> dan <b>Portofolio Guru/Staff</b> — kartu profil siap cetak, tinggal cari nama',
    ],
  },
  {
    versi: '1.2.0',
    tanggal: '2026-09-06',
    poin: [
      'Semua kartu statistik di seluruh aplikasi sekarang punya ikon',
      'Tambah kartu "Total Nilai Belum Dibayar" di Pembayaran & Invoice',
    ],
  },
  {
    versi: '1.1.1',
    tanggal: '2026-09-06',
    poin: [
      'Perbaikan penting: sesi login tidak lagi otomatis keluar saat halaman di-refresh',
      'Tambah kartu "Total Invoice Belum Lunas"',
    ],
  },
  {
    versi: '1.1.0',
    tanggal: '2026-09-06',
    poin: [
      'Tambah kartu ringkasan (Total Transaksi, Total Dibayar, Pembayaran Bulan Ini) di halaman Pembayaran & Invoice',
    ],
  },
  {
    versi: '1.0.9',
    tanggal: '2026-09-06',
    poin: [
      'Dashboard sekarang lengkap dengan Ringkasan Keuangan dan Ringkasan Sarpras beserta grafiknya',
    ],
  },
  {
    versi: '1.0.8',
    tanggal: '2026-09-06',
    poin: [
      'Laporan Rekap Aset bisa diekspor ke Word (.docx) — bisa langsung diedit, bukan cuma gambar',
    ],
  },
  {
    versi: '1.0.7',
    tanggal: '2026-09-06',
    poin: [
      'Laporan Rekap Aset bisa diekspor ke PDF (ukuran kertas A4, siap cetak)',
    ],
  },
  {
    versi: '1.0.6',
    tanggal: '2026-09-06',
    poin: [
      'Perbaikan bug: angka di Laporan Rekap Aset yang sempat salah tampil (0 dan NaN)',
    ],
  },
  {
    versi: '1.0.5',
    tanggal: '2026-09-06',
    poin: [
      'Data Aset dirombak: kondisi Baik/Rusak Ringan/Rusak Berat sekarang terpisah dan Total dihitung otomatis',
      'Bisa upload foto aset, dan tambah Kode Aset manual',
      'Tambah tombol "Lihat" untuk melihat detail aset lengkap dengan foto',
    ],
  },
  {
    versi: '1.0.4',
    tanggal: '2026-09-05',
    poin: [
      'Saat klik Simpan, muncul animasi progres dan pesan sukses yang lebih jelas',
    ],
  },
  {
    versi: '1.0.3',
    tanggal: '2026-09-05',
    poin: [
      'Data Guru & Staff: field "Tugas Tambahan" sekarang bisa diisi lebih dari satu (mis. Kepala Madrasah + Ketua Yayasan sekaligus)',
      'Kategori tambah pilihan "Guru & Staff" untuk yang berperan ganda',
    ],
  },
  {
    versi: '1.0.2',
    tanggal: '2026-09-05',
    poin: [
      'Data Guru & Staff disederhanakan jadi 1 tabel dengan filter, bukan 2 tab terpisah',
    ],
  },
  {
    versi: '1.0.1',
    tanggal: '2026-09-05',
    poin: [
      'Semua file Excel yang diunduh sekarang punya kolom nomor urut otomatis',
      'Tambah nomor versi & waktu update di footer, supaya gampang cek apakah aplikasi sudah ter-update',
    ],
  },
  {
    versi: '1.0.0',
    tanggal: '2026-09-04',
    poin: [
      '🎉 Rilis awal — migrasi penuh dari HTML ke aplikasi React',
      'Modul SPP: Data Siswa, Kelas, Guru, Tagihan, Pembayaran, Invoice, Rekap Tunggakan, Laporan Keuangan',
      'Modul Sarpras: Data Aset, Peminjaman, Pemeliharaan, Laporan Rekap Aset',
      'Export Excel & PDF di semua tabel, koneksi Google Sheets tertanam aman',
    ],
  },
];
