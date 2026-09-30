// Presensi Barcode: format kode kartu, jam WIB, keterlambatan & denda, pengaturan.
import { pegawaiAktif } from './kepegawaianFields';

// Default sama dgn versi HTML. Disimpan di tab "Pengaturan Presensi" sbg key-value.
export const PENGATURAN_DEFAULT = {
  jamMasukSiswa: '07:00', batasMasukSiswa: '07:15', jamPulangSiswa: '13:00',
  jamMasukGuru: '06:30', batasMasukGuru: '06:45', jamPulangGuru: '15:30',
  nilaiDenda: '2000', perkalianDenda: '1', satuanMenitDenda: '15',
};
export const LABEL_PENGATURAN = {
  jamMasukSiswa: 'Jam masuk siswa', batasMasukSiswa: 'Batas toleransi masuk siswa', jamPulangSiswa: 'Jam pulang siswa',
  jamMasukGuru: 'Jam masuk guru & staff', batasMasukGuru: 'Batas toleransi masuk guru & staff', jamPulangGuru: 'Jam pulang guru & staff',
  nilaiDenda: 'Denda per satuan keterlambatan (Rp)', perkalianDenda: 'Pengali denda', satuanMenitDenda: 'Satuan keterlambatan (menit)',
};

export function bacaPengaturan(rows) {
  const out = { ...PENGATURAN_DEFAULT };
  rows.forEach(r => { const k = String(r['Kunci'] ?? '').trim(); if (k in out && String(r['Nilai'] ?? '').trim() !== '') out[k] = String(r['Nilai']).trim(); });
  return out;
}

// ---- Jam & tanggal WIB, tidak tergantung zona waktu komputer ----
export function sekarangWIB() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { tanggal: `${p.year}-${p.month}-${p.day}`, jam: `${p.hour}:${p.minute}` };
}
export const keMenit = (jam) => { const [h, m] = String(jam || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };

// Denda = ceil(menit terlambat / satuan) x nilai denda x pengali (linear, sama dgn HTML).
export function hitungKeterlambatan(jenis, jamMasuk, st) {
  const batas = jenis === 'siswa' ? st.batasMasukSiswa : st.batasMasukGuru;
  const menitTerlambat = Math.max(0, keMenit(jamMasuk) - keMenit(batas));
  const satuan = Math.max(1, Number(st.satuanMenitDenda) || 15);
  const denda = menitTerlambat ? Math.ceil(menitTerlambat / satuan) * (Number(st.nilaiDenda) || 0) * (Number(st.perkalianDenda) || 0) : 0;
  return { menitTerlambat, denda };
}

// ---- Kode kartu ----
// Siswa: "S:<NISN>". Guru/staff: "G:<NIP>", atau "G#<No baris>" kalau belum punya NIP.
// Format lama versi HTML ("SISWA|nisn|nama", "GURU|nip|nama") tetap dikenali.
export const kodeSiswa = (s) => (s.nisn ? `S:${s.nisn}` : '');
export const kodeGuru = (g) => (g.nip ? `G:${g.nip}` : `G#${g.no}`);

export function cariDariKode(raw, siswa, guru) {
  const t = String(raw || '').trim();
  if (!t) return null;
  let tipe = null; let nomor = null; let byNo = false;
  if (/^S:/i.test(t)) { tipe = 'siswa'; nomor = t.slice(2).trim(); }
  else if (/^G#/i.test(t)) { tipe = 'guru'; nomor = t.slice(2).trim(); byNo = true; }
  else if (/^G:/i.test(t)) { tipe = 'guru'; nomor = t.slice(2).trim(); }
  else if (/^SISWA\|/i.test(t)) { tipe = 'siswa'; nomor = t.split('|')[1]?.trim(); }
  else if (/^GURU\|/i.test(t)) { tipe = 'guru'; nomor = t.split('|')[1]?.trim(); }
  else if (/^\d{6,}$/.test(t)) { // angka polos: coba NISN dulu, lalu NIP
    const s = siswa.find(x => x.nisn === t); if (s) return { tipe: 'siswa', data: s };
    const g = guru.find(x => x.nip === t); if (g) return { tipe: 'guru', data: g };
    return null;
  }
  if (!tipe || !nomor) return null;
  if (tipe === 'siswa') { const s = siswa.find(x => x.nisn === nomor); return s ? { tipe, data: s } : null; }
  const g = byNo ? guru.find(x => String(x.no) === nomor) : guru.find(x => x.nip === nomor);
  return g ? { tipe, data: g } : null;
}

export const guruAktifUntukScan = (guru) => pegawaiAktif(guru);
