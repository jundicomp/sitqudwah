/**
 * ===================================================================
 * KONEKSI GOOGLE SHEETS — DITANAM PERMANEN DI KODE (Cara 1)
 * ===================================================================
 * Sesuai keputusan: aplikasi ini SATU sekolah, jadi URL & sandi Apps
 * Script ditanam langsung di sini -- browser mana pun otomatis
 * langsung terhubung, tidak perlu isi Pengaturan Koneksi manual lagi.
 *
 * ⚠️ INGAT (sudah didiskusikan panjang sebelumnya): nilai di file ini
 * IKUT TER-BUILD ke file JavaScript yang dikirim ke SETIAP pengunjung
 * website -- bukan rahasia yang benar-benar tersembunyi. Siapa pun yang
 * buka DevTools browser (atau repo GitHub kalau statusnya Publik) bisa
 * menemukan nilai ini. Amannya cuma sebatas: orang itu MAKSIMAL bisa
 * baca/tulis ke 2 Google Sheets ini -- tidak lebih dari itu.
 *
 * Mau ganti URL/sandi? Edit nilai di bawah ini, lalu build ulang &
 * upload ulang. TIDAK ADA cara mengubahnya dari dalam aplikasi lagi
 * (Pengaturan Koneksi sudah dinonaktifkan, sesuai permintaan).
 * ===================================================================
 */
export const DEFAULT_SHEETS_CONFIG = {
  master: {
    url: 'https://script.google.com/macros/s/AKfycbyX53aeXaijLqakdW8jJWFCekkiQ5H4mzJmBBEH6pew5-5fez5lE1iBHmhw8v55CnK4/exec',
    secret: '123456',
  },
  keuangan: {
    url: 'https://script.google.com/macros/s/AKfycbxkQd7gpPCOPA3PKexbCOv1iUji65tI0NNV_lJl8kTDe6N5BToLiQGJsugJVF3y9Rlr-w/exec',
    secret: '123456',
  },
  // File Sheets KETIGA (Jadwal, Presensi, Nilai, Prestasi, Pelanggaran) -- lihat
  // google-apps-script/Code-Akademik.gs. Selama url masih kosong, halaman-halaman
  // modul Akademik & Kesiswaan menampilkan pesan "belum tersambung", modul lain aman.
  akademik: {
    url: 'https://script.google.com/macros/s/AKfycbzWOIrNe1A5GDpyyM7PC4D6Z9-LFzPkDKdlOzAyXSNKacSKfNMx1fa5OJRZ8FGSnqeN/exec',
    secret: 'ISI_DENGAN_SECRET_DI_CODE_AKADEMIK_GS',
  },
};
