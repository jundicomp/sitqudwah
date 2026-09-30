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
  // ⚠️ Isi `secret` masing-masing PERSIS sama dgn baris `const SECRET = '...'`
  // di Apps Script file tsb (huruf besar-kecil & tanda baca harus sama).
  master: {   // File "Data Induk"  -> google-apps-script/Code.gs
    url: 'https://script.google.com/macros/s/AKfycbzWOIrNe1A5GDpyyM7PC4D6Z9-LFzPkDKdlOzAyXSNKacSKfNMx1fa5OJRZ8FGSnqeN/exec',
    secret: 'ISI_SECRET_DATA_INDUK',
  },
  keuangan: { // File "Keuangan"    -> google-apps-script/Code-Keuangan.gs
    url: 'https://script.google.com/macros/s/AKfycbxmUCe7XOzPnrKyiwDBbckkjU7poLhrYQcMqw5skX2RlbXDyMqT8P0bFynfBWVk5cuteg/exec',
    secret: 'ISI_SECRET_KEUANGAN',
  },
  akademik: { // File "Akademik"    -> google-apps-script/Code-Akademik.gs
    url: 'https://script.google.com/macros/s/AKfycbxSxPinqswSbJTS_GU-aOAuaXk5VdVIfpVArKkaczbdE9r0ByPdfbQo3WXLxAekxH6T/exec',
    secret: 'ISI_SECRET_AKADEMIK',
  },
};
