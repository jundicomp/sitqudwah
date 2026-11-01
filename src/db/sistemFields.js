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
