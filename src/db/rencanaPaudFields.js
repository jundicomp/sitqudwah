// =====================================================================
// RENCANA TEMA PAUD / RPPM (v1.57.0)
// Rencana pembelajaran mingguan KB/TK per tema-subtema: tujuan, elemen fokus,
// kegiatan harian (pembukaan · inti · penutup), alat & bahan, rencana asesmen.
// Kegiatan inti otomatis jadi pilihan "Kegiatan" di Penilaian PAUD.
// Alur persetujuan sama dgn modul ajar: Draft -> Diajukan -> Disetujui / Dikembalikan.
// =====================================================================
const s = (v) => String(v ?? '').trim();
export const HARI_PAUD = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const hariKosong = (hari) => ({ hari, pembukaan: '', inti: '', penutup: '', elemen: [] });
export function isiRencanaAwal() {
  return { tujuan: '', elemen: [], hari: HARI_PAUD.slice(0, 5).map(hariKosong), alat: '', teknik: [], asesmen: '', catatan: '' };
}
const parseJson = (v) => { try { const x = JSON.parse(v || 'null'); return x && typeof x === 'object' ? x : null; } catch { return null; } };
export function normalizeSheetRencanaPaud(r, i) {
  const isi = { ...isiRencanaAwal(), ...(parseJson(r['Isi']) || {}) };
  return {
    id: s(r['ID Rencana']) || 'RPX-' + (r['No'] ?? i), idRencana: s(r['ID Rencana']), no: r['No'],
    tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']) || 'Ganjil', tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), guru: s(r['Guru']),
    tema: s(r['Tema']), subtema: s(r['Subtema']), minggu: Number(r['Minggu Ke']) || '',
    mulai: s(r['Tanggal Mulai']).slice(0, 10), selesai: s(r['Tanggal Selesai']).slice(0, 10), isi,
    status: s(r['Status']) || 'Draft', catatan: s(r['Catatan Kepala Sekolah']), diubahOleh: s(r['Diubah Oleh']), diubahPada: s(r['Diubah Pada']),
    disetujuiOleh: s(r['Disetujui Oleh']), tanggalDisetujui: s(r['Tanggal Disetujui']).slice(0, 10), arsip: parseJson(r['Arsip']),
  };
}
const ACAK = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function buatIdRencana() { let x = 'RP-'; for (let i = 0; i < 6; i++) x += ACAK[Math.floor(Math.random() * ACAK.length)]; return x; }

export function barisSheetRencana(x) {
  return {
    'ID Rencana': x.idRencana, 'Tahun Ajaran': x.tahunAjaran, Semester: x.semester, Tingkat: x.tingkat, Rombel: x.rombel, Guru: x.guru,
    Tema: s(x.tema), Subtema: s(x.subtema), 'Minggu Ke': x.minggu || '', 'Tanggal Mulai': x.mulai || '', 'Tanggal Selesai': x.selesai || '',
    Isi: JSON.stringify(x.isi), Status: x.status || 'Draft', 'Catatan Kepala Sekolah': x.catatan || '', 'Diubah Oleh': x.diubahOleh || '',
    'Diubah Pada': x.diubahPada || new Date().toISOString(), 'Disetujui Oleh': x.disetujuiOleh || '', 'Tanggal Disetujui': x.tanggalDisetujui || '',
    Arsip: x.arsip ? JSON.stringify(x.arsip) : '',
  };
}
export function tambahHari(iso, n) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function cekKelengkapanRencana(r) {
  const k = [];
  if (!s(r.tema)) k.push('Tema');
  if (!s(r.isi.tujuan)) k.push('Tujuan pembelajaran');
  if (!r.isi.hari.some(h => s(h.inti))) k.push('Kegiatan inti');
  return k;
}
// Daftar kegiatan inti (1 baris = 1 kegiatan) -- dipakai sbg saran di Penilaian PAUD.
export function kegiatanDariRencana(r) {
  return r.isi.hari.flatMap(h => s(h.inti).split('\n').map(x => x.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean));
}
export function saranKegiatanPaud(rencanaList, { tingkat, rombel, tanggal }) {
  const milik = rencanaList.filter(r => r.tingkat === tingkat && (!r.rombel || r.rombel === rombel));
  const pas = milik.filter(r => r.mulai && r.selesai && tanggal >= r.mulai && tanggal <= r.selesai);
  const sumber = pas.length ? pas : milik.sort((a, b) => (b.mulai || '').localeCompare(a.mulai || '')).slice(0, 1);
  return [...new Set(sumber.flatMap(kegiatanDariRencana))];
}
export function susunDokumenRencana({ r, satuan, kepala, kepalaNiy, jabatanKepala, tempat, namaTingkat }) {
  return {
    jenis: 'RPPM', satuan, kepala, kepalaNiy, jabatanKepala, tempat, kelas: namaTingkat(r.tingkat), rombel: r.rombel, guru: r.guru,
    ta: r.tahunAjaran, semester: r.semester, minggu: r.minggu, tema: r.tema, subtema: r.subtema, mulai: r.mulai, selesai: r.selesai,
    isi: { ...r.isi, hari: r.isi.hari.filter(h => s(h.pembukaan) || s(h.inti) || s(h.penutup)) },
  };
}
