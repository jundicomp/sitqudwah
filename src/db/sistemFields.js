// =====================================================================
// MODE PEMELIHARAAN (v1.58.0)
// Disimpan di Sheets Data Induk tab "Pengaturan Sistem" (Kunci = pemeliharaan) dan ikut
// terbaca tiap auto-refresh 30 detik, jadi semua user yg sedang login ikut berubah.
// =====================================================================
export const PEMELIHARAAN_BAWAAN = { aktif: false, pesan: '', perkiraanSelesai: '', jadwalMulai: '', jadwalSelesai: '', jadwalPesan: '', oleh: '', pada: '' };

export function pemeliharaanDariRows(rows) {
  const r = (rows || []).find(x => String(x['Kunci'] ?? '').trim() === 'pemeliharaan');
  if (!r) return { ...PEMELIHARAAN_BAWAAN };
  try { return { ...PEMELIHARAAN_BAWAAN, ...(JSON.parse(r['Nilai'] || '{}') || {}) }; } catch { return { ...PEMELIHARAAN_BAWAAN }; }
}

// Status saat ini: aktif manual, atau otomatis selama jendela jadwal berjalan.
export function statusPemeliharaan(p, now = new Date()) {
  const t = now.getTime();
  const mulai = p.jadwalMulai ? new Date(p.jadwalMulai).getTime() : null;
  const selesai = p.jadwalSelesai ? new Date(p.jadwalSelesai).getTime() : null;
  const dalamJadwal = mulai !== null && selesai !== null && t >= mulai && t < selesai;
  const akanDatang = mulai !== null && t < mulai && mulai - t < 7 * 24 * 3600e3;
  return {
    aktif: !!p.aktif || dalamJadwal,
    dariJadwal: !p.aktif && dalamJadwal,
    akanDatang,
    pesan: p.aktif ? p.pesan : (dalamJadwal ? (p.jadwalPesan || p.pesan) : ''),
    perkiraanSelesai: p.aktif ? p.perkiraanSelesai : (dalamJadwal ? p.jadwalSelesai : ''),
  };
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export function teksWaktu(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const jam = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  return `${HARI[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1} pukul ${jam}`;
}
export const teksJam = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };

// =====================================================================
// ATURAN JP (v1.59.0) -- disimpan di sheet yg sama (Kunci = jp), bisa diubah Admin/Kepsek
// dari Kepegawaian › Jadwal Mengajar › Beban Mengajar.
// =====================================================================
export const JP_BAWAAN = { menitPerJp: 35, targetJpMinggu: 24, maksJpMinggu: 0, oleh: '', pada: '' };
export function nilaiKunci(rows, kunci, bawaan) {
  const r = (rows || []).find(x => String(x['Kunci'] ?? '').trim() === kunci);
  if (!r) return { ...bawaan };
  try { return { ...bawaan, ...(JSON.parse(r['Nilai'] || '{}') || {}) }; } catch { return { ...bawaan }; }
}
export function aturanJpDariRows(rows) {
  const a = nilaiKunci(rows, 'jp', JP_BAWAAN);
  const m = Number(a.menitPerJp), t = Number(a.targetJpMinggu), x = Number(a.maksJpMinggu);
  return { ...a, menitPerJp: m > 0 ? m : 35, targetJpMinggu: t >= 0 ? t : 24, maksJpMinggu: x > 0 ? x : 0 };
}
// Gabungkan satu kunci ke baris lain yg sudah ada (sheet disimpan dgn replaceAll,
// jadi baris kunci lain WAJIB ikut terkirim agar tidak terhapus).
export function gabungKunciSistem(rows, kunci, nilai) {
  const lain = (rows || []).filter(r => String(r['Kunci'] ?? '').trim() && String(r['Kunci']).trim() !== kunci)
    .map(r => ({ Kunci: String(r['Kunci']).trim(), Nilai: r['Nilai'] ?? '' }));
  return [...lain, { Kunci: kunci, Nilai: JSON.stringify(nilai) }].map((r, i) => ({ No: i + 1, ...r }));
}

// =====================================================================
// JEDA SISTEM PEMBAYARAN SISWA (v1.63.0) -- Kunci = pembayaran.
// Tagihan (SPP + biaya lain) dgn tahun ajaran SEBELUM `mulaiTa` dibekukan: tidak
// dihitung, tidak tampil, & tidak bisa dibayar. Data di Sheets TIDAK dihapus.
// =====================================================================
export const PEMBAYARAN_BAWAAN = { jeda: false, mulaiTa: '', pesan: '', oleh: '', pada: '' };
export const pembayaranDariRows = (rows) => nilaiKunci(rows, 'pembayaran', PEMBAYARAN_BAWAAN);
// "2026/2027" < "2027/2028" -- label tahun ajaran bisa dibandingkan sebagai teks.
export const taBeku = (st, ta) => !!(st?.jeda && st.mulaiTa && String(ta || '').trim() && String(ta).trim() < st.mulaiTa);
export function taBerikut(label) {
  const m = String(label || '').match(/^(\d{4})\/(\d{4})$/);
  return m ? `${Number(m[1]) + 1}/${Number(m[2]) + 1}` : '';
}
