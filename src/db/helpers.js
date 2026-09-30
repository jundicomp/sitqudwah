export const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export const BULAN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export function formatRupiah(n){
  const v = Math.round(n || 0);
  return 'Rp ' + v.toLocaleString('id-ID');
}
export function formatTanggal(d){
  if(!d) return '-';
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.getDate() + ' ' + BULAN_ID[dt.getMonth()] + ' ' + dt.getFullYear();
}
// Ubah "yyyy-MM-dd" (format tersimpan, wajib begini krn dipakai <input type="date">)
// jadi "dd-mm-yyyy" KHUSUS UNTUK TAMPILAN tabel/laporan. Sengaja manipulasi teks
// langsung (bukan lewat objek Date) supaya TIDAK ada risiko geser zona waktu sama sekali.
export function formatTanggalAngka(isoStr){
  if(!isoStr) return '-';
  const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return `${m[3]}-${m[2]}-${m[1]}`;
  return isoStr; // format lain (mis. sudah d/m/yyyy dari data lama) -- tampilkan apa adanya
}
export function isoDate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt.toISOString().slice(0,10);
}

// Pengganti aman utk "new Date().toISOString().slice(0,10)" -- pola itu BISA salah
// tanggal (mundur 1 hari) kalau dipakai dini hari WIB (00:00-06:59), krn toISOString()
// selalu mengonversi ke UTC dulu (WIB = UTC+7). Dipakai di mana pun butuh "hari ini"
// dlm bentuk teks "yyyy-MM-dd" (default tanggal form, nama file backup, dst).
export function todayWIB(){
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(new Date());
}
export function pad(n, len){ return String(n).padStart(len, '0'); }

export function initials(name){
  if(!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
const AVATAR_COLORS = ['#1C7A3C','#1E4FA0','#B23B2E','#5B3E8E','#B9790E','#2B5138'];
export function avatarColor(seed){
  let hash = 0;
  const s = String(seed || '');
  for(let i=0;i<s.length;i++) hash = (hash*31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function tagihanStatus(nominal, terbayar){
  if(terbayar <= 0) return 'Belum Lunas';
  if(terbayar >= nominal) return 'Lunas';
  return 'Sebagian';
}

// Parse tanggal dari berbagai format yang mungkin masuk dari Excel/Sheets:
// "10/05/2017" (dd/mm/yyyy, format Indonesia -- dari toLocaleDateString('id-ID')),
// "2017-05-10" (ISO), atau objek Date asli. Return null kalau tidak bisa diparse.
export function parseTanggalFleksibel(input){
  if(!input) return null;
  if(input instanceof Date && !isNaN(input)) return input;
  const s = String(input).trim();
  if(!s) return null;
  // dd/mm/yyyy atau dd-mm-yyyy
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m){
    const d = new Date(parseInt(m[3]), parseInt(m[2])-1, parseInt(m[1]));
    return isNaN(d) ? null : d;
  }
  // yyyy-mm-dd (ISO)
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m){
    const d = new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
    return isNaN(d) ? null : d;
  }
  const fallback = new Date(s);
  return isNaN(fallback) ? null : fallback;
}

// Normalisasi nilai tanggal APA PUN jadi "yyyy-MM-dd" yg BENAR -- supaya <input
// type="date"> selalu bisa menampilkan isinya, apa pun kondisi data mentahnya.
// INI JARING PENGAMAN di sisi React: idealnya Apps Script sudah mengirim tanggal
// bersih (lihat formatCellValue_ di Code.gs), tapi kalau BELUM sempat di-redeploy
// (atau ada baris lama yg terlewat), fungsi ini tetap mengoreksi tampilannya dgn
// benar -- bukan cuma "asal ambil 10 karakter pertama" yg bisa salah 1 hari, tapi
// genuinely dikonversi ke zona WIB dulu spt yg seharusnya dilakukan Apps Script.
export function normalisasiTanggalUntukInput(rawValue){
  if(!rawValue) return '';
  const s = String(rawValue).trim();
  if(!s) return '';

  // Sudah bersih, persis format yg dibutuhkan <input type="date">.
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO lengkap dgn jam+zona (data "kotor" langsung dari sel Tanggal asli Sheets,
  // sebelum/tanpa perbaikan Apps Script) -- parse sbg Date SUNGGUHAN, baca ulang
  // dlm zona WIB supaya tanggalnya tidak bergeser mundur 1 hari akibat UTC.
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)){
    const d = new Date(s);
    if(!isNaN(d)){
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
      return formatter.format(d); // locale en-CA menghasilkan yyyy-MM-dd persis
    }
  }

  // dd/mm/yyyy atau dd-mm-yyyy (data lama yg diketik manual dlm format Indonesia)
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;

  return '';
}

// Gabungan normalisasi + format tampilan -- dipakai di KOLOM TABEL mana pun yg
// menampilkan tanggal mentah dari Sheets. Menangani baik data yg sudah bersih
// maupun yg masih kotor (ISO+jam+Z), SELALU menghasilkan dd-mm-yyyy yg benar.
export function formatTanggalTampil(rawValue){
  return formatTanggalAngka(normalisasiTanggalUntukInput(rawValue));
}

export function hitungUsia(tanggalLahirInput){
  const lahir = parseTanggalFleksibel(tanggalLahirInput);
  if(!lahir) return null;
  const now = new Date();
  let usia = now.getFullYear() - lahir.getFullYear();
  const belumUlangTahun = (now.getMonth() < lahir.getMonth()) ||
    (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
  if(belumUlangTahun) usia--;
  return usia >= 0 ? usia : null;
}
