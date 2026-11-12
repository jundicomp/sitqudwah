// =====================================================================
// PENGATURAN HALAMAN CETAK (v1.69.0): ukuran kertas + margin, satuan cm / inch.
// Nilai disimpan dlm satuan yg dipilih; dikonversi ke mm saat mencetak.
// =====================================================================
export const KERTAS = [
  { value: 'A4', label: 'A4 (21 × 29,7 cm)', w: 210, h: 297 },
  { value: 'F4', label: 'F4 / Folio (21,5 × 33 cm)', w: 215, h: 330 },
  { value: 'Letter', label: 'Letter (21,59 × 27,94 cm)', w: 215.9, h: 279.4 },
  { value: 'Legal', label: 'Legal (21,59 × 35,56 cm)', w: 215.9, h: 355.6 },
];
export const SATUAN = [{ value: 'cm', label: 'cm' }, { value: 'in', label: 'inch' }];
const MM = { cm: 10, in: 25.4 };
export const SISI = [['atas', 'Atas'], ['bawah', 'Bawah'], ['kiri', 'Kiri'], ['kanan', 'Kanan']];

const bulat = (v, satuan) => Math.round(v * (satuan === 'in' ? 100 : 100)) / 100;
export const keMm = (v, satuan) => (Number(String(v).replace(',', '.')) || 0) * (MM[satuan] || 10);

export function lengkapiHalaman(h, bawaan) {
  const o = h && typeof h === 'object' ? h : {};
  const r = { ...bawaan, ...o };
  if (!KERTAS.some(k => k.value === r.kertas)) r.kertas = bawaan.kertas;
  if (!MM[r.satuan]) r.satuan = bawaan.satuan;
  SISI.forEach(([k]) => { const n = Number(String(r[k]).replace(',', '.')); r[k] = Number.isFinite(n) && n >= 0 ? n : bawaan[k]; });
  return r;
}

// Ganti satuan sambil mengonversi angkanya (1,75" -> 4,45 cm).
export function gantiSatuan(h, satuanBaru) {
  if (h.satuan === satuanBaru) return h;
  const r = { ...h, satuan: satuanBaru };
  SISI.forEach(([k]) => { r[k] = bulat(keMm(h[k], h.satuan) / MM[satuanBaru], satuanBaru); });
  return r;
}

// Angka mm siap pakai: ukuran kertas & margin.
export function ukuranHalaman(h) {
  const k = KERTAS.find(x => x.value === h.kertas) || KERTAS[0];
  const m = Object.fromEntries(SISI.map(([s]) => [s, keMm(h[s], h.satuan)]));
  return { w: k.w, h: k.h, ...m, tinggiIsi: Math.max(50, k.h - m.atas - m.bawah) };
}
export const cssPage = (h) => {
  const u = ukuranHalaman(h);
  return `@page { size: ${u.w}mm ${u.h}mm; margin: ${u.atas}mm ${u.kanan}mm ${u.bawah}mm ${u.kiri}mm; }`;
};
export function ringkasHalaman(h) {
  const t = (v) => String(v).replace('.', ',') + (h.satuan === 'in' ? '"' : ' cm');
  return `${h.kertas} · margin atas ${t(h.atas)}, bawah ${t(h.bawah)}, kiri ${t(h.kiri)}, kanan ${t(h.kanan)}`;
}

export const HALAMAN_KOP_BAWAAN = { kertas: 'A4', satuan: 'cm', atas: 1.4, bawah: 1.4, kiri: 1.2, kanan: 1.2 };
export const HALAMAN_STSB_BAWAAN = { kertas: 'A4', satuan: 'cm', atas: 2.2, bawah: 2, kiri: 2.6, kanan: 2.6 };
